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
import { ServiceAPI } from '../../services/service';
import type { ServiceItem } from '../../services/service';
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

  const [presDialogOpen, setPresDialogOpen] = useState(false);
  const [servicePriceMap, setServicePriceMap] = useState<Record<number, number>>({});
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
    loadData();
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
  const independentPrescriptions = prescriptionsList.filter(p => !p.appointmentId).filter(p => {
    const matched = matchesSearchText(p.patientName) || (searchTerm ? String(p.id).includes(searchTerm) : false);
    const created = parseDate((p as unknown as Record<string, unknown>)['createdAt'] as string | undefined);
    const fromDateParsed = dateFrom ? parseDate(dateFrom) : null;
    const toDateParsed = dateTo ? parseDate(dateTo) : null;
    const fromOk = fromDateParsed ? (created ? created >= fromDateParsed : false) : true;
    const toOk = toDateParsed ? (created ? created <= toDateParsed : false) : true;
    return matched && fromOk && toOk;
  });
  const presCount = independentPrescriptions.length;
  const displayedPrescriptions = independentPrescriptions.slice(prescriptionsPage * prescriptionsRowsPerPage, prescriptionsPage * prescriptionsRowsPerPage + prescriptionsRowsPerPage);

  // Transactions filtered by transactionId/appointment/prescription/customer and transactionTime/paymentDate range
  const txFiltered = (transactions || []).filter(t => {
    const txId = String(t.transactionId ?? (t as unknown as Record<string, unknown>)['transactionNo'] ?? '');
    const apptId = t.appointment ? String((t.appointment as unknown as Record<string, unknown>)['id'] ?? '') : String(t.appointmentId ?? '');
    const presId = t.prescription ? String((t.prescription as unknown as Record<string, unknown>)['id'] ?? '') : String(t.prescriptionId ?? '');
    const customerName = t.appointment ? String((t.appointment as unknown as Record<string, unknown>)['customerUsername'] ?? (t.appointment as unknown as Record<string, unknown>)['customerName'] ?? '') : '';
    const patientName = t.prescription ? String((t.prescription as unknown as Record<string, unknown>)['patientName'] ?? '') : '';
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

      // load services to get price mapping
      try {
        type MaybeSvcResp = { success?: boolean; message?: string; data?: ServiceItem[] };
        const svcRes = (await ServiceAPI.getServices()) as unknown as MaybeSvcResp;
        const svcList = svcRes?.data ?? [];
        const svcMap: Record<number, number> = {};
        (svcList as ServiceItem[]).forEach(s => { if (s && s.id) svcMap[s.id] = Number(s.price || 0); });
        setServicePriceMap(svcMap);
      } catch (err) {
        console.warn('Failed to load services', err);
      }

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
          // some prescriptions may include appointmentId
          // map by appointmentId so we can quickly find
          // only first prescription per appointment is considered
          // (backend may have only one)
          const apptId = (p as unknown as { appointmentId?: number }).appointmentId;
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
    // compute amount from service price + prescription finalAmount (if any)
    let svcPrice = appt.serviceId ? (servicePriceMap[Number(appt.serviceId)] ?? 0) : 0;
    // If we don't have a price in the map, try refreshing services from API
    if (svcPrice === 0 && appt.serviceId) {
      try {
        type MaybeSvcResp = { success?: boolean; message?: string; data?: ServiceItem[] };
        const svcRes = (await ServiceAPI.getServices()) as unknown as MaybeSvcResp;
        const svcList = svcRes?.data ?? [];
        const svcMap: Record<number, number> = {};
        (svcList as ServiceItem[]).forEach(s => { if (s && s.id) svcMap[s.id] = Number(s.price || 0); });
        setServicePriceMap(prev => ({ ...prev, ...svcMap }));
        svcPrice = svcMap[Number(appt.serviceId)] ?? svcPrice;
      } catch (err) {
        console.warn('Failed to refresh services for price lookup', err);
      }
    }

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
          const setRes = await AppointmentAPI.setStatus(appointmentId, 'complete');
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
          const setRes = await AppointmentAPI.setStatus(appointmentId, 'complete');
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
      // If the passed tx already contains appointment or prescription data, prefer it (API now returns full nested objects)
      const hasAppt = tx.appointment && Object.keys(tx.appointment).length > 0;
      const hasPres = tx.prescription && Object.keys(tx.prescription).length > 0;
      if (hasAppt || hasPres) {
        setTransactionDetail(tx);
        setTransactionDetailOpen(true);
        return;
      }

      const id = tx.id ?? tx.paymentId ?? tx.transactionId;
      const data = await PaymentAPI.getTransactionById(Number(id));

      // backend may return wrapper { success, data } or direct object
      let resolved: unknown = data;
      if (resolved && typeof resolved === 'object' && 'data' in (resolved as Record<string, unknown>)) resolved = (resolved as Record<string, unknown>)['data'];

      // if still nothing useful, fallback to the original tx
      if (!resolved || (typeof resolved === 'object' && 'success' in resolved && resolved.success === false)) {
        setTransactionDetail(tx);
      } else {
        // if API returned an array for some reason, pick first
        if (Array.isArray(resolved)) {
          setTransactionDetail(resolved[0] as Transaction);
        } else {
          setTransactionDetail(resolved as Transaction);
        }
      }

      setTransactionDetailOpen(true);
    } catch (err) {
      console.error(err);
      alert('Không thể tải chi tiết giao dịch');
    }
  }

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
                                <Button size="small" variant="text" onClick={() => openPrescription(a)}>Đơn thuốc</Button>
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
                                  <TableCell>{p.patientName ?? '-'}</TableCell>
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
              <Typography variant="subtitle1">Bệnh nhân: {selectedPrescription.patientName}</Typography>
              <Typography variant="body2">Tổng tiền: {selectedPrescription.totalAmount ?? '-'} • Thành tiền: {selectedPrescription.finalAmount ?? '-'}</Typography>
              <div className="mt-4">
                <Typography variant="subtitle2">Danh sách thuốc</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên</TableCell>
                      <TableCell>Số lượng</TableCell>
                      <TableCell>Ghi chú</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPrescription.drugs && selectedPrescription.drugs.length > 0 ? (
                      selectedPrescription.drugs.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell>{d.drugName || d.drugId}</TableCell>
                          <TableCell>{d.quantity}</TableCell>
                          <TableCell>{d.note || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3}>Không có thuốc</TableCell>
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
      <Dialog open={transactionDetailOpen} onClose={() => setTransactionDetailOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold' }}>
           Chi tiết giao dịch #{transactionDetail?.id ?? transactionDetail?.paymentId ?? ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {transactionDetail ? (
            <div className="space-y-4">
              {/* Transaction Summary Card */}
              <Card sx={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}> Thông tin thanh toán</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ px: 2, py: 1, backgroundColor: transactionDetail.status === 'SUCCESS' ? '#10b981' : transactionDetail.status === 'PENDING' ? '#f59e0b' : '#ef4444', color: 'white', borderRadius: 1, fontSize: '0.875rem', fontWeight: 'bold' }}>
                        {transactionDetail.status ?? '-'}
                      </Box>
                      <Box sx={{ px: 2, py: 1, backgroundColor: '#6366f1', color: 'white', borderRadius: 1, fontSize: '0.875rem', fontWeight: 'bold' }}>
                        {transactionDetail.paymentMethod ?? (transactionDetail.bankCode ? 'VNPAY' : 'CASH')}
                      </Box>
                    </Box>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="border-l-4 border-blue-500 pl-3">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>ID GIAO DỊCH</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>{transactionDetail.id ?? transactionDetail.paymentId ?? '-'}</Typography>
                      </div>
                      <div className="border-l-4 border-purple-500 pl-3">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>MÃ GIAO DỊCH</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>{transactionDetail.transactionId ?? transactionDetail.transactionNo ?? '-'}</Typography>
                      </div>
                      <div className="border-l-4 border-green-500 pl-3">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>THỜI GIAN THANH TOÁN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>{transactionDetail.transactionTime ? new Date(transactionDetail.transactionTime).toLocaleString('vi-VN') : (transactionDetail.paymentDate ? new Date(transactionDetail.paymentDate).toLocaleString('vi-VN') : '-')}</Typography>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="border-l-4 border-pink-500 pl-3">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>SỐ TIỀN</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: '#d97706' }}>{(transactionDetail.amount ?? 0).toLocaleString('vi-VN')} đ</Typography>
                      </div>
                      {transactionDetail.bankCode && (
                        <div className="border-l-4 border-indigo-500 pl-3">
                          <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>NGÂN HÀNG</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>{transactionDetail.bankCode}</Typography>
                        </div>
                      )}
                      {((transactionDetail as unknown as Record<string, unknown>)['note'] ?? undefined) && (
                        <div className="border-l-4 border-yellow-500 pl-3">
                          <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>GHI CHÚ</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>{String(((transactionDetail as unknown as Record<string, unknown>)['note']) ?? '-')}</Typography>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appointment Info Card */}
              {transactionDetail.appointment ? (
                <Card sx={{ border: '1px solid #e5e7eb' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                       Thông tin lịch hẹn
                    </Typography>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>ID LỊCH HẸN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>#{transactionDetail.appointment.id}</Typography>
                      </div>
                      <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>BỆNH NHÂN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                          {String((((transactionDetail.appointment as unknown) as Record<string, unknown>)['customerUsername']) ?? (((transactionDetail.appointment as unknown) as Record<string, unknown>)['customerName']) ?? '-')}
                        </Typography>
                      </div>
                      <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>DỊCH VỤ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>{transactionDetail.appointment.serviceName || '-'}</Typography>
                      </div>
                      <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>NHA SĨ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                          {String((transactionDetail.appointment.dentistName ?? (((transactionDetail.appointment as unknown) as Record<string, unknown>)['dentistUsername']) ?? '-'))}
                        </Typography>
                      </div>
                      <div className="bg-pink-50 p-3 rounded border-l-4 border-pink-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>NGÀY HẸN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                          {transactionDetail.appointment.scheduledTime ? new Date(transactionDetail.appointment.scheduledTime).toLocaleString('vi-VN') : '-'}
                        </Typography>
                      </div>
                      <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>TRẠNG THÁI</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>{transactionDetail.appointment.status ?? '-'}</Typography>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Prescription Info Card */}
              {transactionDetail.prescription ? (
                <Card sx={{ border: '1px solid #e5e7eb' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                       Đơn thuốc
                    </Typography>

                    {/* Prescription Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-cyan-50 p-3 rounded border-l-4 border-cyan-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>ID ĐƠN THUỐC</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>{transactionDetail.prescription.id ?? '-'}</Typography>
                      </div>
                      <div className="bg-amber-50 p-3 rounded border-l-4 border-amber-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>BỆNH NHÂN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                          {String(transactionDetail.prescription.patientName ?? (((transactionDetail.appointment as unknown) as Record<string, unknown>)['customerUsername']) ?? '-')}
                        </Typography>
                      </div>
                      <div className="bg-teal-50 p-3 rounded border-l-4 border-teal-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>BÁC SĨ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                          {String(transactionDetail.prescription.doctorName ?? (((transactionDetail.appointment as unknown) as Record<string, unknown>)['dentistName']) ?? '-')}
                        </Typography>
                      </div>
                      <div className="bg-lime-50 p-3 rounded border-l-4 border-lime-500">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>TỔNG TIỀN</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5, color: '#7c3aed' }}>
                          {(transactionDetail.prescription.totalAmount ?? 0).toLocaleString('vi-VN')} đ
                        </Typography>
                      </div>
                      <div className="bg-violet-50 p-3 rounded border-l-4 border-violet-500 md:col-span-2">
                        <Typography variant="caption" sx={{ color: 'gray', fontWeight: 'bold' }}>THÀNH TIỀN (SAU GIẢM)</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, color: '#059669' }}>
                          {(transactionDetail.prescription.finalAmount ?? transactionDetail.prescription.totalAmount ?? 0).toLocaleString('vi-VN')} đ
                        </Typography>
                      </div>
                    </div>

                    {/* Drugs Table */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>🔍 Danh sách thuốc</Typography>
                    <div className="overflow-x-auto">
                      <Table size="small" sx={{ backgroundColor: '#fafafa' }}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f3f4f6' }}>
                            <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Tên thuốc</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Số lượng</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Ghi chú</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const drugs = (((transactionDetail.prescription as unknown) as Record<string, unknown>)['drugs']) as unknown;
                            if (Array.isArray(drugs) && drugs.length > 0) {
                              return (drugs as unknown[]).map((dd, i) => {
                                const rec = dd as Record<string, unknown>;
                                return (
                                  <TableRow key={i} sx={{ '&:hover': { backgroundColor: '#f0fdf4' } }}>
                                    <TableCell>{String(rec['drugName'] ?? rec['drugId'] ?? '-')}</TableCell>
                                    <TableCell align="center">{String(rec['quantity'] ?? '-')}</TableCell>
                                    <TableCell>{String(rec['note'] ?? '-')}</TableCell>
                                  </TableRow>
                                );
                              });
                            }
                            return (
                              <TableRow>
                                <TableCell colSpan={3} sx={{ textAlign: 'center', py: 2, color: '#9ca3af' }}>Không có thuốc</TableCell>
                              </TableRow>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography sx={{ color: '#9ca3af' }}>Không có dữ liệu chi tiết.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#f9fafb' }}>
          <Button onClick={() => setTransactionDetailOpen(false)} variant="contained" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
            ✕ Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} fullWidth maxWidth="sm">
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
              </div>
            </div>

            {/* Prescription breakdown (if any) */}
            {selectedPrescription ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2">Đơn thuốc</Typography>
                  <Typography variant="body2" className="mb-2">Bệnh nhân: {selectedPrescription.patientName}</Typography>
                  <div className="overflow-x-auto">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tên</TableCell>
                          <TableCell>Số lượng</TableCell>
                          <TableCell>Ghi chú</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPrescription.drugs && selectedPrescription.drugs.length > 0 ? (
                          selectedPrescription.drugs.map((d, i) => (
                            <TableRow key={i}>
                              <TableCell>{d.drugName || d.drugId}</TableCell>
                              <TableCell>{d.quantity}</TableCell>
                              <TableCell>{d.note || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3}>Không có thuốc</TableCell>
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
            <div className="border rounded p-3">
              <Typography variant="subtitle2">Tóm tắt thanh toán</Typography>
              <div className="mt-2 text-sm">
                <div className="flex justify-between"><div className="text-gray-600">Giá dịch vụ</div><div>{(selectedAppointment?.serviceId ? (servicePriceMap[Number(selectedAppointment.serviceId)] ?? 0) : 0).toLocaleString('vi-VN')} đ</div></div>
                <div className="flex justify-between"><div className="text-gray-600">Tổng đơn thuốc</div><div>{(selectedPrescription?.finalAmount ?? selectedPrescription?.totalAmount ?? 0).toLocaleString('vi-VN')} đ</div></div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold"><div>TỔNG THANH TOÁN</div><div>{Number(payAmount).toLocaleString('vi-VN')} đ</div></div>
              </div>
              <Typography variant="caption" className="text-gray-500 block mt-2">Bạn sẽ được chuyển sang trang VNPAY để hoàn tất thanh toán.</Typography>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentOpen(false)} disabled={payLoading}>Hủy</Button>
          <Button variant="outlined" onClick={handleCreateCash} disabled={payLoading}>{payLoading ? 'Đang xử lý...' : 'Ghi nhận tiền mặt'}</Button>
          <Button color="primary" variant="contained" onClick={handleCreatePayment} disabled={payLoading}>{payLoading ? 'Đang tạo...' : 'Thanh toán VNPay'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentList;
