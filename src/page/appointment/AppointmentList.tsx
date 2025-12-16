import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Chip,
  Stack,
  Popover,
  useTheme,
  useMediaQuery,
  Grid
} from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ReplayIcon from '@mui/icons-material/Replay';
import SendIcon from '@mui/icons-material/Send';
import Tooltip from '@mui/material/Tooltip';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { AppointmentAPI, type AppointmentItem } from '../../services/appointments';
import type { ApiResponse } from '../../services/user';
import { BranchAPI, type Branch } from '../../services/branches';
import { DentistAPI, type Dentist } from '../../services/dentist';
import { ServiceAPI, type ServiceItem } from '../../services/service';
import { useAppointmentsRealtime } from '@/hooks/useAppointmentsRealtime';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast, ToastContainer } from 'react-toastify';

// Helper function to normalize status string for consistency
const normalizeStatus = (status: string | undefined | null): string => {
  if (!status) return 'UNKNOWN';
  const s = status.toString().toUpperCase().trim();
  // Map variations to standard status
  if (s === 'CONFIRM' || s === 'CONFIRMED') return 'CONFIRMED';
  if (s === 'PEND' || s === 'PENDING') return 'PENDING';
  if (s === 'COMPLET' || s === 'COMPLETE' || s === 'COMPLETED') return 'COMPLETE';
  if (s === 'CANCEL' || s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED';
  return s;
};

export default function AppointmentList() {
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'customer' | 'dentist' | 'time'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // date filter state (YYYY-MM-DD) and picker UI
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [pickerValue, setPickerValue] = useState<Date | null>(null);
  // quick range filter: all / today / week / month
  const [rangeFilter, setRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<AppointmentItem | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTime, setEditTime] = useState('');
  // Cancel confirmation
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  // Detail view dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<AppointmentItem | null>(null);
  // lookup data
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  // edit selects state
  const [editDentistId, setEditDentistId] = useState<number | undefined>(undefined);
  const [editAssistantId, setEditAssistantId] = useState<number | undefined>(undefined);
  const [editBranchId, setEditBranchId] = useState<number | undefined>(undefined);
  const [editServiceId, setEditServiceId] = useState<number | undefined>(undefined);
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState<number | undefined>(undefined);
  const [editStatus, setEditStatus] = useState<string | undefined>(undefined);
  // track which appointment ids are currently having a reminder sent
  const [sendingReminder, setSendingReminder] = useState<Record<number, boolean>>({});
  // loading states for actions
  const [editLoading, setEditLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    AppointmentAPI.getAll()
      .then((res: ApiResponse<AppointmentItem[]>) => {
        if (!mounted) return;
        if (res && res.success) setItems(sortByCreatedAtDesc(res.data || []));
        else setError(res.message || 'Không tải được danh sách');
      })
      .catch((e) => { if (mounted) setError((e as Error)?.message || 'Lỗi mạng'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  // Integrate realtime updates: the hook will fetch initial data and push live updates.
  const { appointments: realtimeAppointments, connected } = useAppointmentsRealtime({});

  useEffect(() => {
    if (Array.isArray(realtimeAppointments) && realtimeAppointments.length > 0) {
      setItems(sortByCreatedAtDesc(realtimeAppointments as AppointmentItem[]));
    }
  }, [realtimeAppointments]);

  // load lookup lists
  useEffect(() => {
    (async () => {
      try {
        const dRes = await DentistAPI.getDentists();
        if (dRes && dRes.success) setDentists(dRes.data || []);
      } catch {
        // ignore
      }
      try {
        const bRes = await BranchAPI.getBranches();
        if (bRes && bRes.success) setBranches(bRes.data || []);
      } catch {
        // ignore
      }
      try {
        const sRes = await ServiceAPI.getServices();
        if (sRes && sRes.success) setServices(sRes.data || []);
      } catch {
        // ignore
      }
    })();
  }, []);
  // responsive helper: render compact list on small screens
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // helper: sort by createdAt descending (newest first)
  const sortByCreatedAtDesc = (arr: AppointmentItem[] = []) => {
    return arr.slice().sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  };

  const filtered = useMemo(() => {
    // compute range bounds if rangeFilter is active
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;
    if (rangeFilter !== 'all') {
      const now = new Date();
      if (rangeFilter === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        rangeStart = start.getTime(); rangeEnd = end.getTime();
      } else if (rangeFilter === 'week') {
        // week starting Monday
        const day = now.getDay(); // 0 (Sun) - 6
        const diffToMon = (day + 6) % 7; // days since Monday
        const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon, 0, 0, 0, 0);
        const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6, 23, 59, 59, 999);
        rangeStart = mon.getTime(); rangeEnd = sun.getTime();
      } else if (rangeFilter === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        rangeStart = start.getTime(); rangeEnd = end.getTime();
      }
    }
    const q = search.trim().toLowerCase();
    const matchesTime = (it: AppointmentItem) => {
      if (!it.scheduledTime) return false;
      try {
        const dt = new Date(it.scheduledTime);
        if (Number.isNaN(dt.getTime())) return false;
        // allow searching by date or time substrings
        const full = dt.toLocaleString().toLowerCase();
        const timeOnly = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
        const iso = it.scheduledTime.toLowerCase();
        return full.includes(q) || timeOnly.includes(q) || iso.includes(q);
      } catch {
        return it.scheduledTime.toLowerCase().includes(q);
      }
    };

    return items.filter(it => {
      // apply range filter (if any)
      if (rangeFilter !== 'all') {
        if (!it.scheduledTime) return false;
        try {
          const ts = new Date(it.scheduledTime).getTime();
          if (Number.isNaN(ts)) return false;
          if (rangeStart !== null && rangeEnd !== null) {
            if (ts < rangeStart || ts > rangeEnd) return false;
          }
        } catch {
          return false;
        }
      }
      if (statusFilter && normalizeStatus(it.status) !== statusFilter) return false;
      // If there's no free-text query, normally we return all items.
      // However when searchBy === 'time' we may still want to apply a dateFilter
      // (picker) even when the search input is empty — so don't early-return
      // in that case.
      if (!q) {
        if (searchBy !== 'time') return true;
        // else fall through to time handling below (it will check dateFilter)
      }

      if (searchBy === 'customer') {
        const hay = `${it.customerUsername ?? ''} ${it.customerName ?? ''} ${it.customerEmail ?? ''}`.toLowerCase();
        return hay.includes(q);
      }
      if (searchBy === 'dentist') {
        const hay = `${it.dentistName ?? ''} ${it.dentistId ?? ''}`.toString().toLowerCase();
        return hay.includes(q);
      }
      if (searchBy === 'time') {
        // If a dateFilter is set use that to match appointment date (YYYY-MM-DD)
        if (dateFilter) {
          if (!it.scheduledTime) return false;
          try {
            const d = new Date(it.scheduledTime);
            if (Number.isNaN(d.getTime())) return false;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}` === dateFilter;
          } catch { return false; }
        }
        return matchesTime(it);
      }

      // default: search across common fields
      const hay = `${it.label ?? ''} ${it.customerUsername ?? ''} ${it.customerName ?? ''} ${it.customerEmail ?? ''} ${it.serviceName ?? ''} ${it.dentistName ?? ''} ${it.scheduledTime ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, statusFilter, searchBy, dateFilter, rangeFilter]);

  // ticking state to update NEW/blink status as time passes
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <CircularProgress />
    </div>);
  if (error) return (<Box sx={{ p: 3 }}><Typography color="error">{error}</Typography></Box>);

  const handleChangePage = (_: unknown, newPage: number) => { setPage(newPage); };
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const openEdit = (it: AppointmentItem) => {
    // Prevent editing when appointment is already completed
    const _s0 = normalizeStatus(it.status);
    if (_s0 === 'COMPLETE') {
      alert('Không thể chỉnh sửa lịch hẹn đã hoàn thành.');
      return;
    }
    setEditItem(it);
    setEditNotes(it.notes ?? '');
    setEditDentistId(it.dentistRefId ?? it.dentistId ?? undefined);
    setEditAssistantId(it.assistantUserId ?? it.assistantId ?? undefined);
    setEditBranchId(it.branchId ?? undefined);
    setEditServiceId(it.serviceId ?? undefined);
    setEditEstimatedMinutes(it.estimatedMinutes ?? it.serviceDuration ?? undefined);
    setEditStatus(it.status ?? undefined);
    // convert ISO to yyyy-MM-ddTHH:MM for input
    if (it.scheduledTime) {
      const d = new Date(it.scheduledTime);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const val = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setEditTime(val);
    } else setEditTime('');
    setEditOpen(true);
  };

  const closeEdit = () => { setEditOpen(false); setEditItem(null); };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const payload: Partial<AppointmentItem> = { notes: editNotes };
      if (editTime) {
        // convert back to UTC ISO
        const iso = new Date(editTime).toISOString();
        payload.scheduledTime = iso;
      }
      if (editDentistId !== undefined) payload.dentistRefId = editDentistId;
      if (editAssistantId !== undefined) payload.assistantId = editAssistantId;
      if (editBranchId !== undefined) payload.branchId = editBranchId;
      if (editServiceId !== undefined) payload.serviceId = editServiceId;
      if (typeof editEstimatedMinutes === 'number') payload.estimatedMinutes = editEstimatedMinutes;
      if (editStatus !== undefined) payload.status = editStatus;
      const res = await AppointmentAPI.update(editItem.id, payload);
      if (res && res.success) {
        // Use response data to ensure all fields are properly updated from server
        const updatedItem = res.data as AppointmentItem;
        if (updatedItem) {
          setItems(prevItems =>
            prevItems.map(it =>
              it.id === editItem.id ? updatedItem : it
            )
          );
        } else {
          // Fallback if response doesn't include updated item
          setItems(prevItems =>
            prevItems.map(it =>
              it.id === editItem.id ? { ...it, ...payload } : it
            )
          );
        }
        toast.success('Cập nhật lịch hẹn thành công');
        closeEdit();
      } else {
        toast.error(res.message || 'Cập nhật thất bại');
      }
    } catch (e) {
      toast.error((e as Error)?.message || 'Cập nhật thất bại');
    } finally {
      setEditLoading(false);
    }
  };

  const openDetailView = (it: AppointmentItem) => {
    setDetailItem(it);
    setDetailOpen(true);
  };

  const closeDetailView = () => {
    setDetailOpen(false);
    setDetailItem(null);
  };

  const handleCancelAppointment = async (it: AppointmentItem) => {
    // Prevent cancelling/deleting when appointment is completed
    const _s1 = normalizeStatus(it.status);
    if (_s1 === 'COMPLETE') {
      alert('Không thể hủy lịch hẹn đã hoàn thành.');
      return;
    }
    setCancelTargetId(it.id);
    setCancelConfirmOpen(true);
  };

  const doCancel = async () => {
    if (!cancelTargetId) return;
    setCancelLoading(true);
    try {
      const res = await AppointmentAPI.cancel(cancelTargetId);
      if (res && res.success) {
        // Update local state instead of refreshing entire list
        setItems(prevItems =>
          prevItems.filter(it => it.id !== cancelTargetId)
        );
        toast.success('Hủy lịch hẹn thành công');
        setCancelConfirmOpen(false);
      } else {
        toast.error(res.message || 'Hủy thất bại');
      }
    } catch (e) {
      toast.error((e as Error)?.message || 'Hủy thất bại');
    } finally {
      setCancelTargetId(null);
      setCancelLoading(false);
    }
  };

  const handleChangeStatus = async (id: number, status: string) => {
    setStatusLoading(prev => ({ ...prev, [id]: true }));
    try {
      const normalizedStatus = normalizeStatus(status);
      const res = await AppointmentAPI.setStatus(id, normalizedStatus);
      if (res && res.success) {
        // Use response data to ensure all fields are properly updated from server
        const updatedItem = res.data as AppointmentItem;
        if (updatedItem) {
          // Normalize status in response to ensure consistency
          if (updatedItem.status) {
            updatedItem.status = normalizeStatus(updatedItem.status);
          }
          setItems(prevItems =>
            prevItems.map(it =>
              it.id === id ? updatedItem : it
            )
          );
        } else {
          // Fallback if response doesn't include updated item
          setItems(prevItems =>
            prevItems.map(it =>
              it.id === id ? { ...it, status: normalizedStatus } : it
            )
          );
        }
        toast.success('Cập nhật trạng thái thành công');
      } else {
        toast.error(res.message || 'Cập nhật trạng thái thất bại');
      }
    } catch (e) {
      toast.error((e as Error)?.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setStatusLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSendReminder = async (it: AppointmentItem) => {
    const id = it.id;
    const to = it.customerEmail ?? '';
    if (!to) {
      toast.warn('Không có email khách hàng để gửi nhắc.');
      return;
    }
    setSendingReminder(prev => ({ ...prev, [id]: true }));
    try {
      const payload = { to, message: 'Reminder sent using booking-clinic template' };
      const res = await AppointmentAPI.remind(id, payload, true);
      if (res && res.success) {
        toast.success('Đã gửi nhắc thành công');
      } else {
        toast.error(res?.message || 'Không thể thực hiện thao tác');
      }
    } catch (e) {
      toast.error((e as Error)?.message || 'Gửi nhắc thất bại');
    } finally {
      setSendingReminder(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl">
      <ToastContainer />
      <CardContent>
           {/* Header Section */}
        <div className="bg-gradient-to-r mb-5 from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản lý</p>
              <Typography variant="h5" fontWeight="bold" className="text-white">Danh sách lịch hẹn</Typography>
            </div>
          </div>
        </div>
        {/* CSS for pulse animation used by new rows (first 1 minute) */}
        <style>{`@keyframes pulseGreen { 0% { box-shadow: 0 0 0 0 rgba(76,175,80,0); } 50% { box-shadow: 0 0 10px 6px rgba(76,175,80,0.10); } 100% { box-shadow: 0 0 0 0 rgba(76,175,80,0); } }`}</style>

        <Paper variant="outlined" sx={{ p: 1, mb: 2, border: { xs: '1px solid rgba(0,0,0,0.08)', sm: 'none' } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Box sx={{ display: 'flex', gap: 2, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField sx={{ width: { xs: '100%', sm: 320 } }} size="small" placeholder="Tìm kiếm..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
              <FormControl size="small" sx={{ minWidth: 140, width: { xs: '48%', sm: 140 } }}>
                <InputLabel>Search by</InputLabel>
                <Select size="small" label="Search by" value={searchBy} onChange={(e) => { setSearchBy(e.target.value as 'all' | 'customer' | 'dentist' | 'time'); setPage(0); }}>
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="customer">Khách hàng</MenuItem>
                  <MenuItem value="dentist">Nha sĩ</MenuItem>
                  <MenuItem value="time">Thời gian</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160, width: { xs: '48%', sm: 160 } }}>
                <InputLabel>Trạng thái</InputLabel>
                <Select value={statusFilter} label="Trạng thái" onChange={(e) => { setStatusFilter(e.target.value as string); setPage(0); }}>
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="PENDING">PENDING</MenuItem>
                  <MenuItem value="CONFIRMED">CONFIRMED</MenuItem>
                  <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                  <MenuItem value="CANCELLED">CANCELLED</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {/* second row: date picker, quick filters and realtime chip */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: { xs: 1, sm: 0 }, flexWrap: 'wrap', ml: { xs: 0, sm: 'auto' } }}>
              {/* Date filter button (visible when searching by time) */}
              {searchBy === 'time' && (
                <>
                  <Button sx={{ width: { xs: '100%', sm: 'auto' } }} size="small" variant={dateFilter ? 'contained' : 'outlined'} startIcon={<CalendarTodayIcon />} onClick={(e) => setPickerAnchor(e.currentTarget)}>
                    {dateFilter ?? 'Chọn ngày'}
                  </Button>
                  <Popover
                    open={Boolean(pickerAnchor)}
                    anchorEl={pickerAnchor}
                    onClose={() => setPickerAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  >
                    <Box sx={{ p: 1 }}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <StaticDatePicker
                          displayStaticWrapperAs="desktop"
                          value={pickerValue ?? (dateFilter ? new Date(dateFilter) : new Date())}
                          onChange={(newVal) => {
                            if (!newVal) return;
                            const dateObj = newVal instanceof Date ? newVal : newVal.toDate();
                            const yyyy = dateObj.getFullYear();
                            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const dd = String(dateObj.getDate()).padStart(2, '0');
                            const str = `${yyyy}-${mm}-${dd}`;
                            setDateFilter(str);
                            setPickerValue(dateObj);
                            setPickerAnchor(null);
                          }}
                        />
                      </LocalizationProvider>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" onClick={() => { setDateFilter(null); setPickerValue(null); setPickerAnchor(null); }}>Xóa</Button>
                      </Box>
                    </Box>
                  </Popover>
                </>
              )}
              {/* Quick range filters: All / Today / Week / Month (ToggleButtonGroup for cleaner look) */}
              <ToggleButtonGroup
                size="small"
                value={rangeFilter}
                exclusive
                onChange={(_, v) => { if (v) { setRangeFilter(v); setDateFilter(null); setPickerValue(null); } }}
                sx={{ display: 'flex', gap: 1, alignItems: 'center', overflowX: 'auto', px: 0.5 }}
              >
                <ToggleButton value="all" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>Tất cả</ToggleButton>
                <ToggleButton value="today" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>Hôm nay</ToggleButton>
                <ToggleButton value="week" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>Tuần này</ToggleButton>
                <ToggleButton value="month" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>Tháng này</ToggleButton>
              </ToggleButtonGroup>
              {/* Realtime connection status */}
              <Chip label={connected ? 'Realtime: ON' : 'Realtime: OFF'} color={connected ? 'success' : 'default'} size="small" sx={{ ml: 0.5 }} />
            </Box>
          </Box>
        </Paper>

        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">Không có lịch hẹn nào khớp với bộ lọc hiện tại.</Typography>
          </Box>
        ) : (
          // responsive: show cards on small screens, table on larger screens
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {paged.map(it => (
                <Card key={it.id} variant="outlined" sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => openDetailView(it)}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 40, height: 40, fontSize: 14 }}>{(it.customerUsername || it.customerName || it.customerEmail || '').charAt(0).toUpperCase()}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{it.label ?? ''}</Typography>
                        <Typography variant="body2">{it.customerName ?? it.customerUsername ?? ''}</Typography>
                        <Typography variant="caption" color="text.secondary">{it.scheduledTime ? new Date(it.scheduledTime).toLocaleString() : ''}</Typography>
                      </Box>
                      <Box>
                        {(() => {
                          const ns = normalizeStatus(it.status);
                          const s = ns.toLowerCase();
                          const colorVar: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = s === 'confirmed' ? 'success' : s === 'pending' ? 'warning' : s === 'cancelled' ? 'default' : 'info';
                          return <Chip label={ns} size="small" color={colorVar} />;
                        })()}
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Typography variant="caption">Bác sĩ: <strong>{it.dentistName ?? it.dentistId ?? ''}</strong></Typography>
                      <Typography variant="caption">Chi nhánh: <strong>{it.branchName ?? it.branchId ?? ''}</strong></Typography>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Stack direction="row" spacing={0.5}>
                      {(() => {
                        const ns = normalizeStatus(it.status);
                        if (ns === 'PENDING') {
                          return (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleChangeStatus(it.id, 'CONFIRMED'); }} disabled={!!statusLoading[it.id]}>
                              {statusLoading[it.id] ? <CircularProgress size={16} /> : <CheckCircleOutlineIcon fontSize="small" color="success" />}
                            </IconButton>
                          );
                        }
                        if (ns === 'CONFIRMED') {
                          return (
                            <>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleChangeStatus(it.id, 'COMPLETE'); }} disabled={!!statusLoading[it.id]}>
                                {statusLoading[it.id] ? <CircularProgress size={16} /> : <DoneAllIcon fontSize="small" color="primary" />}
                              </IconButton>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleSendReminder(it); }} title={sendingReminder[it.id] ? 'Đang gửi...' : 'Gửi nhắc'} disabled={!!sendingReminder[it.id]}>
                                {sendingReminder[it.id] ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                              </IconButton>
                            </>
                          );
                        }
                        return null;
                      })()}
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(it); }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCancelAppointment(it); }}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                  </CardActions>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <TableContainer sx={{ minWidth: 800 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Label</TableCell>
                      <TableCell>Khách hàng</TableCell>
                      <TableCell>Dịch vụ</TableCell>
                      <TableCell>Bác sĩ</TableCell>
                      <TableCell>Phụ tá</TableCell>
                      <TableCell>Chi nhánh</TableCell>
                      <TableCell>Thời gian</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell align="right">Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paged.map((it) => {
                      const createdTs = it.createdAt ? new Date(it.createdAt).getTime() : NaN;
                      const ageMs = Number.isFinite(createdTs) ? now - createdTs : Infinity;
                      const isNew = Number.isFinite(createdTs) && ageMs <= 5 * 60 * 1000; // 5 minutes
                      const isBlinking = Number.isFinite(createdTs) && ageMs <= 1 * 60 * 1000; // 1 minute

                      return (
                        <TableRow
                          key={it.id}
                          hover
                          onClick={() => openDetailView(it)}
                          sx={{
                            cursor: 'pointer',
                            ...(isBlinking ? {
                              animation: 'pulseGreen 1s infinite',
                              borderRadius: 1,
                            } : {}),
                          }}
                        >
                          <TableCell>{it.id}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{it.label || ''}</Typography>
                              {isNew ? <Chip label="NEW" color="secondary" size="small" /> : null}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>{(it.customerUsername || it.customerName || it.customerEmail || '').charAt(0).toUpperCase()}</Avatar>
                              <Box>
                                <Typography variant="body2">{it.customerUsername ?? it.customerName ?? it.customerEmail ?? ''}</Typography>
                                <Typography variant="caption" color="text.secondary">{it.customerEmail ?? ''}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{it.serviceName ?? it.serviceId ?? ''}</Typography>
                            {it.estimatedMinutes ? <Typography variant="caption" color="text.secondary">{it.estimatedMinutes} phút</Typography> : null}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{it.dentistName ?? it.dentistId ?? ''}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{it.assistantName ?? it.assistantId ?? ''}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{it.branchName ?? it.branchId ?? ''}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{it.scheduledTime ? new Date(it.scheduledTime).toLocaleString() : ''}</Typography>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const normalized = normalizeStatus(it.status);
                              const s = normalized.toLowerCase();
                              const colorVar: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = s === 'confirmed' ? 'success' : s === 'pending' ? 'warning' : s === 'cancelled' ? 'default' : 'info';
                              return <Chip size="small" label={normalized} color={colorVar} />;
                            })()}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                              {(() => normalizeStatus(it.status) !== 'COMPLETE')() && (
                                <>
                                  {normalizeStatus(it.status) === 'PENDING' && (
                                    <Tooltip title={statusLoading[it.id] ? 'Đang xử lý...' : 'Xác nhận'}>
                                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleChangeStatus(it.id, 'CONFIRMED'); }} disabled={!!statusLoading[it.id]}>
                                        {statusLoading[it.id] ? <CircularProgress size={16} /> : <CheckCircleOutlineIcon fontSize="small" color="success" />}
                                      </IconButton>
                                    </Tooltip>
                                  )}

                                  {normalizeStatus(it.status) === 'CONFIRMED' && (
                                    <>
                                      <Tooltip title={statusLoading[it.id] ? 'Đang xử lý...' : 'Hoàn thành'}>
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleChangeStatus(it.id, 'COMPLETE'); }} disabled={!!statusLoading[it.id]}>
                                          {statusLoading[it.id] ? <CircularProgress size={16} /> : <DoneAllIcon fontSize="small" color="primary" />}
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title={sendingReminder[it.id] ? 'Đang gửi...' : 'Gửi nhắc'}>
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleSendReminder(it); }} disabled={!!sendingReminder[it.id]}>
                                          {sendingReminder[it.id] ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  )}

                                  {normalizeStatus(it.status) !== 'PENDING' && (
                                    <Tooltip title={statusLoading[it.id] ? 'Đang xử lý...' : 'Đặt lại PENDING'}>
                                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleChangeStatus(it.id, 'PENDING'); }} disabled={!!statusLoading[it.id]}>
                                        {statusLoading[it.id] ? <CircularProgress size={16} /> : <ReplayIcon fontSize="small" />}
                                      </IconButton>
                                    </Tooltip>
                                  )}

                                  <Tooltip title="Chỉnh sửa">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(it); }} title="Chỉnh sửa"><EditIcon fontSize="small" /></IconButton>
                                  </Tooltip>

                                  <Tooltip title="Hủy">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCancelAppointment(it); }} title="Hủy"><DeleteIcon fontSize="small" /></IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )
        )}

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />

        <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
          <DialogTitle>Chỉnh sửa lịch hẹn</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl size="small">
                <InputLabel>Bác sĩ</InputLabel>
                <Select size="small" label="Bác sĩ" value={editDentistId ?? ''} onChange={(e) => setEditDentistId(Number(e.target.value) || undefined)}>
                  <MenuItem value="">(Không chọn)</MenuItem>
                  {dentists.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl size="small">
                <InputLabel>Chi nhánh</InputLabel>
                <Select size="small" label="Chi nhánh" value={editBranchId ?? ''} onChange={(e) => setEditBranchId(Number(e.target.value) || undefined)}>
                  <MenuItem value="">(Không chọn)</MenuItem>
                  {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl size="small">
                <InputLabel>Dịch vụ</InputLabel>
                <Select size="small" label="Dịch vụ" value={editServiceId ?? ''} onChange={(e) => setEditServiceId(Number(e.target.value) || undefined)}>
                  <MenuItem value="">(Không chọn)</MenuItem>
                  {services.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl size="small">
                <InputLabel>Phụ tá</InputLabel>
                <Select size="small" label="Phụ tá" value={editAssistantId ?? ''} onChange={(e) => setEditAssistantId(Number(e.target.value) || undefined)}>
                  <MenuItem value="">(Không chọn)</MenuItem>
                  {dentists.map(d => <MenuItem key={d.id} value={d.userId ?? d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>

              <TextField label="Thời lượng (phút)" type="number" value={editEstimatedMinutes ?? ''} onChange={(e) => setEditEstimatedMinutes(e.target.value ? Number(e.target.value) : undefined)} />

              <FormControl size="small">
                <InputLabel>Trạng thái</InputLabel>
                <Select size="small" label="Trạng thái" value={editStatus ?? ''} onChange={(e) => setEditStatus(e.target.value as string)}>
                  <MenuItem value="">(Không thay đổi)</MenuItem>
                  <MenuItem value="PENDING">PENDING</MenuItem>
                  <MenuItem value="CONFIRMED">CONFIRMED</MenuItem>
                  <MenuItem value="COMPLETE">COMPLETE</MenuItem>
                  <MenuItem value="CANCELLED">CANCELLED</MenuItem>
                </Select>
              </FormControl>

              <TextField label="Ghi chú" multiline rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              <TextField label="Ngày/giờ" type="datetime-local" value={editTime} onChange={(e) => setEditTime(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEdit} disabled={editLoading}>Hủy</Button>
            <Button variant="contained" onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              Lưu
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={cancelConfirmOpen} onClose={() => setCancelConfirmOpen(false)}>
          <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ fontSize: 24 }}>⚠️</Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>Xác nhận hủy</Typography>
          </DialogTitle>
          <DialogContent sx={{ mt: 2, bgcolor: 'rgba(0,0,0,0.01)' }}>
            <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 1, border: '1px solid #fee2e2' }}>
              <Typography>Bạn có chắc muốn hủy lịch hẹn này?</Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setCancelConfirmOpen(false)} disabled={cancelLoading}>Không</Button>
            <Button variant="contained" color="error" onClick={doCancel} disabled={cancelLoading}>
              {cancelLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              Hủy
            </Button>
          </DialogActions>
        </Dialog>

        {/* Detail view dialog (read-only) */}
        <Dialog open={detailOpen} onClose={closeDetailView} fullWidth maxWidth="md">
          <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56, fontWeight: 700, color: 'white' }}>{(detailItem?.customerUsername || detailItem?.customerName || detailItem?.customerEmail || '-').charAt(0).toUpperCase()}</Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>{detailItem?.label ?? 'Lịch hẹn'}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>{detailItem?.customerName ?? detailItem?.customerUsername ?? '-'}</Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ bgcolor: 'rgba(0,0,0,0.01)' }}>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#667eea' }}>Thông tin khách hàng</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Tên khách hàng</Typography>
                    <Typography variant="body2">{detailItem?.customerName ?? detailItem?.customerUsername ?? '-'}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Email</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{detailItem?.customerEmail ?? '-'}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Tên lịch hẹn</Typography>
                    <Typography variant="body2">{detailItem?.label ?? '-'}</Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#667eea' }}>Thông tin dịch vụ</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Dịch vụ</Typography>
                    <Typography variant="body2">{detailItem?.serviceName ?? detailItem?.serviceId ?? '-'}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Thời lượng dịch vụ</Typography>
                    <Typography variant="body2">
                      {detailItem?.serviceDurationMinutes 
                        ? `${detailItem.serviceDurationMinutes} phút` 
                        : detailItem?.serviceDuration 
                          ? `${detailItem.serviceDuration} phút` 
                          : detailItem?.estimatedMinutes 
                            ? `${detailItem.estimatedMinutes} phút` 
                            : '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Giá dịch vụ</Typography>
                    <Typography variant="body2">
                      {detailItem?.servicePrice 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detailItem.servicePrice) 
                        : '-'}
                    </Typography>
                  </Box>
                  {detailItem?.serviceDiscountPercent && detailItem.serviceDiscountPercent > 0 && (
                    <Box sx={{ p: 1.5, bgcolor: '#fef3c7', borderRadius: 1, border: '1px solid #fcd34d' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Giảm giá</Typography>
                      <Typography variant="body2" sx={{ color: '#d97706', fontWeight: 600 }}>
                        {detailItem.serviceDiscountPercent}%
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ p: 1.5, bgcolor: detailItem?.serviceTotalPrice ? '#ecfdf5' : 'white', borderRadius: 1, border: detailItem?.serviceTotalPrice ? '1px solid #10b981' : '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Tổng tiền</Typography>
                    <Typography variant="body2" sx={{ fontWeight: detailItem?.serviceTotalPrice ? 700 : 400, color: detailItem?.serviceTotalPrice ? '#059669' : 'inherit' }}>
                      {detailItem?.serviceTotalPrice 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detailItem.serviceTotalPrice) 
                        : detailItem?.servicePrice 
                          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detailItem.servicePrice) 
                          : '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Chi nhánh</Typography>
                    <Typography variant="body2">{detailItem?.branchName ?? detailItem?.branchId ?? '-'}</Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#667eea' }}>Nhân viên</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Bác sĩ</Typography>
                    <Typography variant="body2">{detailItem?.dentistName ?? detailItem?.dentistId ?? '-'}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Phụ tá</Typography>
                    <Typography variant="body2">{detailItem?.assistantName ?? detailItem?.assistantId ?? '-'}</Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#667eea' }}>Lịch và trạng thái</Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Thời gian</Typography>
                    <Typography variant="body2">{detailItem?.scheduledTime ? new Date(detailItem.scheduledTime).toLocaleString('vi-VN') : '-'}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Trạng thái</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {(() => {
                        const normalized = normalizeStatus(detailItem?.status);
                        const s = normalized.toLowerCase();
                        const colorVar: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = s === 'confirmed' ? 'success' : s === 'pending' ? 'warning' : s === 'cancelled' ? 'default' : 'info';
                        return <Chip size="small" label={normalized} color={colorVar} />;
                      })()}
                    </Box>
                  </Box>
                </Stack>
              </Grid>

              {detailItem?.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#667eea' }}>Ghi chú</Typography>
                  <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{detailItem.notes}</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={closeDetailView}>Đóng</Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => { closeDetailView(); openEdit(detailItem!); }}>Chỉnh sửa</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </div>
  );
}
