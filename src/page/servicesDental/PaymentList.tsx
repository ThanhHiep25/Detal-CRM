import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  Tabs,
  Tab,
  InputAdornment,
  Avatar,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AppointmentAPI } from '../../services/appointments';
import type { AppointmentItem } from '../../services/appointments';
import PrescriptionAPI, { Prescription } from '../../services/prescription';
import PaymentAPI from '../../services/payment';
// dentist enrichment removed — backend now returns dentist info inside appointment
import type { CreateVNPayPayload, CreateVNPayResponse, CreateCashPayload, Transaction } from '../../services/payment';
import { toast, ToastContainer } from 'react-toastify';
import { SearchIcon, TrashIcon } from 'lucide-react';
const PaymentList: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [prescriptionsMap, setPrescriptionsMap] = useState<Record<number, Prescription>>({});

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payLoading, setPayLoading] = useState(false);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [exportingInvoicePdf, setExportingInvoicePdf] = useState(false);

  const [presDialogOpen, setPresDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState(0);
  const [paymentsInnerTab, setPaymentsInnerTab] = useState(0);
  const [transactionDetailOpen, setTransactionDetailOpen] = useState(false);
  const [transactionDetail, setTransactionDetail] = useState<Transaction | null>(null);
  const [prescriptionsList, setPrescriptionsList] = useState<Prescription[]>([]);
  // Pagination state for tables
  const [appointmentsPage, setAppointmentsPage] = useState<number>(0);
  const [appointmentsRowsPerPage, setAppointmentsRowsPerPage] = useState<number>(5);

  const [prescriptionsPage, setPrescriptionsPage] = useState<number>(0);
  const [prescriptionsRowsPerPage, setPrescriptionsRowsPerPage] = useState<number>(5);

  const [transactionsPage, setTransactionsPage] = useState<number>(0);
  const [transactionsRowsPerPage, setTransactionsRowsPerPage] = useState<number>(10);

  // Search & date filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived & pagination helpers with search/date filters
  const parseDate = (s?: string | Date | null) => { if (!s) return null; if (s instanceof Date) return isNaN(s.getTime()) ? null : s; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };

  const matchesSearchText = (text: string | undefined | null) => {
    if (!searchTerm) return true;
    return (text ?? '').toString().toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Appointments filtered by search (customer/service/dentist/id) and scheduledTime range
  const apptFiltered = appointments.filter(a => {
    const matched = (
      matchesSearchText(a.customerName) ||
      matchesSearchText(a.customerUsername) ||
      matchesSearchText(a.serviceName) ||
      matchesSearchText(a.dentistName) ||
      (searchTerm ? String(a.id).includes(searchTerm) : false)
    );
    const scheduled = parseDate(a.scheduledTime as unknown as string);
    const fromDateParsed = dateFrom ? parseDate(dateFrom) : null;
    const toDateParsed = dateTo ? parseDate(dateTo) : null;
    const fromOk = fromDateParsed ? (scheduled ? scheduled >= fromDateParsed : false) : true;
    const toOk = toDateParsed ? (scheduled ? scheduled <= toDateParsed : false) : true;
    return matched && fromOk && toOk;
  });
  const apptCount = apptFiltered.length;
  const displayedAppointments = apptFiltered.slice(appointmentsPage * appointmentsRowsPerPage, appointmentsPage * appointmentsRowsPerPage + appointmentsRowsPerPage);

  // Independent prescriptions filtered by patient/id and createdAt range
  const independentPrescriptions = prescriptionsList
    .filter(p => !p.appointmentId && !p.appointment?.id)
    .filter(p => {
    // Hỗ trợ cả nested patient object và flat patientName
    const patientName = p.patient?.fullName || p.patient?.username || p.patientName || '';
    const matched = matchesSearchText(patientName) || (searchTerm ? String(p.id).includes(searchTerm) : false);
    const created = parseDate((p as unknown as Record<string, unknown>)['createdAt'] as string | undefined);
    const fromDateParsed = dateFrom ? parseDate(dateFrom) : null;
    const toDateParsed = dateTo ? parseDate(dateTo) : null;
    const fromOk = fromDateParsed ? (created ? created >= fromDateParsed : false) : true;
    const toOk = toDateParsed ? (created ? created <= toDateParsed : false) : true;
    return matched && fromOk && toOk;
    })
    .sort((a, b) => {
      const ad = parseDate((a as unknown as Record<string, unknown>)['createdAt'] as string | undefined);
      const bd = parseDate((b as unknown as Record<string, unknown>)['createdAt'] as string | undefined);
      if (!ad && !bd) return (b.id ?? 0) - (a.id ?? 0);
      if (!ad) return 1;
      if (!bd) return -1;
      return bd.getTime() - ad.getTime();
    });
  const presCount = independentPrescriptions.length;
  const displayedPrescriptions = independentPrescriptions.slice(prescriptionsPage * prescriptionsRowsPerPage, prescriptionsPage * prescriptionsRowsPerPage + prescriptionsRowsPerPage);

  // Transactions filtered by transactionId/appointment/prescription/customer and transactionTime/paymentDate range
  const txFiltered = (transactions || [])
    .filter(t => {
    const txId = String(t.transactionId ?? (t as unknown as Record<string, unknown>)['transactionNo'] ?? '');
    const apptId = t.appointment ? String((t.appointment as unknown as Record<string, unknown>)['id'] ?? '') : String(t.appointmentId ?? '');
    const presId = t.prescription ? String((t.prescription as unknown as Record<string, unknown>)['id'] ?? '') : String(t.prescriptionId ?? '');
    const customerName = t.appointment ? String((t.appointment as unknown as Record<string, unknown>)['customerUsername'] ?? (t.appointment as unknown as Record<string, unknown>)['customerName'] ?? '') : '';
    // Hỗ trợ cả nested patient object và flat patientName
    const pres = t.prescription as Prescription | undefined;
    const patientName = pres ? String((pres.patient?.fullName || pres.patient?.username || pres.patientName) ?? '') : '';
    const matched = (
      matchesSearchText(txId) ||
      matchesSearchText(apptId) ||
      matchesSearchText(presId) ||
      matchesSearchText(customerName) ||
      matchesSearchText(patientName)
    );
    const dateStr = String(t.transactionTime ?? t.paymentDate ?? (t as unknown as Record<string, unknown>)['createdAt'] ?? '');
    const trxDate = parseDate(dateStr || undefined);
    const fromDateParsed = dateFrom ? parseDate(dateFrom) : null;
    const toDateParsed = dateTo ? parseDate(dateTo) : null;
    const fromOk = fromDateParsed ? (trxDate ? trxDate >= fromDateParsed : false) : true;
    const toOk = toDateParsed ? (trxDate ? trxDate <= toDateParsed : false) : true;
      return matched && fromOk && toOk;
    })
    .sort((a, b) => {
      const aStr = String(a.transactionTime ?? a.paymentDate ?? (a as unknown as Record<string, unknown>)['createdAt'] ?? '');
      const bStr = String(b.transactionTime ?? b.paymentDate ?? (b as unknown as Record<string, unknown>)['createdAt'] ?? '');
      const ad = parseDate(aStr || undefined);
      const bd = parseDate(bStr || undefined);
      if (!ad && !bd) return (Number(b.id ?? b.paymentId ?? b.transactionId) || 0) - (Number(a.id ?? a.paymentId ?? a.transactionId) || 0);
      if (!ad) return 1;
      if (!bd) return -1;
      return bd.getTime() - ad.getTime();
    });
  const txCount = txFiltered.length;
  const displayedTransactions = txFiltered.slice(transactionsPage * transactionsRowsPerPage, transactionsPage * transactionsRowsPerPage + transactionsRowsPerPage);

  const handleAppointmentsChangePage = (_: unknown, newPage: number) => setAppointmentsPage(newPage);
  const handleAppointmentsChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setAppointmentsRowsPerPage(parseInt(e.target.value, 10)); setAppointmentsPage(0); };

  const handlePrescriptionsChangePage = (_: unknown, newPage: number) => setPrescriptionsPage(newPage);
  const handlePrescriptionsChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setPrescriptionsRowsPerPage(parseInt(e.target.value, 10)); setPrescriptionsPage(0); };

  const handleTransactionsChangePage = (_: unknown, newPage: number) => setTransactionsPage(newPage);
  const handleTransactionsChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setTransactionsRowsPerPage(parseInt(e.target.value, 10)); setTransactionsPage(0); };

  const handleTabChange = (_: React.SyntheticEvent, v: number) => setTab(v);

  async function loadData() {
    setLoading(true);
    try {
      type MaybeApiResponse<T> = { success?: boolean; message?: string; data?: T };
      const apptRes = (await AppointmentAPI.getAll()) as unknown as MaybeApiResponse<AppointmentItem[]>;
      const appts = apptRes?.data ?? [];
      const confirmed = (appts as AppointmentItem[]).filter(a => String(a.status).toUpperCase() === 'CONFIRMED');
      // sort confirmed appointments newest (scheduledTime) first
      const confirmedSorted = confirmed.slice().sort((a, b) => {
        const ad = parseDate(a.scheduledTime as unknown as string);
        const bd = parseDate(b.scheduledTime as unknown as string);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return bd.getTime() - ad.getTime();
      });
      setAppointments(confirmedSorted);

      // load prescriptions and map by appointmentId (if backend provides that field)
      try {
        type MaybePresResp = { success?: boolean; message?: string; data?: Prescription[] };
        const presRes = (await PrescriptionAPI.getAll()) as unknown as MaybePresResp;
        const presList = presRes?.data ?? [];
        // sort prescriptions newest (createdAt) first; fallback to id desc
        const presSorted = (presList as Prescription[]).slice().sort((a, b) => {
          const ad = parseDate((a as unknown as Record<string, unknown>)['createdAt'] as string | undefined);
          const bd = parseDate((b as unknown as Record<string, unknown>)['createdAt'] as string | undefined);
          if (!ad && !bd) return (b.id ?? 0) - (a.id ?? 0);
          if (!ad) return 1;
          if (!bd) return -1;
          return bd.getTime() - ad.getTime();
        });
        setPrescriptionsList(presSorted);
        const map: Record<number, Prescription> = {};
        presList.forEach((p: Prescription) => {
          // Backend response: appointmentId field (flat) OR appointment.id (nested)
          let apptId: number | undefined = (p as unknown as { appointmentId?: number }).appointmentId;
          if (!apptId && p.appointment?.id) {
            apptId = p.appointment.id;
          }
          if (apptId !== undefined && apptId !== null) map[apptId] = p;
        });
        setPrescriptionsMap(map);
      } catch (err) {
        console.warn('Failed to load prescriptions', err);
      }

      // load transactions
      try {
        const txs = await PaymentAPI.getAllTransactions();
        // sort transactions newest (transactionTime/paymentDate/createdAt) first
        const txSorted = (txs || []).slice().sort((a, b) => {
          const ad = parseDate(a.transactionTime ?? a.paymentDate ?? (a as unknown as Record<string, unknown>)['createdAt'] as string | undefined);
          const bd = parseDate(b.transactionTime ?? b.paymentDate ?? (b as unknown as Record<string, unknown>)['createdAt'] as string | undefined);
          if (!ad && !bd) return 0;
          if (!ad) return 1;
          if (!bd) return -1;
          return bd.getTime() - ad.getTime();
        });
        setTransactions(txSorted);
      } catch (err) {
        console.warn('Failed to load transactions', err);
      }
    } catch (err) {
      console.error('Failed to load appointments', err);
    } finally {
      setLoading(false);
    }
  }

  function openPrescription(appt: AppointmentItem) {
    setSelectedAppointment(appt);
    // find prescription by appointment id
    const pres = prescriptionsMap[Number(appt.id)];
    setSelectedPrescription(pres || null);
    setPresDialogOpen(true);
  }

  async function openPayment(appt: AppointmentItem) {
    setSelectedAppointment(appt);
    const pres = prescriptionsMap[Number(appt.id)];
    setSelectedPrescription(pres || null);
    // Lấy giá dịch vụ trực tiếp từ appointment response (serviceTotalPrice hoặc servicePrice)
    // Không lấy từ Service API để tránh thay đổi giá ảnh hưởng đến lịch hẹn đã tạo
    const svcPrice = appt.serviceTotalPrice ?? appt.servicePrice ?? 0;

    const presAmt = pres?.finalAmount ?? pres?.totalAmount ?? 0;
    const totalAmt = Number(svcPrice) + Number(presAmt);
    setPayAmount(totalAmt);
    setPaymentOpen(true);
  }


  function openPrescriptionOnlyPaymentById(prescriptionId: number) {
    const pres = prescriptionsList.find(p => p.id === prescriptionId) || null;
    setSelectedPrescription(pres);
    setSelectedAppointment(null);
    const presAmt = pres?.finalAmount ?? pres?.totalAmount ?? 0;
    setPayAmount(Number(presAmt));
    setPaymentOpen(true);
  }

  async function handleCreatePayment() {
    if (!selectedAppointment) return;
    const appointmentId = Number(selectedAppointment.id);
    const amountNum = Number(payAmount);
    if (!amountNum || Number.isNaN(amountNum) || amountNum <= 0) {
      alert('Số tiền không hợp lệ (không thể tạo thanh toán).');
      return;
    }
    setPayLoading(true);
    try {

      const payloadObj: CreateVNPayPayload = { appointmentId, amount: Math.round(amountNum) };
      if (selectedPrescription && selectedPrescription.id) payloadObj.prescriptionId = selectedPrescription.id;
      const res: CreateVNPayResponse = await PaymentAPI.createVnPay(payloadObj);
      if (res.paymentUrl) {
        // Redirect to VNPay flow; finalization happens after external callback
        window.location.href = res.paymentUrl;
      } else if (res.success === false) {
        alert('Lỗi tạo thanh toán: ' + (res.message || ''));
      } else if (res.success) {
        // Payment creation succeeded immediately (no redirect). Mark appointment completed.
        try {
          const setRes = await AppointmentAPI.setStatus(appointmentId, 'COMPLETE');
          if (!setRes || (typeof setRes === 'object' && setRes !== null && (setRes as { success?: boolean }).success === false)) {
            console.warn('Failed to set appointment status after VNPay create', setRes);
          }
        } catch (err) {
          console.warn('Error setting appointment status', err);
        }
        alert('Thanh toán thành công.');
        setPaymentOpen(false);
        await loadData();
      } else {
        alert('Không nhận được paymentUrl từ server.');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tạo thanh toán VNPay.');
    } finally {
      setPayLoading(false);
    }
  }

  async function handleCreateCash() {
    if (!selectedAppointment) return;
    const appointmentId = Number(selectedAppointment.id);
    const amountNum = Number(payAmount);
    if (!amountNum || Number.isNaN(amountNum) || amountNum <= 0) {
      alert('Số tiền không hợp lệ (không thể tạo thanh toán).');
      return;
    }
    setPayLoading(true);
    try {
      // Use the same amount calculation as VNPay flow (use the displayed `payAmount`)
      const payload: CreateCashPayload = { appointmentId, amount: Math.round(amountNum) };
      if (selectedPrescription && selectedPrescription.id) payload.prescriptionId = selectedPrescription.id;
      const res: CreateVNPayResponse = await PaymentAPI.createCash(payload);
      if (res.success === false) {
        alert('Lỗi khi ghi nhận thanh toán: ' + (res.message || ''));
      } else {
        // Mark appointment as completed after successful cash payment
        try {
          const setRes = await AppointmentAPI.setStatus(appointmentId, 'COMPLETE');
          if (!setRes || (typeof setRes === 'object' && setRes !== null && (setRes as { success?: boolean }).success === false)) {
            console.warn('Failed to set appointment status after cash payment', setRes);
          }
        } catch (err) {
          console.warn('Error setting appointment status', err);
        }
        toast.success('Đã ghi nhận thanh toán tiền mặt thành công.');
        toast.info('Lịch hẹn đã được đánh dấu là hoàn thành.');
        setPaymentOpen(false);
        await loadData();
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi ghi nhận thanh toán.');
    } finally {
      setPayLoading(false);
    }
  }

  async function openTransactionDetail(tx: Transaction) {
    try {
      const id = tx.id ?? tx.paymentId ?? tx.transactionId;
      let txData: Transaction = tx;

      // Try to get full transaction detail from API
      try {
        const data = await PaymentAPI.getTransactionById(Number(id));
        let resolved: unknown = data;
        if (resolved && typeof resolved === 'object' && 'data' in (resolved as Record<string, unknown>)) {
          resolved = (resolved as Record<string, unknown>)['data'];
        }
        if (resolved && typeof resolved === 'object' && !('success' in resolved && (resolved as { success?: boolean }).success === false)) {
          txData = (Array.isArray(resolved) ? resolved[0] : resolved) as Transaction;
        }
      } catch (err) {
        console.warn('Failed to fetch transaction detail, using original data', err);
      }

      // If transaction has appointmentId but appointment object is missing service details,
      // fetch full appointment data to get servicePrice, serviceDurationMinutes, etc.
      // Chỉ lấy từ response trực tiếp, không lấy từ nested service object để tránh thay đổi giá ảnh hưởng thanh toán
      const apptId = txData.appointmentId ?? (txData.appointment as AppointmentItem)?.id;
      if (apptId) {
        // Check if we already have full service info (chỉ kiểm tra các trường flat-level)
        const appt = txData.appointment as AppointmentItem | undefined;
        const hasServiceInfo = appt?.servicePrice != null || appt?.serviceTotalPrice != null;
        
        if (!hasServiceInfo) {
          // Fetch full appointment data
          try {
            const fullApptList = appointments.find(a => a.id === apptId);
            if (fullApptList) {
              // Use cached data from appointments list
              txData = { ...txData, appointment: fullApptList };
            } else {
              // Fetch from API
              type MaybeApiResponse<T> = { success?: boolean; message?: string; data?: T };
              const apptRes = (await AppointmentAPI.getAll()) as unknown as MaybeApiResponse<AppointmentItem[]>;
              const allAppts = apptRes?.data ?? [];
              const foundAppt = allAppts.find((a: AppointmentItem) => a.id === apptId);
              if (foundAppt) {
                txData = { ...txData, appointment: foundAppt };
              }
            }
          } catch (err) {
            console.warn('Failed to enrich appointment data', err);
          }
        }
      }

      // If transaction has prescriptionId but prescription object is missing drugs data,
      // fetch full prescription data to get drugs with prices (drugPrice, lineTotal, etc.)
      let presId: number | undefined = txData.prescriptionId ?? (txData.prescription as Prescription)?.id;
      if (!presId && txData.prescription) {
        // Fallback: try to extract from prescription object
        presId = (txData.prescription as unknown as Record<string, unknown>)['id'] as number | undefined;
      }
      if (presId) {
        // Check if we already have full prescription info with drugs
        const pres = txData.prescription as Prescription | undefined;
        const hasDrugsInfo = Array.isArray(pres?.drugs) && pres.drugs.length > 0 && pres.drugs.some(d => d.drugPrice != null);
        
        if (!hasDrugsInfo) {
          // Try to find in cached prescriptions first
          try {
            const foundPres = prescriptionsList.find(p => p.id === presId);
            if (foundPres && Array.isArray(foundPres.drugs) && foundPres.drugs.length > 0) {
              txData = { ...txData, prescription: foundPres };
            } else {
              // Fetch directly by ID for best results
              try {
                const directRes = await PrescriptionAPI.getById(presId);
                const directPres = (directRes as unknown as Record<string, unknown>)?.['data'] as Prescription | undefined ?? (directRes as unknown as Prescription | undefined);
                if (directPres && Array.isArray(directPres.drugs) && directPres.drugs.length > 0) {
                  txData = { ...txData, prescription: directPres };
                }
              } catch {
                // Fallback to getAll if getById fails
                const presRes = await PrescriptionAPI.getAll();
                const allPres = (presRes as unknown as { data?: Prescription[] })?.data ?? [];
                const foundFromApi = allPres.find(p => p.id === presId);
                if (foundFromApi && Array.isArray(foundFromApi.drugs) && foundFromApi.drugs.length > 0) {
                  txData = { ...txData, prescription: foundFromApi };
                }
              }
            }
          } catch (err) {
            console.warn('Failed to enrich prescription data', err);
          }
        }
      }

      setTransactionDetail(txData);
      setTransactionDetailOpen(true);
    } catch (err) {
      console.error(err);
      alert('Không thể tải chi tiết giao dịch');
    }
  }

  // Helper to build payment invoice HTML
  const buildPaymentInvoiceHtml = () => {
    if (!selectedAppointment && !selectedPrescription) return '';

    const svcPrice = selectedAppointment?.serviceTotalPrice ?? selectedAppointment?.servicePrice ?? 0;
    const presAmt = selectedPrescription?.finalAmount ?? selectedPrescription?.totalAmount ?? 0;
    const totalAmt = Number(svcPrice) + Number(presAmt);

    const drugsHtml = selectedPrescription?.drugs?.map(d => {
      const unit = Number(d.drugPrice ?? 0);
      const qty = d.quantity ?? 1;
      const line = Number(d.lineTotal ?? unit * qty);
      return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${d.drugName || d.drugId}${d.priceUnit ? ` (${d.priceUnit})` : ''}${d.note ? ` — ${d.note}` : ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${unit.toLocaleString('vi-VN')} đ</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${line.toLocaleString('vi-VN')} đ</td></tr>`;
    }).join('') || '';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; max-width:900px; margin:0 auto; padding:0;">
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
            <div style="font-weight:700;font-size:16px">HÓA ĐƠN THANH TOÁN</div>
            <div style="font-size:12px;color:#666">Ngày: ${new Date().toLocaleString('vi-VN')}</div>
          </div>
        </div>
        <hr style="border:none;border-bottom:1px solid #ddd;margin:12px 0"/>

        ${selectedAppointment ? `
        <div style="margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:8px;text-decoration:underline">THÔNG TIN LỊCH HẸN</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
            <div><span style="color:#666">Khách hàng:</span> <span style="font-weight:500">${selectedAppointment.customerName || selectedAppointment.customerUsername || '-'}</span></div>
            <div><span style="color:#666">Ngày hẹn:</span> <span style="font-weight:500">${selectedAppointment.scheduledTime ? new Date(selectedAppointment.scheduledTime).toLocaleString('vi-VN') : '-'}</span></div>
            <div><span style="color:#666">Nha sĩ:</span> <span style="font-weight:500">${selectedAppointment.dentistName || '-'}</span></div>
            <div><span style="color:#666">Chi nhánh:</span> <span style="font-weight:500">${selectedAppointment.branchName || selectedAppointment.branchAddress || '-'}</span></div>
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:8px;text-decoration:underline">DỊCH VỤ SỬ DỤNG</div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background-color:#f3f4f6">
                <th style="text-align:left;padding:8px;border:1px solid #ddd">Dịch vụ</th>
                <th style="text-align:center;padding:8px;border:1px solid #ddd">Thời lượng</th>
                <th style="text-align:right;padding:8px;border:1px solid #ddd">Giá</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px;border:1px solid #ddd">${selectedAppointment.serviceName || '-'}</td>
                <td style="text-align:center;padding:8px;border:1px solid #ddd">${selectedAppointment.serviceDurationMinutes || selectedAppointment.serviceDuration || selectedAppointment.estimatedMinutes || '-'} phút</td>
                <td style="text-align:right;padding:8px;border:1px solid #ddd;font-weight:500">${(svcPrice).toLocaleString('vi-VN')} đ</td>
              </tr>
            </tbody>
          </table>
          <div style="text-align:right;margin-top:8px;font-weight:600">Tổng dịch vụ: <span style="font-size:16px;color:#059669">${(svcPrice).toLocaleString('vi-VN')} đ</span></div>
        </div>
        ` : ''}

        ${selectedPrescription ? `
        <div style="margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:8px;text-decoration:underline">ĐƠN THUỐC</div>
          <div style="margin-bottom:8px;font-size:13px">
            <div><span style="color:#666">Bệnh nhân:</span> <span style="font-weight:500">${selectedPrescription.patient?.fullName || selectedPrescription.patient?.username || selectedPrescription.patientName || '-'}</span></div>
            <div><span style="color:#666">Bác sĩ kê đơn:</span> <span style="font-weight:500">${selectedPrescription.doctor?.name || selectedPrescription.doctorName || '-'}</span></div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-top:8px">
            <thead>
              <tr style="background-color:#f3f4f6">
                <th style="text-align:left;padding:8px;border:1px solid #ddd">Tên thuốc</th>
                <th style="text-align:center;padding:8px;border:1px solid #ddd">SL</th>
                <th style="text-align:right;padding:8px;border:1px solid #ddd">Đơn giá</th>
                <th style="text-align:right;padding:8px;border:1px solid #ddd">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${drugsHtml}
            </tbody>
          </table>
          <div style="text-align:right;margin-top:8px;font-weight:600">Tổng thuốc: <span style="font-size:16px;color:#059669">${(presAmt).toLocaleString('vi-VN')} đ</span></div>
        </div>
        ` : ''}

        <div style="border:2px solid #059669;border-radius:8px;padding:16px;background-color:#f0fdf4">
          <div style="text-align:right;font-size:14px">
            <div style="margin-bottom:8px">
              <span style="color:#666">Tổng dịch vụ:</span>
              <span style="margin-left:20px;font-weight:500">${(svcPrice).toLocaleString('vi-VN')} đ</span>
            </div>
            <div style="margin-bottom:8px">
              <span style="color:#666">Tổng thuốc:</span>
              <span style="margin-left:20px;font-weight:500">${(presAmt).toLocaleString('vi-VN')} đ</span>
            </div>
            <div style="border-top:2px solid #059669;padding-top:8px;margin-top:8px;font-size:18px;font-weight:700">
              <span>TỔNG THANH TOÁN:</span>
              <span style="margin-left:20px;color:#059669">${(totalAmt).toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>

        <div style="margin-top:24px;text-align:center;font-size:12px;color:#666">
          <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
          <p>Vui lòng giữ lại hóa đơn này để tham khảo.</p>
        </div>
      </div>
    `;
  };

  const buildWrappedHtml = (content: string) => `<!doctype html><html><head><meta charset="utf-8"><title>Hóa đơn thanh toán</title><style>@page{size: A4; margin:12mm;} body{margin:0;padding:12px;background:#fff;color:#111}</style></head><body>${content}</body></html>`;

  const printInvoice = () => {
    const html = buildWrappedHtml(buildPaymentInvoiceHtml());
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const exportInvoicePdf = async () => {
    setExportingInvoicePdf(true);
    let container: HTMLDivElement | null = null;
    try {
      container = document.createElement('div');
      container.style.padding = '12px';
      container.innerHTML = buildPaymentInvoiceHtml();
      document.body.appendChild(container);

      const html2pdfModule = (await import('html2pdf.js')).default ?? (await import('html2pdf.js'));
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `invoice-payment-${selectedAppointment?.id || 'unknown'}.pdf`,
        html2canvas: { scale: 2.2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdfModule() as any).set(opt).from(container).save();
      toast.success('Đã xuất PDF');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xuất PDF');
    } finally {
      setExportingInvoicePdf(false);
      if (container && container.parentNode) container.parentNode.removeChild(container);
    }
  };

  // Helper to build invoice HTML from transaction
  const buildTransactionInvoiceHtml = (tx: Transaction) => {
    const appt = tx.appointment as AppointmentItem | undefined;
    const pres = tx.prescription as Prescription | undefined;

    const svcPrice = appt?.serviceTotalPrice ?? appt?.servicePrice ?? 0;
    const presAmt = pres?.finalAmount ?? pres?.totalAmount ?? 0;
    const totalAmt = Number(svcPrice) + Number(presAmt);

    const drugsHtml = pres?.drugs?.map(d => {
      const unit = Number(d.drugPrice ?? 0);
      const qty = d.quantity ?? 1;
      const line = Number(d.lineTotal ?? unit * qty);
      return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${d.drugName || d.drugId}${d.priceUnit ? ` (${d.priceUnit})` : ''}${d.note ? ` — ${d.note}` : ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${unit.toLocaleString('vi-VN')} đ</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${line.toLocaleString('vi-VN')} đ</td></tr>`;
    }).join('') || '';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; max-width:900px; margin:0 auto; padding:0;">
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
            <div style="font-weight:700;font-size:16px">HÓA ĐƠN THANH TOÁN</div>
            <div style="font-size:12px;color:#666">Ngày: ${new Date().toLocaleString('vi-VN')}</div>
          </div>
        </div>
        <hr style="border:none;border-bottom:1px solid #ddd;margin:12px 0"/>

        ${appt ? `
        <div style="margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:8px;text-decoration:underline">THÔNG TIN LỊCH HẸN</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
            <div><span style="color:#666">Khách hàng:</span> <span style="font-weight:500">${appt.customerName || appt.customerUsername || '-'}</span></div>
            <div><span style="color:#666">Ngày hẹn:</span> <span style="font-weight:500">${appt.scheduledTime ? new Date(appt.scheduledTime).toLocaleString('vi-VN') : '-'}</span></div>
            <div><span style="color:#666">Nha sĩ:</span> <span style="font-weight:500">${appt.dentistName || '-'}</span></div>
            <div><span style="color:#666">Chi nhánh:</span> <span style="font-weight:500">${appt.branchName || appt.branchAddress || '-'}</span></div>
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:8px;text-decoration:underline">DỊCH VỤ SỬ DỤNG</div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background-color:#f3f4f6">
                <th style="text-align:left;padding:8px;border:1px solid #ddd">Dịch vụ</th>
                <th style="text-align:center;padding:8px;border:1px solid #ddd">Thời lượng</th>
                <th style="text-align:right;padding:8px;border:1px solid #ddd">Giá</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px;border:1px solid #ddd">${appt.serviceName || '-'}</td>
                <td style="text-align:center;padding:8px;border:1px solid #ddd">${appt.serviceDurationMinutes || appt.serviceDuration || appt.estimatedMinutes || '-'} phút</td>
                <td style="text-align:right;padding:8px;border:1px solid #ddd;font-weight:500">${(svcPrice).toLocaleString('vi-VN')} đ</td>
              </tr>
            </tbody>
          </table>
          <div style="text-align:right;margin-top:8px;font-weight:600">Tổng dịch vụ: <span style="font-size:16px;color:#059669">${(svcPrice).toLocaleString('vi-VN')} đ</span></div>
        </div>
        ` : ''}

        ${pres ? `
        <div style="margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:8px;text-decoration:underline">ĐƠN THUỐC</div>
          <div style="margin-bottom:8px;font-size:13px">
            <div><span style="color:#666">Bệnh nhân:</span> <span style="font-weight:500">${pres.patient?.fullName || pres.patient?.username || pres.patientName || '-'}</span></div>
            <div><span style="color:#666">Bác sĩ kê đơn:</span> <span style="font-weight:500">${pres.doctor?.name || pres.doctorName || '-'}</span></div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-top:8px">
            <thead>
              <tr style="background-color:#f3f4f6">
                <th style="text-align:left;padding:8px;border:1px solid #ddd">Tên thuốc</th>
                <th style="text-align:center;padding:8px;border:1px solid #ddd">SL</th>
                <th style="text-align:right;padding:8px;border:1px solid #ddd">Đơn giá</th>
                <th style="text-align:right;padding:8px;border:1px solid #ddd">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${drugsHtml}
            </tbody>
          </table>
          <div style="text-align:right;margin-top:8px;font-weight:600">Tổng thuốc: <span style="font-size:16px;color:#059669">${(presAmt).toLocaleString('vi-VN')} đ</span></div>
        </div>
        ` : ''}

        <div style="border:2px solid #059669;border-radius:8px;padding:16px;background-color:#f0fdf4">
          <div style="text-align:right;font-size:14px">
            <div style="margin-bottom:8px">
              <span style="color:#666">Tổng dịch vụ:</span>
              <span style="margin-left:20px;font-weight:500">${(svcPrice).toLocaleString('vi-VN')} đ</span>
            </div>
            <div style="margin-bottom:8px">
              <span style="color:#666">Tổng thuốc:</span>
              <span style="margin-left:20px;font-weight:500">${(presAmt).toLocaleString('vi-VN')} đ</span>
            </div>
            <div style="border-top:2px solid #059669;padding-top:8px;margin-top:8px;font-size:18px;font-weight:700">
              <span>TỔNG THANH TOÁN:</span>
              <span style="margin-left:20px;color:#059669">${(totalAmt).toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>

        <div style="margin-top:24px;text-align:center;font-size:12px;color:#666">
          <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
          <p>Vui lòng giữ lại hóa đơn này để tham khảo.</p>
        </div>
      </div>
    `;
  };

  const printTransactionInvoice = (tx: Transaction) => {
    const html = buildWrappedHtml(buildTransactionInvoiceHtml(tx));
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const exportTransactionInvoicePdf = async (tx: Transaction) => {
    setExportingInvoicePdf(true);
    let container: HTMLDivElement | null = null;
    try {
      container = document.createElement('div');
      container.style.padding = '12px';
      container.innerHTML = buildTransactionInvoiceHtml(tx);
      document.body.appendChild(container);

      const html2pdfModule = (await import('html2pdf.js')).default ?? (await import('html2pdf.js'));
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `invoice-transaction-${tx.id || 'unknown'}.pdf`,
        html2canvas: { scale: 2.2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdfModule() as any).set(opt).from(container).save();
      toast.success('Đã xuất PDF');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xuất PDF');
    } finally {
      setExportingInvoicePdf(false);
      if (container && container.parentNode) container.parentNode.removeChild(container);
    }
  };

  return (
    <Box className="p-4 bg-white rounded-xl">
      <ToastContainer />
      <Tabs value={tab} onChange={handleTabChange} className="mb-4">
        <Tab label="Danh sách cần thanh toán" />
        <Tab label="Lịch sử giao dịch" />
      </Tabs>

      <Box className="mb-4 flex flex-wrap gap-4 items-start">
        <div className="flex flex-start flex-col">
          <div className="text-sm text-gray-600 mb-1">Tìm kiếm</div>
          <TextField size="small"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </div>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div>
              <div className="text-sm text-gray-600 mb-1">Từ ngày</div>
              <DatePicker
                value={dateFrom}
                onChange={(newValue) => setDateFrom(newValue as unknown as Date | null)}
                slotProps={{ textField: { size: 'small' } }}
              />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Đến ngày</div>
              <DatePicker
                value={dateTo}
                onChange={(newValue) => setDateTo(newValue as unknown as Date | null)}
                slotProps={{ textField: { size: 'small' } }}
              />
            </div>
          </div>
        </LocalizationProvider>
        <div className="flex items-center justify-center gap-2 mt-7">
          <Button size="small" variant="outlined" onClick={() => { setSearchTerm(''); setDateFrom(null); setDateTo(null); }}>
            <TrashIcon className="mr-2" />
            Xóa bộ lọc</Button>
        </div>
      </Box>

      {tab === 0 ? (
        <Card className="shadow">
          <CardContent>
            <Tabs value={paymentsInnerTab} onChange={(_, v) => setPaymentsInnerTab(v)} className="mb-4">
              <Tab label="Lịch hẹn (CONFIRMED)" />
              <Tab label="Đơn thuốc độc lập" />
            </Tabs>

            {paymentsInnerTab === 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="h6">Danh sách lịch hẹn (CONFIRMED)</Typography>
                  <div>
                    <Button size="small" variant="outlined" onClick={loadData} disabled={loading}>{loading ? 'Đang tải...' : 'Làm mới'}</Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Khách</TableCell>
                        <TableCell>Dịch vụ</TableCell>
                        <TableCell>Nha sĩ</TableCell>
                        <TableCell>Ngày</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell align="right">Hành động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {apptCount === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6">Không có lịch hẹn cần thanh toán.</TableCell>
                        </TableRow>
                      ) : (
                        displayedAppointments.map((a) => (
                          <TableRow key={String(a.id)} hover>
                            <TableCell>{a.id}</TableCell>
                            <TableCell >
                              <div className="flex items-center gap-2">
                                <Avatar
                                  sx={{ width: 32, height: 32 }}
                                  src={a.customerName || a.customerUsername || '-'}
                                  alt={a.customerName || a.customerUsername || '-'} />
                                {a.customerName || a.customerUsername || '-'}
                              </div>
                            </TableCell>
                            <TableCell>{a.serviceName || '-'}</TableCell>
                            <TableCell>{a.dentistName || '-'}</TableCell>
                            <TableCell>{a.scheduledTime ? new Date(a.scheduledTime).toLocaleString() : '-'}</TableCell>
                            <TableCell>{a.status}</TableCell>
                            <TableCell align="right">
                              <div className="flex items-center justify-end gap-2">
                                {prescriptionsMap[Number(a.id)] ? (
                                  <Button size="small" variant="text" onClick={() => openPrescription(a)}>Đơn thuốc</Button>
                                ) : null}
                                <Button size="small" variant="contained" onClick={() => openPayment(a)}>Thanh toán</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  component="div"
                  count={apptCount}
                  page={appointmentsPage}
                  onPageChange={handleAppointmentsChangePage}
                  rowsPerPage={appointmentsRowsPerPage}
                  onRowsPerPageChange={handleAppointmentsChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 25]}
                />

              </>
            ) : (
              <>
                <div className="mb-4">
                  <Card variant="outlined">
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <Typography variant="subtitle1">Đơn thuốc độc lập (không gắn lịch hẹn)</Typography>
                        <Button size="small" variant="outlined" onClick={loadData} disabled={loading}>{loading ? 'Đang tải...' : 'Làm mới'}</Button>
                      </div>
                      <div className="overflow-x-auto">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Bệnh nhân</TableCell>
                              <TableCell align="right">Tổng</TableCell>
                              <TableCell align="right">Hành động</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {presCount === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">Không có đơn thuốc độc lập.</TableCell>
                              </TableRow>
                            ) : (
                              displayedPrescriptions.map((p) => (
                                <TableRow key={p.id} hover>
                                  <TableCell>{p.id}</TableCell>
                                  <TableCell>{(p.patient?.fullName || p.patient?.username || p.patientName) ?? '-'}</TableCell>
                                  <TableCell align="right">{(p.finalAmount ?? p.totalAmount ?? 0).toLocaleString('vi-VN')} đ</TableCell>
                                  <TableCell align="right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button size="small" variant="text" onClick={() => { setSelectedPrescription(p); setPresDialogOpen(true); }}>Xem</Button>
                                      <Button size="small" variant="contained" onClick={() => openPrescriptionOnlyPaymentById(p.id)}>Thanh toán</Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      <TablePagination
                        component="div"
                        count={presCount}
                        page={prescriptionsPage}
                        onPageChange={handlePrescriptionsChangePage}
                        rowsPerPage={prescriptionsRowsPerPage}
                        onRowsPerPageChange={handlePrescriptionsChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25]}
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow">
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h6">Lịch sử giao dịch</Typography>
              <div className="flex items-center gap-2">
                <Button size="small" variant="outlined" onClick={() => {
                  // Today
                  const now = new Date();
                  const start = new Date(now); start.setHours(0,0,0,0);
                  const end = new Date(now); end.setHours(23,59,59,999);
                  setDateFrom(start); setDateTo(end);
                }}>Hôm nay</Button>
                <Button size="small" variant="outlined" onClick={() => {
                  // This week (Monday - Sunday)
                  const now = new Date();
                  const day = now.getDay();
                  const diffToMonday = (day + 6) % 7; // 0->Mon
                  const monday = new Date(now); monday.setDate(now.getDate() - diffToMonday); monday.setHours(0,0,0,0);
                  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
                  setDateFrom(monday); setDateTo(sunday);
                }}>Tuần này</Button>
                <Button size="small" variant="outlined" onClick={() => {
                  // This month
                  const now = new Date();
                  const first = new Date(now.getFullYear(), now.getMonth(), 1); first.setHours(0,0,0,0);
                  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0); last.setHours(23,59,59,999);
                  setDateFrom(first); setDateTo(last);
                }}>Tháng này</Button>
                <Button size="small" variant="outlined" onClick={() => { setDateFrom(null); setDateTo(null); setSearchTerm(''); }}>Tất cả</Button>
                <Button size="small" variant="outlined" onClick={loadData} disabled={loading}>{loading ? 'Đang tải...' : 'Làm mới'}</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Mã giao dịch</TableCell>
                    <TableCell>Mã Lịch hẹn</TableCell>
                    <TableCell>Mã Đơn thuốc</TableCell>
                    <TableCell align="right">Số tiền</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Phương thức</TableCell>
                    <TableCell>Thời gian</TableCell>
                    <TableCell align="right">Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedTransactions.map((tx) => (
                    <TableRow key={tx.id ?? tx.paymentId ?? tx.transactionId} hover>
                      <TableCell>{tx.id ?? tx.paymentId ?? '-'}</TableCell>
                      <TableCell>{tx.transactionId || tx.transactionNo || '-'}</TableCell>
                      <TableCell>{tx.appointment ? `#${tx.appointment.id}` : (tx.appointmentId ?? '-')}</TableCell>
                      <TableCell>{tx.prescription ? `#${tx.prescription.id}` : (tx.prescriptionId ?? '-')}</TableCell>
                      <TableCell align="right">{(tx.amount ?? 0).toLocaleString('vi-VN')} đ</TableCell>
                      <TableCell>{tx.status ?? '-'}</TableCell>
                      <TableCell>{tx.paymentMethod ?? (tx.bankCode ? 'VNPAY' : 'CASH')}</TableCell>
                      <TableCell>{tx.transactionTime ? new Date(tx.transactionTime).toLocaleString() : (tx.paymentDate ? new Date(tx.paymentDate).toLocaleString() : '-')}</TableCell>
                      <TableCell align="right"><Button size="small" onClick={() => openTransactionDetail(tx)}>Xem</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              component="div"
              count={txCount}
              page={transactionsPage}
              onPageChange={handleTransactionsChangePage}
              rowsPerPage={transactionsRowsPerPage}
              onRowsPerPageChange={handleTransactionsChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </CardContent>
        </Card>
      )}

      {/* Prescription dialog */}
      <Dialog open={presDialogOpen} onClose={() => setPresDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{selectedAppointment ? `Đơn thuốc cho lịch hẹn #${selectedAppointment.id}` : 'Đơn thuốc'}</DialogTitle>
        <DialogContent>
          {selectedPrescription ? (
            <div>
              <Typography variant="subtitle1">Bệnh nhân: {selectedPrescription.patient?.fullName || selectedPrescription.patient?.username || selectedPrescription.patientName}</Typography>
              <Typography variant="body2">Bác sĩ: {selectedPrescription.doctor?.name || selectedPrescription.doctorName || '-'}</Typography>
              <Typography variant="body2">Tổng tiền: {(selectedPrescription.totalAmount ?? 0).toLocaleString('vi-VN')} đ • Thành tiền: {(selectedPrescription.finalAmount ?? 0).toLocaleString('vi-VN')} đ</Typography>
              <div className="mt-4">
                <Typography variant="subtitle2">Danh sách thuốc</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên</TableCell>
                      <TableCell>Số lượng</TableCell>
                      <TableCell>Đơn giá</TableCell>
                      <TableCell>Thành tiền</TableCell>
                      <TableCell>Ghi chú</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPrescription.drugs && selectedPrescription.drugs.length > 0 ? (
                      selectedPrescription.drugs.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell>{d.drugName || d.drugId}{d.priceUnit ? ` (${d.priceUnit})` : ''}</TableCell>
                          <TableCell>{d.quantity}</TableCell>
                          <TableCell>{(d.drugPrice ?? 0).toLocaleString('vi-VN')} đ</TableCell>
                          <TableCell>{(d.lineTotal ?? (d.drugPrice ?? 0) * (d.quantity ?? 0)).toLocaleString('vi-VN')} đ</TableCell>
                          <TableCell>{d.note || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>Không có thuốc</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <Typography>Không tìm thấy đơn thuốc cho lịch hẹn này.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Transaction detail dialog */}
      <Dialog open={transactionDetailOpen} onClose={() => setTransactionDetailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb', pb: 2 }}>
          <div className="flex items-center justify-between">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Chi tiết giao dịch</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ px: 1.5, py: 0.5, backgroundColor: transactionDetail?.status === 'SUCCESS' ? '#dcfce7' : transactionDetail?.status === 'PENDING' ? '#fef3c7' : '#fee2e2', color: transactionDetail?.status === 'SUCCESS' ? '#166534' : transactionDetail?.status === 'PENDING' ? '#92400e' : '#991b1b', borderRadius: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                {transactionDetail?.status ?? '-'}
              </Box>
              <Box sx={{ px: 1.5, py: 0.5, backgroundColor: '#f3f4f6', color: '#374151', borderRadius: 1, fontSize: '0.75rem', fontWeight: 600 }}>
                {transactionDetail?.paymentMethod ?? (transactionDetail?.bankCode ? 'VNPAY' : 'CASH')}
              </Box>
            </Box>
          </div>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {transactionDetail ? (
            <div className="space-y-6">
              {/* Transaction Info */}
              <div>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Thông tin giao dịch</Typography>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-500 w-1/3">ID giao dịch</td>
                      <td className="py-2 font-medium">{transactionDetail.id ?? transactionDetail.paymentId ?? '-'}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-500">Mã giao dịch</td>
                      <td className="py-2 font-medium">{transactionDetail.transactionId ?? transactionDetail.transactionNo ?? '-'}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-500">Số tiền</td>
                      <td className="py-2 font-semibold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(transactionDetail.amount ?? 0)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-500">Thời gian</td>
                      <td className="py-2 font-medium">{transactionDetail.transactionTime ? new Date(transactionDetail.transactionTime).toLocaleString('vi-VN') : (transactionDetail.paymentDate ? new Date(transactionDetail.paymentDate).toLocaleString('vi-VN') : '-')}</td>
                    </tr>
                    {transactionDetail.bankCode && (
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Ngân hàng</td>
                        <td className="py-2 font-medium">{transactionDetail.bankCode}</td>
                      </tr>
                    )}
                    {((transactionDetail as unknown as Record<string, unknown>)['note'] ?? undefined) && (
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Ghi chú</td>
                        <td className="py-2">{String(((transactionDetail as unknown as Record<string, unknown>)['note']) ?? '-')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Appointment Info */}
              {transactionDetail.appointment ? (
                <div>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Thông tin lịch hẹn</Typography>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500 w-1/3">ID lịch hẹn</td>
                        <td className="py-2 font-medium">#{transactionDetail.appointment.id}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Khách hàng</td>
                        <td className="py-2 font-medium">{String((transactionDetail.appointment as AppointmentItem).customerName ?? (transactionDetail.appointment as AppointmentItem).customerUsername ?? '-')}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Email</td>
                        <td className="py-2">{String((transactionDetail.appointment as AppointmentItem).customerEmail ?? '-')}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Số điện thoại</td>
                        <td className="py-2">{String((transactionDetail.appointment as AppointmentItem).customer?.phone ?? (transactionDetail.appointment as unknown as Record<string, unknown>)['customerPhone'] ?? '-')}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Dịch vụ</td>
                        <td className="py-2 font-medium">{(transactionDetail.appointment as AppointmentItem).serviceName || '-'}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Thời lượng dịch vụ</td>
                        <td className="py-2">
                          {(() => {
                            const appt = transactionDetail.appointment as AppointmentItem;
                            // Chỉ lấy từ response appointment, không lấy từ service API
                            const duration = appt.serviceDurationMinutes ?? appt.serviceDuration ?? appt.estimatedMinutes;
                            return duration ? `${duration} phút` : '-';
                          })()}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Giá dịch vụ</td>
                        <td className="py-2">
                          {(() => {
                            const appt = transactionDetail.appointment as AppointmentItem;
                            // Chỉ lấy servicePrice từ response, không lấy từ service API để tránh thay đổi giá ảnh hưởng thanh toán
                            const price = appt.servicePrice;
                            return price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price) : '-';
                          })()}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Giảm giá</td>
                        <td className="py-2 text-orange-600">
                          {(() => {
                            const appt = transactionDetail.appointment as AppointmentItem;
                            // Chỉ lấy serviceDiscountPercent từ response
                            const discount = appt.serviceDiscountPercent;
                            return (discount != null && discount > 0) ? `${discount}%` : '0%';
                          })()}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Tổng tiền dịch vụ</td>
                        <td className="py-2 font-semibold text-emerald-600">
                          {(() => {
                            const appt = transactionDetail.appointment as AppointmentItem;
                            // Chỉ lấy serviceTotalPrice hoặc servicePrice từ response, không lấy từ service API
                            const totalPrice = appt.serviceTotalPrice ?? appt.servicePrice;
                            return totalPrice ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice) : '-';
                          })()}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Nha sĩ</td>
                        <td className="py-2 font-medium">{String((transactionDetail.appointment as AppointmentItem).dentistName ?? (transactionDetail.appointment as AppointmentItem).dentist?.name ?? '-')}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Chuyên khoa</td>
                        <td className="py-2">{String((transactionDetail.appointment as AppointmentItem).dentistSpecialization ?? (transactionDetail.appointment as AppointmentItem).dentist?.specialization ?? '-')}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Chi nhánh</td>
                        <td className="py-2">{String((transactionDetail.appointment as AppointmentItem).branchName ?? (transactionDetail.appointment as AppointmentItem).branch?.name ?? '-')}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Ngày hẹn</td>
                        <td className="py-2 font-medium">{(transactionDetail.appointment as AppointmentItem).scheduledTime ? new Date((transactionDetail.appointment as AppointmentItem).scheduledTime!).toLocaleString('vi-VN') : '-'}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Trạng thái</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${(transactionDetail.appointment as AppointmentItem).status === 'COMPLETE' ? 'bg-green-100 text-green-700' : (transactionDetail.appointment as AppointmentItem).status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {(transactionDetail.appointment as AppointmentItem).status ?? '-'}
                          </span>
                        </td>
                      </tr>
                      {(transactionDetail.appointment as AppointmentItem).notes && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-500">Ghi chú</td>
                          <td className="py-2 text-gray-600 italic">{String((transactionDetail.appointment as AppointmentItem).notes ?? '-')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Prescription Info */}
              {transactionDetail.prescription ? (
                <div>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Thông tin đơn thuốc</Typography>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500 w-1/3">ID đơn thuốc</td>
                        <td className="py-2 font-medium">#{transactionDetail.prescription.id ?? '-'}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Bệnh nhân</td>
                        <td className="py-2 font-medium">{String((transactionDetail.prescription.patient?.fullName || transactionDetail.prescription.patient?.username || transactionDetail.prescription.patientName) ?? '-')}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Bác sĩ kê đơn</td>
                        <td className="py-2 font-medium">{String((transactionDetail.prescription.doctor?.name || transactionDetail.prescription.doctorName) ?? '-')}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Tổng tiền thuốc</td>
                        <td className="py-2">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(transactionDetail.prescription.totalAmount ?? 0)}</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">Thành tiền</td>
                        <td className="py-2 font-semibold text-emerald-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(transactionDetail.prescription.finalAmount ?? transactionDetail.prescription.totalAmount ?? 0)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Drugs List */}
                  <div className="mt-4">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 2, fontSize: '0.8rem' }}>Danh sách thuốc</Typography>
                    <div className="overflow-x-auto">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f9fafb' }}>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Tên thuốc</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }} align="center">SL</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }} align="right">Đơn giá</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }} align="right">Thành tiền</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.75rem' }}>Ghi chú</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const drugs = transactionDetail.prescription.drugs;
                            if (Array.isArray(drugs) && drugs.length > 0) {
                              return drugs.map((dd, i) => {
                                const unitPrice = dd.drugPrice ?? 0;
                                const lineTotal = dd.lineTotal ?? (unitPrice * (dd.quantity ?? 0));
                                return (
                                  <TableRow key={i} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{String(dd.drugName ?? dd.drugId ?? '-')}{dd.priceUnit ? ` (${dd.priceUnit})` : ''}</TableCell>
                                    <TableCell align="center" sx={{ fontSize: '0.8rem' }}>{String(dd.quantity ?? '-')}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{new Intl.NumberFormat('vi-VN').format(unitPrice)} đ</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>{new Intl.NumberFormat('vi-VN').format(lineTotal)} đ</TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem', color: '#6b7280' }}>{String(dd.note ?? '-')}</TableCell>
                                  </TableRow>
                                );
                              });
                            }
                            return (
                              <TableRow>
                                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3, color: '#9ca3af', fontSize: '0.8rem' }}>Không có thuốc</TableCell>
                              </TableRow>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#9ca3af' }}>Không có dữ liệu chi tiết.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #e5e7eb' }}>
          <Button 
            onClick={() => transactionDetail && printTransactionInvoice(transactionDetail)} 
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none' }}
          >
            In hóa đơn
          </Button>
          <Button 
            onClick={() => transactionDetail && exportTransactionInvoicePdf(transactionDetail)} 
            variant="outlined"
            disabled={exportingInvoicePdf}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            {exportingInvoicePdf ? 'Đang xuất...' : 'Xuất PDF'}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setTransactionDetailOpen(false)} variant="outlined" sx={{ textTransform: 'none' }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} fullWidth maxWidth="sm" >
        <DialogTitle>Thanh toán cho lịch hẹn #{selectedAppointment?.id ?? ''}</DialogTitle>
        <DialogContent>
          <div className="space-y-3">
            <div className="border rounded p-3">
              <Typography variant="subtitle2">Chi tiết thanh toán</Typography>
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div className="text-gray-600">Khách hàng</div>
                <div>{selectedAppointment?.customerName || selectedAppointment?.customerUsername || '-'}</div>

                <div className="text-gray-600">Nha sĩ</div>
                <div>{selectedAppointment?.dentistName || '-'}</div>

                <div className="text-gray-600">Chi nhánh</div>
                <div>{selectedAppointment?.branchName || selectedAppointment?.branchAddress || '-'}</div>

                <div className="text-gray-600">Ngày hẹn</div>
                <div>{selectedAppointment?.scheduledTime ? new Date(selectedAppointment.scheduledTime).toLocaleString() : '-'}</div>

                <div className="text-gray-600">Dịch vụ</div>
                <div>{selectedAppointment?.serviceName || '-'}</div>

                <div className="text-gray-600">Thời lượng dịch vụ</div>
                <div>
                  {selectedAppointment?.serviceDurationMinutes 
                    ? `${selectedAppointment.serviceDurationMinutes} phút` 
                    : selectedAppointment?.serviceDuration 
                      ? `${selectedAppointment.serviceDuration} phút` 
                      : selectedAppointment?.estimatedMinutes 
                        ? `${selectedAppointment.estimatedMinutes} phút` 
                        : '-'}
                </div>

                <div className="text-gray-600">Giá dịch vụ</div>
                <div className="text-green-600 font-medium">
                  {selectedAppointment?.servicePrice 
                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedAppointment.servicePrice) 
                    : '-'}
                </div>

                {selectedAppointment?.serviceDiscountPercent != null && selectedAppointment.serviceDiscountPercent > 0 ? (
                  <>
                    <div className="text-gray-600">Giảm giá</div>
                    <div className="text-amber-600 font-medium">{selectedAppointment.serviceDiscountPercent}%</div>
                  </>
                ) : null}

                <div className="text-gray-600">Tổng tiền dịch vụ</div>
                <div className="text-emerald-600 font-bold">
                  {selectedAppointment?.serviceTotalPrice 
                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedAppointment.serviceTotalPrice) 
                    : selectedAppointment?.servicePrice 
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedAppointment.servicePrice) 
                      : '-'}
                </div>
              </div>
            </div>

            {/* Prescription breakdown (if any) */}
            {selectedPrescription ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2">Đơn thuốc</Typography>
                  <Typography variant="body2" className="mb-2">Bệnh nhân: {selectedPrescription.patient?.fullName || selectedPrescription.patient?.username || selectedPrescription.patientName}</Typography>
                  <div className="overflow-x-auto">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tên</TableCell>
                          <TableCell>Số lượng</TableCell>
                          <TableCell>Đơn giá</TableCell>
                          <TableCell>Thành tiền</TableCell>
                          <TableCell>Ghi chú</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPrescription.drugs && selectedPrescription.drugs.length > 0 ? (
                          selectedPrescription.drugs.map((d, i) => (
                            <TableRow key={i}>
                              <TableCell>{d.drugName || d.drugId}{d.priceUnit ? ` (${d.priceUnit})` : ''}</TableCell>
                              <TableCell>{d.quantity}</TableCell>
                              <TableCell>{(d.drugPrice ?? 0).toLocaleString('vi-VN')} đ</TableCell>
                              <TableCell>{(d.lineTotal ?? (d.drugPrice ?? 0) * (d.quantity ?? 0)).toLocaleString('vi-VN')} đ</TableCell>
                              <TableCell>{d.note || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5}>Không có thuốc</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-3 text-sm">
                    <div className="flex justify-between"><div className="text-gray-600">Tổng đơn thuốc</div><div>{(selectedPrescription.totalAmount ?? 0).toLocaleString('vi-VN')} đ</div></div>
                    <div className="flex justify-between"><div className="text-gray-600">Giảm giá</div><div>{(selectedPrescription.discountAmount ?? 0).toLocaleString('vi-VN')} đ</div></div>
                    <div className="flex justify-between font-bold mt-2"><div>Tổng sau giảm (Đơn thuốc)</div><div>{(selectedPrescription.finalAmount ?? selectedPrescription.totalAmount ?? 0).toLocaleString('vi-VN')} đ</div></div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Payment totals */}
            <div className="border rounded p-3 bg-gradient-to-r from-blue-50 to-indigo-50">
              <Typography variant="subtitle2" className="font-bold">Tóm tắt thanh toán</Typography>
              <div className="mt-2 text-sm">
                <div className="flex justify-between">
                  <div className="text-gray-600">Giá dịch vụ</div>
                  <div>
                    {/* Chỉ lấy từ appointment response, không lấy từ Service API */}
                    {selectedAppointment?.serviceTotalPrice 
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedAppointment.serviceTotalPrice)
                      : selectedAppointment?.servicePrice 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedAppointment.servicePrice)
                        : '-'}
                  </div>
                </div>
                <div className="flex justify-between"><div className="text-gray-600">Tổng đơn thuốc</div><div>{(selectedPrescription?.finalAmount ?? selectedPrescription?.totalAmount ?? 0).toLocaleString('vi-VN')} đ</div></div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg"><div>TỔNG THANH TOÁN</div><div className="text-green-600">{Number(payAmount).toLocaleString('vi-VN')} đ</div></div>
              </div>
              <Typography variant="caption" className="text-gray-500 block mt-2">Bạn sẽ được chuyển sang trang VNPAY để hoàn tất thanh toán.</Typography>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentOpen(false)} disabled={payLoading}>Hủy</Button>
          <Button variant="outlined" onClick={() => { setPaymentOpen(false); setInvoiceOpen(true); }} disabled={payLoading}>Xem hóa đơn</Button>
          <Button variant="outlined" onClick={handleCreateCash} disabled={payLoading}>{payLoading ? 'Đang xử lý...' : 'Ghi nhận tiền mặt'}</Button>
          <Button color="primary" variant="contained" onClick={handleCreatePayment} disabled={payLoading}>{payLoading ? 'Đang tạo...' : 'Thanh toán VNPay'}</Button>
        </DialogActions>
      </Dialog>

      {/* Invoice view dialog */}
      <Dialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Hóa đơn thanh toán</DialogTitle>
        <DialogContent dividers>
          <div dangerouslySetInnerHTML={{ __html: buildPaymentInvoiceHtml() }} style={{ paddingTop: '12px' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceOpen(false)}>Đóng</Button>
          <Button variant="outlined" onClick={printInvoice}>In hóa đơn</Button>
          <Button variant="outlined" disabled={exportingInvoicePdf} onClick={exportInvoicePdf}>
            {exportingInvoicePdf ? 'Đang xuất...' : 'Xuất PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentList;
