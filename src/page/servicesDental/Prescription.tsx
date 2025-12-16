import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  TextareaAutosize,
  Avatar,
  CircularProgress,
  IconButton,

    Popover,
    List,
    ListItemButton,
    ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { AppointmentAPI, type AppointmentItem } from '../../services/appointments';
import { DrugAPI, type DrugItem } from '../../services/drugs';
import PrescriptionSampleAPI, { type PrescriptionSample } from '../../services/prescriptionSample';
import PrescriptionAPI, { type Prescription, type PrescriptionDrug } from '../../services/prescription';
import { toast, ToastContainer } from 'react-toastify';
// Use local html2pdf bundle (installed via package.json)
import html2pdf from 'html2pdf.js';
import DiscountsAPI, { type Discount } from '../../services/discounts';
import ListIcon from '@mui/icons-material/List';

export default function PrescriptionPage() {
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('sm'));

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [drugs, setDrugs] = useState<DrugItem[]>([]);

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | ''>(() => {
    try {
      const v = localStorage.getItem('prescriptionAppointmentId');
      return v ? Number(v) : '';
    } catch {
      return '';
    }
  });
  const [prescription, setPrescription] = useState<Partial<Prescription>>({
    id: 0,
    appointmentId: 0,
    patientId: 0,
    patientName: '',
    patientEmail: '',
    doctorId: 0,
    doctorUserId: 0,
    doctorName: '',
    doctorEmail: '',
    content: '',
    note: '',
    drugs: []
  });

  const printRef = useRef<HTMLDivElement | null>(null);
  const [addQty, setAddQty] = useState<number>(1);

  const [selectedDrugId, setSelectedDrugId] = useState<number | ''>('');
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [samples, setSamples] = useState<PrescriptionSample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<number | ''>('');
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);
  const [discountAnchorEl, setDiscountAnchorEl] = useState<HTMLElement | null>(null);

  // const selectedDrug = typeof selectedDrugId === 'number' ? drugs.find(d => d.id === selectedDrugId) : undefined;
  useEffect(() => {
    (async () => {
      const ap = await AppointmentAPI.getAll();
      if (ap && ap.success) setAppointments(ap.data || []);
      const drog = await DrugAPI.getDrugs();
      if (drog && drog.success) setDrugs(drog.data || []);
      // load prescription samples for optional apply
      try {
        const sres = await PrescriptionSampleAPI.getSamples();
        if (sres && sres.success) {
          // only keep ACTIVE samples for applying
          setSamples(((sres.data || []) as PrescriptionSample[]).filter((ss: PrescriptionSample) => String(ss.status || '').toUpperCase() === 'ACTIVE'));
        }
      } catch (err) {
        console.warn('Failed to load prescription samples', err);
      }
    })();
  }, []);

  // when drugs load, prefill prices map from drug catalog (if available)
  useEffect(() => {
    if (!drugs || drugs.length === 0) return;
    const map: Record<number, number> = {};
    drugs.forEach(d => {
      if (typeof d.price === 'number' && !Number.isNaN(d.price)) map[d.id] = d.price;
    });
    if (Object.keys(map).length > 0) setPrices(map);
  }, [drugs]);

  useEffect(() => {
    if (!selectedAppointmentId) return;
    const ap = appointments.find(a => a.id === selectedAppointmentId);
    if (ap) {
      setPrescription(p => ({ ...p, appointmentId: ap.id, patientId: ap.customerId || 0, patientName: ap.customerName || ap.customerUsername || '', patientEmail: ap.customerEmail || '', doctorId: ap.dentistId || 0, doctorName: ap.dentistName || '' }));
    }
  }, [selectedAppointmentId, appointments]);

  // Listen for in-app navigation so clicking "Điều trị" anywhere updates the selected appointment
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {};
        if (detail && detail.page === 'prescription') {
          const aid = detail.appointmentId;
          if (aid != null) {
            setSelectedAppointmentId(Number(aid));
          }
        }
      } catch (err) {
        console.warn('app:navigate handler error', err);
      }
    };
    window.addEventListener('app:navigate', handler as EventListener);
    return () => window.removeEventListener('app:navigate', handler as EventListener);
  }, []);

  // compute totals derived from current prescription
  // Ưu tiên lấy từ response (drugPrice, lineTotal), fallback sang prices map nếu đang tạo mới
  const computeTotals = () => {
    const list = (prescription.drugs || []) as PrescriptionDrug[];
    const total = list.reduce((s, it) => {
      // Ưu tiên lineTotal từ response, fallback sang drugPrice * quantity, cuối cùng là prices map
      if (it.lineTotal != null && it.lineTotal > 0) {
        return s + it.lineTotal;
      }
      const unitPrice = it.drugPrice ?? prices[it.drugId || 0] ?? 0;
      return s + (unitPrice * (it.quantity || 0));
    }, 0);
    const discountPercent = prescription.discountPercent ?? 0;
    // Prefer an explicit discountAmount (when present and >0). Otherwise compute from percent.
    const discountAmount = (prescription.discountAmount != null && prescription.discountAmount > 0)
      ? prescription.discountAmount
      : Math.round(total * (discountPercent / 100));
    const finalAmount = Math.max(0, total - (discountAmount || 0));
    return { total, discountAmount, discountPercent, finalAmount };
  };

  // simple mock discount lookup (replace with real API if available)
  // const mockDiscounts: Record<string, { id: number; percent?: number; amount?: number }> = {
  //   'GIAM10': { id: 1, percent: 10 },
  //   'GIAM20': { id: 2, percent: 20 },
  //   'OFF50K': { id: 3, amount: 50000 }
  // };

  // const applyDiscountCode = (code: string) => {
  //   if (!code) return;
  //   const key = code.trim().toUpperCase();
  //   const found = mockDiscounts[key];
  //   if (!found) {
  //     toast.error('Mã giảm giá không hợp lệ');
  //     setPrescription(p => ({ ...p, discountCode: key, discountPercent: undefined, discountAmount: undefined, discountId: 0 }));
  //     return;
  //   }
  //   setPrescription(p => ({ ...p, discountCode: key, discountPercent: found.percent ?? undefined, discountAmount: found.amount ?? undefined, discountId: found.id }));
  //   toast.success('Áp dụng mã giảm giá: ' + key);
  // };

  const addDrugToPrescription = (drugId: number, quantity = 1) => {
    const d = drugs.find(x => x.id === drugId);
    if (!d) return;
    // if drug has price and we haven't set it yet, prefill prices map
    if (typeof d.price === 'number' && (prices[drugId] == null || prices[drugId] === 0)) {
      setPrices(prev => ({ ...prev, [drugId]: d.price || 0 }));
    }
    setPrescription(p => {
      const list = (p.drugs || []) as PrescriptionDrug[];
      const exist = list.find(x => x.drugId === drugId);
      if (exist) {
        exist.quantity = (exist.quantity || 0) + quantity;
        return { ...p, drugs: [...list] };
      }
      const entry: PrescriptionDrug = { drugId, drugName: d.name, quantity, note: '' };
      return { ...p, drugs: [...list, entry] };
    });
  };

  const updateDrugEntry = (idx: number, patch: Partial<PrescriptionDrug>) => {
    setPrescription(p => {
      const list = (p.drugs || []) as PrescriptionDrug[];
      const copy = [...list];
      copy[idx] = { ...copy[idx], ...(patch as PrescriptionDrug) };
      return { ...p, drugs: copy };
    });
  };

  const removeDrug = (idx: number) => {
    setPrescription(p => {
      const list = (p.drugs || []) as PrescriptionDrug[];
      const copy = [...list];
      copy.splice(idx, 1);
      return { ...p, drugs: copy };
    });
    toast.success('Đã xóa thuốc');
  };

  // Build printable HTML body for a prescription
  const escapeHtml = (s: unknown) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const buildPrintBody = (pres: Partial<Prescription>) => {
    const ap = appointments.find(a => a.id === (pres.appointmentId ?? pres.appointment?.id));
    const _apMisc = (ap as unknown) as { customerPhone?: string; customerEmail?: string } | undefined;
    // Lấy thông tin patient từ nested object hoặc flat fields
    const patientName = pres.patient?.fullName || pres.patient?.username || pres.patientName || '';
    const patientContact = _apMisc?.customerPhone || pres.patient?.email || pres.patientEmail || _apMisc?.customerEmail || '';
    // Lấy thông tin doctor từ nested object hoặc flat fields
    const doctorName = pres.doctor?.name || pres.doctorName || '';
    
    const rowsHtml = (pres.drugs || []).map(pd => {
      const name = escapeHtml(pd.drugName || drugs.find(d => d.id === pd.drugId)?.name || pd.drugId || '');
      const qty = pd.quantity || 0;
      // Ưu tiên lấy drugPrice từ response, fallback sang prices map
      const unitPrice = pd.drugPrice ?? prices[pd.drugId || 0] ?? 0;
      // Ưu tiên lấy lineTotal từ response, fallback sang tính toán
      const lineTotal = pd.lineTotal ?? (unitPrice * qty);
      const unit = pd.priceUnit ? ` (${pd.priceUnit})` : '';
      return `
            <tr>
              <td style="padding:8px;border-bottom:1px solid #f0f0f0">${name}${unit}</td>
              <td style="text-align:center;padding:8px;border-bottom:1px solid #f0f0f0">${qty}</td>
              <td style="text-align:right;padding:8px;border-bottom:1px solid #f0f0f0">${new Intl.NumberFormat('vi-VN').format(unitPrice)} đ</td>
              <td style="text-align:right;padding:8px;border-bottom:1px solid #f0f0f0">${new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</td>
            </tr>`;
    }).join('\n');

    // Ưu tiên lấy totalAmount, finalAmount từ response nếu có
    const totals = computeTotals();
    const subtotal = pres.totalAmount ?? totals.total ?? 0;
    const total = pres.finalAmount ?? totals.finalAmount ?? 0;
    const discountAmount = pres.discountAmount ?? totals.discountAmount ?? 0;
    const discountPercent = pres.discountPercent ?? totals.discountPercent ?? 0;
    const discountLabel = (pres.discountAmount != null && pres.discountAmount > 0)
      ? `${Number(pres.discountAmount).toLocaleString('vi-VN')} đ`
      : `${discountPercent}% (${discountAmount.toLocaleString('vi-VN')} đ)`;

    const body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; max-width:800px; margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <div style="display:flex;align-items:center;">
             <img src="/tooth.png" style="width:30px; height:30px; margin-right:4px"/>
            <p style="font-weight:700;font-size:24px">Nha Khoa Hoàng Bình</p>
            </div>
            <div style="font-weight:700;font-size:18px;margin-top:4px">Phòng khám / Nhà thuốc</div>
            <div style="font-size:12px;color:#444">Địa chỉ: 123, Vạn Kiếp, Thành phố Hồ Chí Minh</div>
            <div style="font-size:12px;color:#444">SĐT: 0123456789</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">Hóa đơn: #${escapeHtml(pres.id)}</div>
            <div style="font-size:12px;color:#444">Ngày: ${pres.createdAt ? new Date(pres.createdAt).toLocaleString() : ''}</div>
          </div>
        </div>
        <hr style="border:none;border-bottom:1px solid #ddd;margin:8px 0"/>

        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-size:13px;font-weight:600">Bệnh nhân</div>
            <div style="font-size:13px">${escapeHtml(patientName)}</div>
            <div style="font-size:12px;color:#555">${escapeHtml(patientContact)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:600">Bác sĩ</div>
            <div style="font-size:13px">${escapeHtml(doctorName)}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:6px">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Sản phẩm</th>
              <th style="text-align:center;padding:8px;border-bottom:2px solid #ddd;width:64px">SL</th>
              <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd;width:120px">Đơn giá</th>
              <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd;width:140px">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display:flex;justify-content:flex-end;margin-top:12px">
          <div style="width:320px">
            <div style="display:flex;justify-content:space-between;padding:6px 0"><div>Tổng</div><div>${(subtotal).toLocaleString('vi-VN')} đ</div></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0"><div>Giảm</div><div>${discountLabel}</div></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;font-size:1.05em"><div>Thanh toán</div><div>${(total).toLocaleString('vi-VN')} đ</div></div>
          </div>
        </div>

        <div style="margin-top:12px"><strong>Ghi chú:</strong> ${escapeHtml(pres.note || '-')}</div>

        <div style="margin-top:28px; display:flex; justify-content:space-between; align-items:flex-end;">
          <div style="width:48%; text-align:left">
            <div style="font-size:13px;color:#444">Bệnh nhân:</div>
            <div style="font-style:italic;color:#666;margin-bottom:6px">(Chữ ký xác nhận)</div>
            <div style="height:60px"></div>
            <div style="border-top:1px solid #000; display:inline-block; padding-top:6px">${escapeHtml(patientName || '')}</div>
          </div>
          <div style="width:48%; text-align:right">
            <div style="font-size:13px;color:#444">Bác sĩ kê đơn / điều trị</div>
            <div style="font-style:italic;color:#666;margin-bottom:6px">(Chữ ký xác nhận)</div>
            <div style="height:60px"></div>
            <div style="border-top:1px solid #000; display:inline-block; padding-top:6px">${escapeHtml(doctorName || '')}</div>
          </div>
        </div>
      </div>`;

    return body;
  };

  const handleSave = async () => {
    // basic validation
    if (!selectedAppointmentId) {
      toast.error('Vui lòng chọn lịch hẹn trước khi lưu');
      return;
    }
    if (!prescription.drugs || (prescription.drugs || []).length === 0) {
      toast.error('Đơn thuốc phải có ít nhất 1 thuốc');
      return;
    }
    try {
      // compute totals and attach to payload
      const totals = computeTotals();

      // Build a minimal payload for creation: only include fields that were just added/required
      const createPayload: Partial<Prescription> = {
        appointmentId: Number(selectedAppointmentId),
        patientId: prescription.patientId || 0,
        patientName: prescription.patientName || '',
        doctorId: prescription.doctorId || 0,
        doctorName: prescription.doctorName || '',
        content: prescription.content || '',
        note: prescription.note || '',
        drugs: prescription.drugs || [],
        totalAmount: totals.total,
        discountAmount: totals.discountAmount,
        discountPercent: totals.discountPercent,
        // include selected discount identifiers so server records which discount was applied
        discountId: prescription.discountId ?? undefined,
        discountCode: prescription.discountCode ?? undefined,
        finalAmount: totals.finalAmount,
      };
      // Always create a new prescription when saving from this form.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await PrescriptionAPI.create(createPayload as any);
      if (res && res.success) {
        setPrescription(res.data || createPayload);
        toast.success('Tạo đơn thuốc thành công');
        setSelectedAppointmentId(res.data?.appointmentId || '');
        localStorage.removeItem('prescriptionAppointmentId');
      } else {
        toast.error(res?.message || 'Tạo thất bại');
      }
    } catch (e) {
      toast.error((e as Error).message || 'Lỗi mạng');
    }
  };

  // const handleDelete = async () => {
  //   if (!prescription || !prescription.id) return;
  //   try {
  //     const res = await PrescriptionAPI.delete(prescription.id);
  //     if (res && res.success) {
  //       toast.success('Xóa đơn thuốc thành công');
  //       setPrescription({ id: 0, appointmentId: 0, patientId: 0, patientName: '', doctorId: 0, doctorName: '', drugs: [] });
  //     } else {
  //       toast.error(res.message || 'Xóa thất bại');
  //     }
  //   } catch (e) {
  //     toast.error((e as Error).message || 'Lỗi mạng');
  //   }
  // };
  // Wrap printable content in a full HTML document (similar to PrescriptionList approach)
  const buildWrappedHtml = (content: string) => `<!doctype html><html><head><meta charset="utf-8"><title>Hóa đơn</title><base href="${window.location.origin}"><style>@page{size: A4; margin:12mm;} body{margin:0;padding:12px;background:#fff;color:#111;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;}</style></head><body>${content}</body></html>`;

  const buildWrappedInvoiceHtml = (pres: Partial<Prescription>) => buildWrappedHtml(buildPrintBody(pres));

  const printPrescription = () => {
    try {
      const html = buildWrappedInvoiceHtml(prescription);
      const w = window.open('', '_blank');
      if (!w) return; // popup blocked or failed
      // Use simple write/close/print flow that works well in most browsers (used in PrescriptionList)
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      // give browser a short moment to render, then call print
      setTimeout(() => { try { w.print(); } catch (e) { console.warn('print failed', e); } }, 500);
    } catch (err) {
      console.warn('printPrescription error', err);
    }
  };

  // Export the prescription area to PDF using html2pdf bundle (loads from CDN when needed)
  const [exportingPdf, setExportingPdf] = useState(false);
  async function exportPrescriptionPdf() {
    const el = printRef.current;
    if (!el) { toast.error('Không có nội dung để xuất'); return; }
    setExportingPdf(true);
    try {
      // Use local html2pdf import; set tighter margins and slightly larger scale
      const filename = `don-thuoc-${(new Date()).toISOString().slice(0,10)}.pdf`;
      // Build temporary container with printable body
      const body = buildPrintBody(prescription);
      const container = document.createElement('div');
      container.style.maxWidth = '800px';
      container.style.margin = '0 auto';
      container.innerHTML = body;
      document.body.appendChild(container);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdf as any)().set({
        margin: [6, 6, 6, 6],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2.2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(container).save();
      document.body.removeChild(container);

      toast.success('Đã xuất PDF');
    } catch (err) {
      console.error('exportPrescriptionPdf error', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Xuất PDF thất bại: ' + msg);
      // fallback: open print dialog so user can Save as PDF
      try {
        toast.info('Thử mở hộp thoại in làm phương án dự phòng');
        printPrescription();
      } catch (e) {
        console.error('Fallback print failed', e);
      }
    } finally {
      setExportingPdf(false);
    }
  }

  // Discounts popover: load available discounts and allow choosing one as a ticket
  const loadAvailableDiscounts = async () => {
    setDiscountsLoading(true);
    try {
      const res = await DiscountsAPI.getAll();
      if (res && res.success) setAvailableDiscounts(res.data || []);
      else setAvailableDiscounts([]);
    } catch (err) {
      console.warn('loadAvailableDiscounts error', err);
      setAvailableDiscounts([]);
    } finally {
      setDiscountsLoading(false);
    }
  };

  const openDiscountList = async (ev: React.MouseEvent<HTMLElement>) => {
    setDiscountAnchorEl(ev.currentTarget);
    // load once
    if (availableDiscounts.length === 0) await loadAvailableDiscounts();
  };

  const closeDiscountList = () => setDiscountAnchorEl(null);

  const selectDiscount = (d: Discount) => {
    // Set only the relevant discount field: percent OR amount. Leave the other undefined
    setPrescription(p => ({
      ...p,
      discountCode: d.code || d.name || '',
      discountPercent: d.percent ?? undefined,
      discountAmount: d.amount ?? undefined,
      discountId: d.id
    }));
    toast.success('Áp dụng mã: ' + (d.code || d.name || ''));
    closeDiscountList();
  };

  return (
    <div className="p-4 bg-white rounded-xl">
         {/* Header Section */}
        <div className="bg-gradient-to-r mb-5 from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="uppercase text-xs tracking-[0.2em] opacity-80">Khởi tạo</p>
              <Typography variant="h5" fontWeight="bold" className="text-white">Đơn thuốc</Typography>
            </div>
          </div>
        </div>
      <ToastContainer />
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="appt-select-label">Chọn lịch hẹn</InputLabel>
                <Select labelId="appt-select-label" value={selectedAppointmentId} label="Chọn lịch hẹn" onChange={(e) => setSelectedAppointmentId(Number(e.target.value))}>
                  <MenuItem value="">-- Chọn --</MenuItem>
                  {appointments.map(a => (
                    a.status === 'COMPLETED' || a.status === 'CANCELLED' ? null :
                      <MenuItem key={a.id} value={a.id}
                        sx={{
                          color: a.status === 'COMPLETED' ? 'green' : a.status === 'CANCELLED' ? 'red' : 'inherit',
                          flexDirection: 'row ', alignItems: 'center', gap: 1
                        }}
                      >
                        {/* {`${a.id} - ${a.customerName || a.customerUsername || a.customerEmail || 'Khách'} | ${a.serviceName || ''} | ${new Date(a.scheduledTime || 0).toLocaleString()}`}  */}
                        <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}>{(a.customerName || a.customerUsername || 'K').charAt(0).toUpperCase()}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{a.customerName || a.customerUsername || a.customerEmail || 'Khách'}</Typography>
                          <Typography variant="caption" color="textSecondary">{a.serviceName || ''} | {new Date(a.scheduledTime || 0).toLocaleString()}</Typography>
                        </Box>
                      </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Appointment preview */}
              {selectedAppointmentId ? (
                <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#fafafa' }}>
                  {(() => {
                    const ap = appointments.find(x => x.id === selectedAppointmentId);
                    if (!ap) return null;
                    return (
                      <div>
                        <Typography variant="subtitle2">Thông tin khách</Typography>
                        <Typography variant="body2">{ap.customerName}</Typography>
                        <Typography variant="body2" color="textSecondary">{ap.customerEmail || ''}{ap.branchName ? ` • ${ap.branchName}` : ''}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2">Thông tin lịch</Typography>
                        <Typography variant="body2">{ap.serviceName || ''}</Typography>
                        <Typography variant="body2" color="textSecondary">{new Date(ap.scheduledTime || 0).toLocaleString()}</Typography>
                      </div>
                    );
                  })()}
                </Paper>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Chưa chọn lịch hẹn</Typography>
              )}

              <Divider />

              <Typography variant="subtitle2">Tình trạng chuẩn đoán:</Typography>
              <TextareaAutosize
                minRows={4}
                placeholder="Nhập tình trạng chuẩn đoán..."
                value={prescription.content || ''}
                onChange={(e) => setPrescription({ ...prescription, content: e.target.value })}
                style={{
                  width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, resize: 'vertical'

                }}
              />

              <Divider />


              <Typography variant="subtitle2">Thêm thuốc</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel id="drug-select-label">Chọn thuốc</InputLabel>
                  <Select labelId="drug-select-label" label="Chọn thuốc" value={selectedDrugId} onChange={(e) => setSelectedDrugId(Number(e.target.value) || '')}>
                    <MenuItem value="">-- Chọn --</MenuItem>
                    {drugs.map(d => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}{typeof d.price === 'number' ? ` — ${new Intl.NumberFormat('vi-VN').format(d.price)} ${d.priceUnit || 'đ'}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField size="small" type="number" inputProps={{ min: 1 }} sx={{ width: 96 }} value={addQty} onChange={(e) => setAddQty(Math.max(1, Number(e.target.value || 1)))} />
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => {
                  if (!selectedDrugId) {
                    toast.error('Vui lòng chọn thuốc để thêm');
                    return;
                  }
                  addDrugToPrescription(Number(selectedDrugId), addQty);
                  setSelectedDrugId('');
                }}>Thêm</Button>
              </Stack>

              {/* Optional: apply a saved prescription sample into this prescription */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel id="sample-select-label">Áp dụng mẫu (tuỳ chọn)</InputLabel>
                  <Select labelId="sample-select-label" label="Áp dụng mẫu (tuỳ chọn)" value={selectedSampleId} onChange={(e) => setSelectedSampleId(Number(e.target.value) || '')}>
                    <MenuItem value="">-- Không áp dụng --</MenuItem>
                    {samples.map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button size="small" variant="outlined" onClick={async () => {
                  if (!selectedSampleId) { toast.info('Chọn mẫu để áp dụng'); return; }
                  try {
                    const res = await PrescriptionSampleAPI.getSample(Number(selectedSampleId));
                    if (!res || !res.success || !res.data) { toast.error('Không thể tải mẫu'); return; }
                    const s = res.data as PrescriptionSample & { lines?: Array<{ drugId?: number; quantity?: number }> };
                    const lines = (s.lines && s.lines.length > 0) ? s.lines : (s.drugIds || []).map((id: number) => ({ drugId: id, quantity: 1 }));
                    let added = 0;
                    for (const ln of lines) {
                      const id = ln.drugId as number;
                      const qty = ln.quantity ?? 1;
                      if (!id) continue;
                      addDrugToPrescription(id, qty);
                      added += 1;
                    }
                    if (added > 0) toast.success(`Đã áp dụng mẫu (${added} thuốc)`);
                    else toast.info('Mẫu không có thuốc để áp dụng');
                  } catch (err) {
                    console.error('apply sample failed', err);
                    toast.error('Áp dụng mẫu thất bại');
                  }
                }}>Áp dụng mẫu</Button>
              </Stack>

              <Divider />

              <Typography variant="subtitle2">Thuốc trong đơn</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Thuốc</TableCell>
                      <TableCell sx={{ width: 100 }}>Số lượng</TableCell>
                      <TableCell sx={{ width: 140 }}>Đơn giá</TableCell>
                      <TableCell sx={{ width: 130 }}>Thành tiền</TableCell>
                      <TableCell>Ghi chú</TableCell>
                      <TableCell sx={{ width: 64 }} align="center">&nbsp;</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(prescription.drugs || []).map((pd, idx) => {
                      // Ưu tiên lấy drugPrice từ response, fallback sang prices map
                      const unitPrice = pd.drugPrice ?? prices[pd.drugId || 0] ?? 0;
                      // Ưu tiên lấy priceUnit từ response, fallback sang drugs catalog
                      const unit = pd.priceUnit || drugs.find(d => d.id === pd.drugId)?.priceUnit || 'đ';
                      // Ưu tiên lấy lineTotal từ response, fallback sang tính toán
                      const lineTotal = pd.lineTotal ?? (unitPrice * (pd.quantity || 0));
                      return (
                        <TableRow key={idx}>
                          <TableCell>{(pd.drugName || drugs.find(d => d.id === pd.drugId)?.name || pd.drugId)}</TableCell>
                          <TableCell>
                            <TextField size="small" type="number" inputProps={{ min: 1 }} value={pd.quantity ?? 1} onChange={(e) => updateDrugEntry(idx, { quantity: Math.max(1, Number(e.target.value || 1)) })} sx={{ width: 96 }} />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">{new Intl.NumberFormat('vi-VN').format(unitPrice)}</Typography>
                              <Typography variant="body2">/{unit}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {new Intl.NumberFormat('vi-VN').format(lineTotal)} đ
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField size="small" value={pd.note || ''} onChange={(e) => updateDrugEntry(idx, { note: e.target.value })} fullWidth />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => removeDrug(idx)} title="Xóa thuốc">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals & discounts */}
              {(() => {
                const totals = computeTotals();
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField size="small" label="Mã giảm giá" value={prescription.discountCode ?? ''} onChange={(e) => setPrescription({ ...prescription, discountCode: e.target.value })} sx={{ width: 200 }} />
                      {/* <Button size="small" variant="outlined" onClick={() => applyDiscountCode(prescription.discountCode || '')}>Áp dụng</Button> */}
                      <IconButton size="small" onClick={openDiscountList} title="Chọn mã giảm giá">
                        <ListIcon />
                      </IconButton>
                      <Popover open={Boolean(discountAnchorEl)} anchorEl={discountAnchorEl} onClose={closeDiscountList} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
                        <Box sx={{ width: 320, maxHeight: 320, overflow: 'auto' }}>
                          {discountsLoading ? (
                            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} /></Box>
                          ) : (
                            <List>
                              {(availableDiscounts && availableDiscounts.length > 0) ? availableDiscounts.map(d => (
                                <ListItemButton key={d.id} onClick={() => selectDiscount(d)}>
                                  <ListItemText primary={`${d.code || d.name} ${d.percent ? `- ${d.percent}%` : d.amount ? `- ${new Intl.NumberFormat('vi-VN').format(d.amount)} đ` : ''}`} secondary={d.expiresAt ? `HSD: ${new Date(d.expiresAt).toLocaleDateString()}` : ''} />
                                </ListItemButton>
                              )) : (
                                <ListItemButton disabled>
                                  <ListItemText primary="Không có mã giảm giá" />
                                </ListItemButton>
                              )}
                            </List>
                          )}
                        </Box>
                      </Popover>

                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="body2">Tổng tiền: <strong>{totals.total.toLocaleString('vi-VN')} đ</strong></Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="body2">Tổng sau giảm: <strong>{totals.finalAmount.toLocaleString('vi-VN')} đ</strong></Typography>
                    </Box>

                  </Box>
                );
              })()}

              <TextareaAutosize
                minRows={4}
                placeholder="Ghi chú"
                value={prescription.note || ''}
                onChange={(e) => setPrescription({ ...prescription, note: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, resize: 'vertical', marginTop: 8 }}

              />

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="contained" onClick={handleSave}>Lưu</Button>
                {/* <Button color="error" variant="outlined" onClick={handleDelete}>Xóa</Button> */}
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Box ref={printRef}>
              <div className="flex items-center mt-3 mb-4">
                <img src='/tooth.png' alt="logo" className="w-10 h-10 mr-2" />
                <p className='text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-500'>Nha Khoa Hoàng Bình</p>
              </div>

              <div className="flex justify-between mb-2 mt-10">
                <div className="w-1/2">
                  <Typography variant="body2" sx={{ fontSize: 16 }}><strong>Bệnh nhân: </strong>{prescription.patient?.fullName || prescription.patient?.username || prescription.patientName || '-'}</Typography>
                  <Typography variant="body2" sx={{ fontSize: 16, marginTop: 1, marginBottom: 1 }}><strong>Email: </strong>{prescription.patient?.email || prescription.patientEmail || '-'}</Typography>
                  
                  <div className='w-full'>
                    <strong>Tình trạng chuẩn đoán: </strong>
                    <Typography component="div" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '100%', marginTop: 0, textAlign: 'justify' }}>{prescription.content || ''}</Typography>
                  </div>
                </div>

                <div className="">
                  <Typography variant="body2" sx={{ fontSize: 16, marginTop: 1 }}><strong>Bác sĩ: </strong>{prescription.doctor?.name || prescription.doctorName || '-'}</Typography>
                  <Typography variant="body2" sx={{ fontSize: 16, marginTop: 1, marginBottom: 2 }}>
                    <strong>Lịch hẹn ngày </strong>
                    {prescription.appointment?.scheduledTime 
                      ? new Date(prescription.appointment.scheduledTime).toLocaleString() 
                      : appointments.find(a => a.id === prescription.appointmentId)?.scheduledTime 
                        ? new Date(appointments.find(a => a.id === prescription.appointmentId)?.scheduledTime || 0).toLocaleString() 
                        : new Date().toLocaleString()}
                  </Typography>
                </div>


              </div>

              <hr />

              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>ĐƠN THUỐC</Typography>

              <Typography variant="body2">Ngày kê đơn: {prescription.createdAt ? new Date(prescription.createdAt).toLocaleString() : new Date().toLocaleString()}</Typography>

              <Divider sx={{ my: 1 }} />

              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell>Thuốc</TableCell>
                      <TableCell>Đơn giá</TableCell>
                      <TableCell>Số lượng</TableCell>
                      <TableCell>Thành tiền</TableCell>
                      <TableCell>Ghi chú</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(prescription.drugs || []).map((pd, idx) => {
                      const unit = drugs.find(d => d.id === pd.drugId)?.priceUnit || 'đ';
                      const unitPrice = prices[pd.drugId || 0] || 0;
                      const lineTotal = unitPrice * (pd.quantity || 0);
                      return (
                        <TableRow key={idx} >
                          <TableCell sx={{ height: 10 }}>{pd.drugName || drugs.find(d => d.id === pd.drugId)?.name || pd.drugId}</TableCell>
                          <TableCell>{new Intl.NumberFormat('vi-VN').format(unitPrice)} {unit}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{pd.quantity}</TableCell>
                          <TableCell>{lineTotal.toLocaleString('vi-VN')} {unit}</TableCell>
                          <TableCell>{pd.note}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mt: 3 }}>Ghi chú: {prescription.note}</Typography>
              {(() => {
                const totals = computeTotals();
                return (
                  <div className='flex flex-col mt-5 w-full items-end gap-3'>
                    <Typography variant="body2">Tổng: {totals.total.toLocaleString('vi-VN')} đ</Typography>
                    <Typography variant="body2">Giảm: {totals.discountAmount?.toLocaleString('vi-VN') || 0} đ ({totals.discountPercent}%)</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Thanh toán: {totals.finalAmount.toLocaleString('vi-VN')} đ</Typography>
                    <Divider sx={{ my: 1 }} />

                  </div>
                );
              })()}
            </Box>

            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center gap-2">
                <p>Bệnh nhân:</p>
                <i>(Chữ ký xác nhận)</i>
                <p className='font-bold mt-20'>{prescription.patient?.fullName || prescription.patient?.username || prescription.patientName || ''}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p>Bác sĩ kê đơn / điều trị:</p>
                <i>(Chữ ký xác nhận)</i>
                <p className='font-bold mt-20'>{prescription.doctor?.name || prescription.doctorName || ''}</p>
              </div>
            </div>

            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={printPrescription}>In</Button>
              <Button variant="contained" onClick={exportPrescriptionPdf} disabled={exportingPdf}>
                {exportingPdf ? (
                  <>
                    <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                    Đang xuất...
                  </>
                ) : 'Xuất PDF'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
}
