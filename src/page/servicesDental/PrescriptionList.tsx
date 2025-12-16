import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,

  useTheme,
  useMediaQuery,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrescriptionAPI, { type Prescription } from '../../services/prescription';
import DrugAPI, { type DrugItem } from '../../services/drugs';
import ExcelJS from 'exceljs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast, ToastContainer } from 'react-toastify';

export default function PrescriptionListPage() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [loadingDrugs, setLoadingDrugs] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [drugsList, setDrugsList] = useState<DrugItem[]>([]);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
  const [searchText, setSearchText] = useState('');

  // shared loader used across actions
  const loadData = async () => {
    setLoading(true);
    try {
      const pRes = await PrescriptionAPI.getAll();
      if (pRes && pRes.success) setPrescriptions(pRes.data || []);
      else {
        setPrescriptions([]);
        toast.error(pRes?.message || 'Không tải được danh sách đơn');
      }
    } catch {
      toast.error('Lỗi khi tải dữ liệu');
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDrugs = async () => {
    setLoadingDrugs(true);
    try {
      const dRes = await DrugAPI.getDrugs();
      if (dRes && dRes.success) setDrugsList(dRes.data || []);
      else setDrugsList([]);
    } catch {
      setDrugsList([]);
    } finally {
      setLoadingDrugs(false);
    }
  };

  useEffect(() => { void loadData(); void loadDrugs(); }, []);

  // watch container size changes (e.g. sidebar collapse/expand) and trigger a window
  // resize event so DataGrid can recompute column widths. Debounced to avoid churn.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (typeof ResizeObserver === 'undefined') return undefined;
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 120);
    });
    ro.observe(el);
    return () => { ro.disconnect(); if (t) clearTimeout(t); };
    // intentionally run once on mount; containerRef is mutable and not a valid dep
  }, []);

  const filtered = prescriptions.filter(p => {
    if (!searchText) return true;
    const q = searchText.trim().toLowerCase();
    // Hỗ trợ cả nested patient/doctor objects và flat fields
    const patientName = p.patient?.fullName || p.patient?.username || p.patientName || '';
    const doctorName = p.doctor?.name || p.doctorName || '';
    return (
      String(p.id).includes(q) ||
      patientName.toLowerCase().includes(q) ||
      doctorName.toLowerCase().includes(q) ||
      (p.discountCode || '').toLowerCase().includes(q)
    );
  });

  // apply date filter (by createdAt date) if set, then sort newest first
  const filteredWithDate = filtered
    .filter(p => {
      if (!filterDate) return true;
      if (!p.createdAt) return false;
      const d = new Date(p.createdAt);
      return (
        d.getFullYear() === filterDate.getFullYear() &&
        d.getMonth() === filterDate.getMonth() &&
        d.getDate() === filterDate.getDate()
      );
    })
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (tb !== ta) return tb - ta; // newest first
      // tie-breaker by id desc if dates are equal or missing
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });

  // appointment filter removed — using date picker instead

  type GridRow = {
    id: number;
    patient: string;
    doctorName: string;
    totalFormatted: string;
    discountLabel: string;
    finalAmountFormatted: string;
    createdAtStr: string;
  };

  const rows: GridRow[] = filteredWithDate.map(p => ({
    id: p.id,
    // Lấy từ nested patient/doctor objects, fallback sang flat fields
    patient: p.patient?.fullName || p.patient?.username || p.patientName || '',
    doctorName: p.doctor?.name || p.doctorName || '',
    totalFormatted: `${(p.totalAmount ?? 0).toLocaleString('vi-VN')} đ`,
    discountLabel: p.discountPercent != null ? `${p.discountPercent}%` : (p.discountAmount && p.discountAmount > 0 ? `${p.discountAmount.toLocaleString('vi-VN')} đ` : '-'),
    finalAmountFormatted: `${(p.finalAmount ?? 0).toLocaleString('vi-VN')} đ`,
    createdAtStr: p.createdAt ? new Date(p.createdAt).toLocaleString() : ''
  }));

  // UI state for dialogs/actions
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [originalSelected, setOriginalSelected] = useState<Prescription | null>(null);
  const [drugToAdd, setDrugToAdd] = useState<DrugItem | null>(null);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detect if prescription has changes
  const hasChanges = selected && originalSelected ? 
    JSON.stringify(selected) !== JSON.stringify(originalSelected) 
    : false;

  const printInvoice = (pres: Prescription) => {
    const html = buildWrappedInvoiceHtml(pres);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };



  const exportInvoicePdf = async (pres: Prescription) => {
    setExportingPdf(true);
    let container: HTMLDivElement | null = null;
    try {
      container = document.createElement('div');
      container.style.padding = '12px';
      // use the content-only HTML for the container (html2pdf will render the node)
      container.innerHTML = buildInvoiceContentHtml(pres);
      document.body.appendChild(container);

      // dynamic import html2pdf
      const html2pdfModule = (await import('html2pdf.js')).default ?? (await import('html2pdf.js'));
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `invoice_${pres.id || 'unknown'}.pdf`,
        html2canvas: { scale: 2.2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      // call html2pdf
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdfModule() as any).set(opt).from(container).save();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xuất PDF');
    } finally {
      setExportingPdf(false);
      if (container && container.parentNode) container.parentNode.removeChild(container);
    }
  };



  // Actions


  const handleExportXlsx = async () => {
    try {
      const selectedIds = selectionModel && selectionModel.length ? selectionModel.map(Number) : [];
      const selectedRows = selectedIds.length ? rows.filter(r => selectedIds.includes(r.id)) : rows;
      if (!selectedRows.length) { toast.info('Không có dữ liệu để xuất'); return; }

      setExportingXlsx(true);

      const headerCols = [
        { key: 'id', label: 'ID' },
        { key: 'patient', label: 'Bệnh nhân' },
        { key: 'doctorName', label: 'Bác sĩ' },
        { key: 'totalFormatted', label: 'Tổng' },
        { key: 'discountLabel', label: 'Giảm' },
        { key: 'finalAmountFormatted', label: 'Thanh toán' },
        { key: 'createdAtStr', label: 'Ngày' }
      ];

      const now = new Date();
      const exportedAt = now.toISOString().replace('T', ' ').slice(0, 19);
      const reportTitle = 'BÁO CÁO: DANH SÁCH ĐƠN THUỐC';

      const selectedPrescriptions = selectedIds.length ? selectedIds.map(id => prescriptions.find(p => p.id === Number(id))).filter(Boolean) as Prescription[] : filteredWithDate;
      const totalCount = selectedPrescriptions.length;
      const totalFinalAmount = selectedPrescriptions.reduce((s, p) => s + (p.finalAmount ?? 0), 0);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Prescriptions');

      sheet.columns = headerCols.map(h => ({ header: h.label, key: h.key, width: 24 }));

      const lastCol = headerCols.length;
      sheet.mergeCells(1, 1, 1, lastCol);
      const titleCell = sheet.getCell('A1');
      titleCell.value = reportTitle;
      titleCell.font = { name: 'Arial', size: 14, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>;

      const companyName = 'NHAKHOA CRM';
      sheet.getCell('A2').value = 'Đơn vị';
      sheet.getCell('B2').value = companyName;
      sheet.getCell('A3').value = 'Thời gian xuất';
      sheet.getCell('B3').value = exportedAt;
      sheet.getCell('A4').value = 'Bộ lọc';
      sheet.getCell('B4').value = searchText || (filterDate ? new Date(filterDate).toLocaleDateString() : 'Tất cả');
      sheet.getCell('A5').value = 'Số lượng bản ghi';
      sheet.getCell('B5').value = totalCount;
      sheet.getCell('A6').value = 'Tổng thanh toán (đ)';
      sheet.getCell('B6').value = totalFinalAmount;

      const headerRowNumber = 8;
      const headerRow = sheet.getRow(headerRowNumber);
      headerCols.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h.label;
        cell.font = { bold: true, name: 'Arial', size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as ExcelJS.Fill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>;
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        } as Partial<ExcelJS.Borders>;
      });
      headerRow.height = 20;

      sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

      let rowIndex = headerRowNumber + 1;
      selectedRows.forEach((r, idx) => {
        const rec = r as Record<string, unknown>;
        const row = sheet.getRow(rowIndex);
        headerCols.forEach((h, ci) => {
          const val = rec[h.key] as string | number | null | undefined;
          const cell = row.getCell(ci + 1);
          cell.value = (val ?? '') as string | number;
          if (h.key === 'patient' || h.key === 'doctorName') cell.alignment = { wrapText: true, vertical: 'top' } as Partial<ExcelJS.Alignment>;
        });
        const isAlt = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
          if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } } as ExcelJS.Fill;
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as Partial<ExcelJS.Borders>;
        });
        row.commit();
        rowIndex++;
      });

      sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber, column: lastCol }
      };

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescriptions-${(new Date()).toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('Đã xuất file Excel');
    } catch (err) {
      console.error('exportXlsx error', err);
      toast.error('Lỗi khi xuất Excel. Vui lòng cài `exceljs` và thử lại.');
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectionModel || selectionModel.length === 0) {
      toast.info('Chọn ít nhất một đơn để xóa');
      return;
    }
    // confirm
    if (!window.confirm(`Xóa ${selectionModel.length} đơn? Hành động này không thể hoàn tác.`)) return;
    try {
      setLoading(true);
      await Promise.all(selectionModel.map(id => PrescriptionAPI.delete(Number(id))));
      toast.success('Đã xóa');
      setSelectionModel([]);
      void loadData();
    } catch {
      toast.error('Lỗi khi xóa');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSelected = () => {
    const selectedIds = selectionModel && selectionModel.length ? selectionModel.map(Number) : [];
    const selectedPres = selectedIds.length ? selectedIds.map(id => prescriptions.find(p => p.id === Number(id))).filter(Boolean) as Prescription[] : (prescriptions.length ? [prescriptions[0]] : []);
    if (!selectedPres.length) {
      toast.info('Không có đơn để in');
      return;
    }
    const combined = selectedPres.map(p => buildInvoiceContentHtml(p)).join('<div style="page-break-after: always;"></div>');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildWrappedHtml(combined));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  // Helper to build invoice inner content (used for printing, PDF export)
  const buildInvoiceContentHtml = (pres: Prescription) => {
    const rowsHtml = (pres.drugs || []).map(d => {
      // Dùng drugPrice từ response API (snapshot giá)
      const unit = Number(d.drugPrice ?? 0);
      const qty = d.quantity ?? 1;
      const line = Number(d.lineTotal ?? unit * qty);
      return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${d.drugName}${d.note ? ` — ${d.note}` : ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${unit.toLocaleString('vi-VN')} đ</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${line.toLocaleString('vi-VN')} đ</td></tr>`;
    }).join('');

    const subtotal = pres.totalAmount ?? 0;
    const discountLabel = pres.discountPercent != null ? `${pres.discountPercent}%` : (pres.discountAmount && pres.discountAmount > 0 ? `${pres.discountAmount.toLocaleString('vi-VN')} đ` : '0');
    const total = pres.finalAmount ?? subtotal - (pres.discountAmount ?? 0);
    const patientContact = (pres as unknown as { patientPhone?: string }).patientPhone || pres.patientEmail || '';

    return `
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
            <div style="font-weight:700">Hóa đơn: #${pres.id}</div>
            <div style="font-size:12px;color:#444">Ngày: ${pres.createdAt ? new Date(pres.createdAt).toLocaleString() : ''}</div>
          </div>
        </div>
        <hr style="border:none;border-bottom:1px solid #ddd;margin:8px 0"/>

        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-size:13px;font-weight:600">Bệnh nhân</div>
            <div style="font-size:13px">${pres.patient?.fullName || pres.patient?.username || pres.patientName || ''}</div>
            <div style="font-size:12px;color:#555">${patientContact}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:600">Bác sĩ</div>
            <div style="font-size:13px">${pres.doctor?.name || pres.doctorName || ''}</div>
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

        <div style="margin-top:12px"><strong>Ghi chú:</strong> ${pres.note || '-'}</div>

        <div style="margin-top:28px; display:flex; justify-content:space-between; align-items:flex-end;">
          <div style="width:48%; text-align:left">
            <div style="font-size:13px;color:#444">Bệnh nhân:</div>
            <div style="font-style:italic;color:#666;margin-bottom:6px">(Chữ ký xác nhận)</div>
            <div style="height:60px"></div>
            <div style="border-top:1px solid #000; display:inline-block; padding-top:6px">${pres.patient?.fullName || pres.patient?.username || pres.patientName || ''}</div>
          </div>
          <div style="width:48%; text-align:right">
            <div style="font-size:13px;color:#444">Bác sĩ kê đơn / điều trị</div>
            <div style="font-style:italic;color:#666;margin-bottom:6px">(Chữ ký xác nhận)</div>
            <div style="height:60px"></div>
            <div style="border-top:1px solid #000; display:inline-block; padding-top:6px">${pres.doctor?.name || pres.doctorName || ''}</div>
          </div>
        </div>
      </div>
    `;
  };

  const buildWrappedHtml = (content: string) => `<!doctype html><html><head><meta charset="utf-8"><title>Hóa đơn</title><style>@page{size: A4; margin:12mm;} body{margin:0;padding:12px;background:#fff;color:#111}</style></head><body>${content}</body></html>`;

  const buildWrappedInvoiceHtml = (pres: Prescription) => buildWrappedHtml(buildInvoiceContentHtml(pres));

  return (
    <div className="p-4 bg-white rounded-xl">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản lý</p>
            <Typography variant="h5" fontWeight="bold" className="text-white">Danh sách đơn thuốc</Typography>

          </div>

        </div>
      </div>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'white', borderRadius: 1, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField size="small" placeholder="Tìm theo bệnh nhân, bác sĩ, mã..." value={searchText} onChange={(e) => setSearchText(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 240 } }} />

          <Box sx={{ width: { xs: '100%', sm: 320 } }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={filterDate}
                onChange={(newValue) => setFilterDate(newValue ? new Date(newValue.valueOf()) : null)}
                slotProps={{ textField: { size: 'small' } }}
              />
            </LocalizationProvider>
          </Box>

          <Box />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={() => { setFilterDate(null); setSearchText(''); }}>Reset</Button>
            <IconButton title="Xuất Excel" onClick={handleExportXlsx}>
              {exportingXlsx ? <CircularProgress size={18} /> : <FileDownloadIcon />}
            </IconButton>
            <IconButton title="In" onClick={handlePrintSelected}><PrintIcon /></IconButton>
            <IconButton title="Xóa chọn" onClick={handleBulkDelete} color="error"><DeleteSweepIcon /></IconButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 1 }}>
        <ToastContainer position="top-right" limit={3} />
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ minHeight: 0, maxWidth: '100%' }} ref={containerRef}>
            {/* Choose columns based on breakpoint to improve mobile UX */}
            {(() => {
              const commonCols: GridColDef[] = [
                { field: 'id', headerName: 'ID', width: 90 },
                { field: 'patient', headerName: 'Bệnh nhân', flex: 1, minWidth: 160 },
              ];

              const tabletCols: GridColDef[] = [
                { field: 'doctorName', headerName: 'Bác sĩ', width: 180 },
                { field: 'finalAmountFormatted', headerName: 'Thanh toán', width: 140 },
              ];

              const desktopCols: GridColDef[] = [
                { field: 'doctorName', headerName: 'Bác sĩ', width: 200 },
                { field: 'totalFormatted', headerName: 'Tổng', width: 130 },
                { field: 'discountLabel', headerName: 'Giảm', width: 140 },
                { field: 'finalAmountFormatted', headerName: 'Thanh toán', width: 150 },
                { field: 'createdAtStr', headerName: 'Ngày', width: 180 },
              ];

              const actionCol: GridColDef = {
                field: 'actions', headerName: 'Thao tác', width: 140, sortable: false, filterable: false,
                renderCell: (params) => {
                  const id = params.row.id as number;
                  const pres = prescriptions.find(p => p.id === id) || null;
                  return (
                    <>
                      <IconButton size="small" onClick={() => { 
                        const copy = pres ? JSON.parse(JSON.stringify(pres)) : null;
                        setSelected(copy); 
                        setViewOpen(true); 
                      }} title="Xem">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => { 
                        const copy = pres ? JSON.parse(JSON.stringify(pres)) : null;
                        setSelected(copy);
                        setOriginalSelected(copy);
                        setEditOpen(true); 
                      }} title="Sửa">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => { 
                        const copy = pres ? JSON.parse(JSON.stringify(pres)) : null;
                        setSelected(copy); 
                        setDeleteConfirmOpen(true); 
                      }} title="Xóa">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  );
                }
              };

              // choose columns based on breakpoint: mobile (xs) minimal, tablet (sm) medium, desktop full
              let cols: GridColDef[] = [];
              if (isXs) cols = [...commonCols, { field: 'finalAmountFormatted', headerName: 'Thanh toán', width: 140 }, actionCol];
              else if (isSm) cols = [...commonCols, ...tabletCols, actionCol];
              else cols = [...commonCols, ...desktopCols, actionCol];

              return (
                <DataGrid<GridRow>
                  rows={rows}
                  getRowId={(r: GridRow) => r.id}
                  columns={cols}
                  initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                  pageSizeOptions={[10, 25, 50]}
                  checkboxSelection
                  rowSelectionModel={selectionModel}
                  onRowSelectionModelChange={(newModel: GridRowSelectionModel) => setSelectionModel(newModel)}
                  disableRowSelectionOnClick
                  rowHeight={isXs ? 52 : 60}
                  loading={loading}
                  autoHeight={isXs}
                  sx={{ width: '100%' }}
                />
              );
            })()}
          </Box>
        )}
      </Box>

      {/* View dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Chi tiết đơn thuốc</DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6">Phòng khám / Nhà thuốc</Typography>
                  <Typography variant="body2">Địa chỉ: 123, Vạn Kiếp, Thành phố Hồ Chí Minh</Typography>
                  <Typography variant="body2">SĐT: 0123456789</Typography>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="subtitle1">Hóa đơn: #{selected.id}</Typography>
                  <Typography variant="body2">Ngày: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Bệnh nhân</Typography>
                  <Typography>{selected.patient?.fullName || selected.patient?.username || selected.patientName || ''}</Typography>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Typography variant="body2">{selected.patient?.email || (selected as any).patientPhone || selected.patientEmail || ''}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Bác sĩ</Typography>
                  <Typography>{selected.doctor?.name || selected.doctorName || ''}</Typography>
                </Grid>
              </Grid>

              <Table sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Sản phẩm / Thuốc</TableCell>
                    <TableCell align="center">SL</TableCell>
                    <TableCell align="right">Đơn giá</TableCell>
                    <TableCell align="right">Thành tiền</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selected.drugs || []).map(d => {
                    // Dùng drugPrice từ response API (snapshot giá)
                    const unit = Number(d.drugPrice ?? 0);
                    const qty = d.quantity ?? 1;
                    const line = Number(d.lineTotal ?? unit * qty);
                    return (
                      <TableRow key={d.id}>
                        <TableCell>{d.drugName}{d.note ? ` — ${d.note}` : ''}</TableCell>
                        <TableCell align="center">{qty}</TableCell>
                        <TableCell align="right">{unit.toLocaleString('vi-VN')} đ</TableCell>
                        <TableCell align="right">{line.toLocaleString('vi-VN')} đ</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Box sx={{ width: { xs: '100%', sm: 360 } }}>
                  <Grid container>
                    <Grid item xs={6}><Typography>Tổng</Typography></Grid>
                    <Grid item xs={6}><Typography align="right">{(selected.totalAmount ?? 0).toLocaleString('vi-VN')} đ</Typography></Grid>
                    <Grid item xs={6}><Typography>Giảm</Typography></Grid>
                    <Grid item xs={6}><Typography align="right">{selected.discountPercent != null ? `${selected.discountPercent}%` : ((selected.discountAmount ?? 0) > 0 ? `${(selected.discountAmount ?? 0).toLocaleString('vi-VN')} đ` : '-')}</Typography></Grid>
                    <Grid item xs={6}><Typography sx={{ fontWeight: 'bold' }}>Thanh toán</Typography></Grid>
                    <Grid item xs={6}><Typography align="right" sx={{ fontWeight: 'bold' }}>{(selected.finalAmount ?? 0).toLocaleString('vi-VN')} đ</Typography></Grid>
                  </Grid>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2"><strong>Ghi chú:</strong> {selected.note || '-'}</Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<PrintIcon />} 
            onClick={() => selected && printInvoice(selected)}
            disabled={exportingPdf}
          >
            In
          </Button>
          <Button 
            startIcon={<PictureAsPdfIcon />} 
            disabled={exportingPdf} 
            onClick={() => selected && exportInvoicePdf(selected)}
          >
            {exportingPdf ? <CircularProgress size={18} /> : 'Xuất PDF'}
          </Button>
          <Button onClick={() => { setViewOpen(false); }}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chỉnh sửa đơn thuốc</DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {/* Display read-only patient/doctor info */}
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#666' }}>Bệnh nhân</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selected.patient?.fullName || selected.patient?.username || selected.patientName || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#666' }}>Bác sĩ</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selected.doctor?.name || selected.doctorName || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <div>
                <Typography variant="subtitle2">Danh sách thuốc</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên</TableCell>
                      <TableCell align="center">SL</TableCell>
                      <TableCell align="right">Đơn giá</TableCell>
                      <TableCell align="right">Thành tiền</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selected.drugs || []).map(d => {
                      // Dùng drugPrice từ response API (snapshot giá)
                      const unit = Number(d.drugPrice ?? 0);
                      const qty = d.quantity ?? 1;
                      const line = unit * qty;
                      return (
                        <TableRow key={d.drugId}>
                          <TableCell>{d.drugName}</TableCell>
                          <TableCell align="center">
                            <TextField
                              size="small"
                              type="number"
                              inputProps={{ min: 0 }}
                              value={d.quantity ?? 1}
                              onChange={(e) => {
                                const v = e.target.value === '' ? 0 : Number(e.target.value);
                                const newDrugs = (selected.drugs || []).map(dd => dd === d ? { ...dd, quantity: v } : dd);
                                const updated = { ...selected, drugs: newDrugs } as Prescription;
                                // recalc totals
                                const subtotal = newDrugs.reduce((s, it) => {
                                const u = Number(it.drugPrice ?? 0);
                                  return s + (u * (it.quantity ?? 0));
                                }, 0);
                                const final = updated.discountPercent != null ? Math.round(subtotal * (1 - (updated.discountPercent ?? 0) / 100)) : subtotal - (updated.discountAmount ?? 0);
                                updated.totalAmount = subtotal;
                                updated.finalAmount = final;
                                setSelected(updated);
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">{unit.toLocaleString('vi-VN')} đ</TableCell>
                          <TableCell align="right">{line.toLocaleString('vi-VN')} đ</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="error" onClick={() => {
                              const newDrugs = (selected.drugs || []).filter(dd => dd !== d);
                              const updated = { ...selected, drugs: newDrugs } as Prescription;
                              const subtotal = newDrugs.reduce((s, it) => {
                                const u = Number(it.drugPrice ?? 0);
                                return s + (u * (it.quantity ?? 0));
                              }, 0);
                              const final = updated.discountPercent != null ? Math.round(subtotal * (1 - (updated.discountPercent ?? 0) / 100)) : subtotal - (updated.discountAmount ?? 0);
                              updated.totalAmount = subtotal;
                              updated.finalAmount = final;
                              setSelected(updated);
                            }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Autocomplete to add drug from API */}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Autocomplete
                    size="small"
                    options={drugsList}
                    getOptionLabel={(opt) => {
                      if (!opt || typeof opt === 'string') return '';
                      return `${opt.name || ''} (${opt.price?.toLocaleString('vi-VN') ?? '?'} đ)`;
                    }}
                    isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
                    value={drugToAdd}
                    onChange={(_, v) => setDrugToAdd(v || null)}
                    renderInput={(params) => <TextField {...params} label="Chọn thuốc" placeholder="Tìm thuốc..." />}
                  />
                </Box>
                <Button 
                  startIcon={<AddIcon />} 
                  disabled={loadingDrugs}
                  onClick={() => {
                  if (!selected || !drugToAdd || !drugToAdd.name) return;
                  const drugPrice = Number(drugToAdd.price ?? 0);
                  if (drugPrice <= 0) {
                    toast.error('Thuốc này chưa có giá trong hệ thống');
                    return;
                  }
                  // check if drug already exists (by name)
                  const exists = (selected.drugs || []).find(d => d.drugName?.toLowerCase() === drugToAdd.name.toLowerCase());
                  let newDrugs;
                  if (exists) {
                    newDrugs = (selected.drugs || []).map(d => 
                      d.drugName?.toLowerCase() === drugToAdd.name.toLowerCase() 
                        ? { ...d, quantity: (d.quantity ?? 0) + 1, lineTotal: ((d.quantity ?? 0) + 1) * drugPrice } 
                        : d
                    );
                  } else {
                    newDrugs = [...(selected.drugs || []), { 
                      drugId: drugToAdd.id, 
                      drugName: drugToAdd.name, 
                      quantity: 1, 
                      drugPrice: drugPrice, 
                      lineTotal: drugPrice,
                      priceUnit: drugToAdd.priceUnit || '',
                      note: ''
                    }];
                  }
                  const updated = { ...selected, drugs: newDrugs } as Prescription;
                  // recalc totals
                  const subtotal = newDrugs.reduce((s, it) => {
                    const u = Number(it.drugPrice ?? 0);
                    return s + (u * (it.quantity ?? 0));
                  }, 0);
                  const final = updated.discountPercent != null ? Math.round(subtotal * (1 - (updated.discountPercent ?? 0) / 100)) : subtotal - (updated.discountAmount ?? 0);
                  updated.totalAmount = subtotal;
                  updated.finalAmount = final;
                  setSelected(updated);
                  setDrugToAdd(null);
                }}>Thêm</Button>
              </Stack>

              <TextField label="Ghi chú" multiline minRows={2} value={selected.note ?? ''} onChange={(e) => setSelected({ ...selected, note: e.target.value })} />

            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditOpen(false); setOriginalSelected(null); }}>Hủy</Button>
          <Button 
            variant="contained" 
            disabled={!hasChanges || editLoading}
            onClick={async () => {
            if (!selected) return;
            setEditLoading(true);
            try {
              // Use originalSelected as the base to ensure we never lose patient/doctor info
              const original = originalSelected || prescriptions.find(p => p.id === selected.id) || {} as Prescription;
              
              // Explicit merge: keep all original fields, then override only with selected fields
              const payload: Partial<Prescription> = {
                id: selected.id,
                // Preserve patient info - use selected if it has changed, otherwise use original
                patient: selected.patient && Object.keys(selected.patient).length > 0 ? selected.patient : original.patient,
                patientName: selected.patientName || original.patientName,
                // Preserve doctor info - use selected if it has changed, otherwise use original
                doctor: selected.doctor && Object.keys(selected.doctor).length > 0 ? selected.doctor : original.doctor,
                doctorName: selected.doctorName || original.doctorName,
                // Allow editing these fields
                drugs: selected.drugs,
                totalAmount: selected.totalAmount,
                discountAmount: selected.discountAmount,
                discountPercent: selected.discountPercent,
                discountCode: selected.discountCode,
                finalAmount: selected.finalAmount,
                note: selected.note,
                appointmentId: selected.appointmentId || original.appointmentId,
              };
              
              console.debug('Updating prescription payload', { id: selected.id, payload });
              const res = await PrescriptionAPI.update(selected.id, payload);
              console.debug('Prescription update response', res);
              if (res && res.success) {
                toast.success('Cập nhật thành công');
                setEditOpen(false);
                setOriginalSelected(null);
                void loadData();
              } else {
                toast.error(res?.message || 'Cập nhật thất bại');
              }
            } catch (err) {
              console.error(err);
              toast.error('Lỗi khi cập nhật');
            } finally {
              setEditLoading(false);
            }
          }}>
            {editLoading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa đơn thuốc này?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button color="error" variant="contained" disabled={deleteLoading} onClick={async () => {
            if (!selected) return;
            setDeleteLoading(true);
            try {
              const res = await PrescriptionAPI.delete(selected.id);
              if (res && res.success) {
                toast.success('Đã xóa');
                setDeleteConfirmOpen(false);
                void loadData();
              } else {
                toast.error(res?.message || 'Xóa thất bại');
              }
            } catch {
              toast.error('Lỗi khi xóa');
            } finally {
              setDeleteLoading(false);
            }
          }}>Xóa</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
