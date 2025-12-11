import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Grid,
  Divider
} from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import { ConsultationAPI, type ConsultationItem, type ConsultationPayload, type ConsultationStatus } from '../../services/consultation-ab';
import { DentistAPI, type Dentist } from '../../services/dentist';
import { ServiceAPI, type ServiceItem } from '../../services/service';
import { BranchAPI, type Branch } from '../../services/branches';
import { UserAPI } from '../../services/user';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Consultation() {
  const [items, setItems] = useState<ConsultationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & filter state
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'customer' | 'dentist' | 'time'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [pickerValue, setPickerValue] = useState<Date | null>(null);

  // Sort state
  const [sortOption, setSortOption] = useState<'time-asc' | 'time-desc' | 'created-desc' | 'created-asc'>('created-desc');
  
  // Quick range filter: all / today / week / month / year
  const [rangeFilter, setRangeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');

  // Create/Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editItem, setEditItem] = useState<ConsultationItem | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<ConsultationPayload>({
    customerId: null,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    dentistId: null,
    assistantId: null,
    branchId: null,
    serviceId: null,
    scheduledTime: null,
    durationMinutes: 30,
    notes: '',
    status: 'PENDING'
  });

  // Detail view dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ConsultationItem | null>(null);

  // Delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Lookup data
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [users, setUsers] = useState<{ id: number; fullName: string; email: string }[]>([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Ticking state for real-time UI updates
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load consultations
  const loadConsultations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ConsultationAPI.getAll();
      if (res && res.success) {
        setItems(res.data || []);
        setError(null);
      } else {
        setError(res.message || 'Không tải được danh sách lịch hẹn tư vấn');
      }
    } catch (e) {
      setError((e as Error)?.message || 'Lỗi mạng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  // Load lookup lists
  useEffect(() => {
    (async () => {
      try {
        const [dRes, bRes, sRes, uRes] = await Promise.all([
          DentistAPI.getDentists(),
          BranchAPI.getBranches(),
          ServiceAPI.getServices(),
          UserAPI.getUsers()
        ]);
        
        if (dRes && dRes.success) setDentists(dRes.data || []);
        if (bRes && bRes.success) setBranches(bRes.data || []);
        if (sRes && sRes.success) setServices(sRes.data || []);
        if (uRes && uRes.success) {
          setUsers((uRes.data || []).map(u => ({
            id: u.id,
            fullName: u.fullName || u.username || '',
            email: u.email || ''
          })));
        }
      } catch (err) {
        console.error('Error loading lookup data:', err);
      }
    })();
  }, []);

  // Filter logic
  const filtered = useMemo(() => {
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;

    if (rangeFilter !== 'all') {
      const nowDate = new Date();
      if (rangeFilter === 'today') {
        const start = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0);
        const end = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 23, 59, 59, 999);
        rangeStart = start.getTime();
        rangeEnd = end.getTime();
      } else if (rangeFilter === 'week') {
        const day = nowDate.getDay();
        const diffToMon = (day + 6) % 7;
        const mon = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - diffToMon, 0, 0, 0, 0);
        const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6, 23, 59, 59, 999);
        rangeStart = mon.getTime();
        rangeEnd = sun.getTime();
      } else if (rangeFilter === 'month') {
        const start = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0, 23, 59, 59, 999);
        rangeStart = start.getTime();
        rangeEnd = end.getTime();
      } else if (rangeFilter === 'year') {
        const start = new Date(nowDate.getFullYear(), 0, 1, 0, 0, 0, 0);
        const end = new Date(nowDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        rangeStart = start.getTime();
        rangeEnd = end.getTime();
      }
    }

    const q = search.trim().toLowerCase();
    const matchesTime = (it: ConsultationItem) => {
      if (!it.scheduledTime) return false;
      try {
        const dt = new Date(it.scheduledTime);
        if (Number.isNaN(dt.getTime())) return false;
        const full = dt.toLocaleString().toLowerCase();
        const timeOnly = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
        const iso = it.scheduledTime.toLowerCase();
        return full.includes(q) || timeOnly.includes(q) || iso.includes(q);
      } catch {
        return it.scheduledTime.toLowerCase().includes(q);
      }
    };

    return items.filter(it => {
      // Apply range filter
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

      if (!q) {
        if (searchBy !== 'time') return true;
      }

      if (searchBy === 'customer') {
        const hay = `${it.customerName ?? ''} ${it.customerPhone ?? ''} ${it.customerEmail ?? ''} ${it.customer?.fullName ?? ''}`.toLowerCase();
        return hay.includes(q);
      }
      if (searchBy === 'dentist') {
        const hay = `${it.dentist?.name ?? ''} ${it.dentistId ?? ''}`.toString().toLowerCase();
        return hay.includes(q);
      }
      if (searchBy === 'time') {
        if (dateFilter) {
          if (!it.scheduledTime) return false;
          try {
            const d = new Date(it.scheduledTime);
            if (Number.isNaN(d.getTime())) return false;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}` === dateFilter;
          } catch {
            return false;
          }
        }
        return matchesTime(it);
      }

      // Default: search across all fields
      const hay = `${it.customerName ?? ''} ${it.customerPhone ?? ''} ${it.customerEmail ?? ''} ${it.dentist?.name ?? ''} ${it.service?.name ?? ''} ${it.branch?.name ?? ''} ${it.scheduledTime ?? ''} ${it.notes ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, searchBy, dateFilter, rangeFilter]);

  // Sorted list after filtering
  const sorted = useMemo(() => {
    const getTs = (val?: string | null) => {
      if (!val) return 0;
      const t = new Date(val).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    const getCreated = (val?: string | null) => {
      if (!val) return 0;
      const t = new Date(val).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    const arr = filtered.slice();
    arr.sort((a, b) => {
      if (sortOption === 'time-asc') return getTs(a.scheduledTime) - getTs(b.scheduledTime);
      if (sortOption === 'time-desc') return getTs(b.scheduledTime) - getTs(a.scheduledTime);
      if (sortOption === 'created-desc') return getCreated(b.createdAt) - getCreated(a.createdAt);
      if (sortOption === 'created-asc') return getCreated(a.createdAt) - getCreated(b.createdAt);
      return 0;
    });
    return arr;
  }, [filtered, sortOption]);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <CircularProgress />
      </div>
    );
  }

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const openCreateDialog = () => {
    setEditMode(false);
    setEditItem(null);
    setFormData({
      customerId: null,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      dentistId: null,
      assistantId: null,
      branchId: null,
      serviceId: null,
      scheduledTime: null,
      durationMinutes: 30,
      notes: '',
      status: 'PENDING'
    });
    setDialogOpen(true);
  };

  const openEditDialog = (it: ConsultationItem) => {
    setEditMode(true);
    setEditItem(it);
    
    // Convert ISO to yyyy-MM-ddTHH:MM for input
    let timeValue: string | null = null;
    if (it.scheduledTime) {
      const d = new Date(it.scheduledTime);
      const pad = (n: number) => n.toString().padStart(2, '0');
      timeValue = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    setFormData({
      customerId: it.customerId,
      customerName: it.customerName || '',
      customerPhone: it.customerPhone || '',
      customerEmail: it.customerEmail || '',
      dentistId: it.dentistId,
      assistantId: it.assistantId,
      branchId: it.branchId,
      serviceId: it.serviceId,
      scheduledTime: timeValue,
      durationMinutes: it.durationMinutes || 30,
      notes: it.notes || '',
      status: it.status || 'PENDING'
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.customerName && !formData.customerId) {
      toast.error('Vui lòng nhập tên khách hàng hoặc chọn khách hàng');
      return;
    }

    // Convert datetime-local to ISO (allow null)
    const payload: ConsultationPayload = {
      ...formData,
      scheduledTime: formData.scheduledTime ? new Date(formData.scheduledTime).toISOString() : null,
      durationMinutes: formData.durationMinutes || null
    };

    try {
      let res;
      if (editMode && editItem) {
        res = await ConsultationAPI.update(editItem.id, payload);
      } else {
        res = await ConsultationAPI.create(payload);
      }

      if (res && res.success) {
        toast.success(editMode ? 'Cập nhật thành công' : 'Tạo lịch hẹn thành công');
        await loadConsultations();
        closeDialog();
      } else {
        toast.error(res.message || 'Thao tác thất bại');
      }
    } catch (e) {
      toast.error((e as Error)?.message || 'Lỗi khi lưu dữ liệu');
    }
  };

  const openDetailView = (it: ConsultationItem) => {
    setDetailItem(it);
    setDetailOpen(true);
  };

  const closeDetailView = () => {
    setDetailOpen(false);
    setDetailItem(null);
  };

  const handleDelete = (id: number) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteConfirmOpen(false);
    try {
      const res = await ConsultationAPI.delete(deleteTargetId);
      if (res && res.success) {
        toast.success('Xóa thành công');
        await loadConsultations();
      } else {
        toast.error(res.message || 'Xóa thất bại');
      }
    } catch (e) {
      toast.error((e as Error)?.message || 'Xóa thất bại');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return '#fbbf24'; // amber
      case 'CONFIRMED':
        return '#60a5fa'; // blue
      case 'COMPLETED':
        return '#4ade80'; // green
      case 'CANCELLED':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return 'Chờ xử lý';
      case 'CONFIRMED':
        return 'Xác nhận';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Hủy';
      default:
        return 'Không xác định';
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <CardContent>
        {/* Header Section */}
        <div className="bg-gradient-to-r mb-5 from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản lý</p>
              <Typography variant="h5" fontWeight="bold" className="text-white">
                Lịch hẹn tư vấn
              </Typography>
            </div>
            <div className="flex gap-2">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
                sx={{
                  bgcolor: 'white',
                  color: 'purple',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
              >
                Tạo lịch hẹn
              </Button>
              <IconButton
                onClick={loadConsultations}
                sx={{ color: 'white' }}
                title="Làm mới"
              >
                <RefreshIcon />
              </IconButton>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
            {/* Search, filter & sort controls */}
            <Box sx={{ display: 'flex', gap: 2, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                sx={{ width: { xs: '100%', sm: 320 } }}
                size="small"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
              <FormControl size="small" sx={{ minWidth: 140, width: { xs: '48%', sm: 140 } }}>
                <InputLabel>Tìm theo</InputLabel>
                <Select
                  label="Tìm theo"
                  value={searchBy}
                  onChange={(e) => {
                    setSearchBy(e.target.value as 'all' | 'customer' | 'dentist' | 'time');
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="customer">Khách hàng</MenuItem>
                  <MenuItem value="dentist">Nha sĩ</MenuItem>
                  <MenuItem value="time">Thời gian</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 180, width: { xs: '48%', sm: 200 } }}>
                <InputLabel>Sắp xếp</InputLabel>
                <Select
                  label="Sắp xếp"
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value as typeof sortOption);
                    setPage(0);
                  }}
                >
                  <MenuItem value="time-asc">Thời gian sớm → muộn</MenuItem>
                  <MenuItem value="time-desc">Thời gian muộn → sớm</MenuItem>
                  <MenuItem value="created-desc">Mới tạo → cũ</MenuItem>
                  <MenuItem value="created-asc">Cũ → mới tạo</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Date picker & quick filters */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {searchBy === 'time' && (
                <>
                  <Button
                    size="small"
                    variant={dateFilter ? 'contained' : 'outlined'}
                    startIcon={<CalendarTodayIcon />}
                    onClick={(e) => setPickerAnchor(e.currentTarget)}
                  >
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
                            // Handle Date object from AdapterDateFns
                            let dateObj: Date;
                            if (newVal instanceof Date) {
                              dateObj = newVal;
                            } else if (typeof newVal === 'object' && newVal !== null && 'toDate' in newVal && typeof (newVal as { toDate?: unknown }).toDate === 'function') {
                              dateObj = (newVal as { toDate: () => Date }).toDate();
                            } else {
                              // Fallback: convert to string then Date
                              dateObj = new Date(String(newVal));
                            }
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
                        <Button
                          size="small"
                          onClick={() => {
                            setDateFilter(null);
                            setPickerValue(null);
                            setPickerAnchor(null);
                          }}
                        >
                          Xóa
                        </Button>
                      </Box>
                    </Box>
                  </Popover>
                </>
              )}

              {/* Quick range filters */}
              <ToggleButtonGroup
                size="small"
                value={rangeFilter}
                exclusive
                onChange={(_, v) => {
                  if (v) {
                    setRangeFilter(v);
                    setDateFilter(null);
                    setPickerValue(null);
                  }
                }}
                sx={{ display: 'flex', gap: 0.5 }}
              >
                <ToggleButton value="all" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>
                  Tất cả
                </ToggleButton>
                <ToggleButton value="today" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>
                  Hôm nay
                </ToggleButton>
                <ToggleButton value="week" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>
                  Tuần
                </ToggleButton>
                <ToggleButton value="month" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>
                  Tháng
                </ToggleButton>
                <ToggleButton value="year" sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' } }}>
                  Năm
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Paper>

        {/* Error display */}
        {error && (
          <Box sx={{ p: 2, mb: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {/* Results */}
        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Không có lịch hẹn tư vấn nào khớp với bộ lọc hiện tại.
            </Typography>
          </Box>
        ) : isMobile ? (
          // Mobile card view
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paged.map((it) => (
              <Card key={it.id} variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => openDetailView(it)}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {it.customerName || it.customer?.fullName || 'Khách vãng lai'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {it.customerPhone || it.customerEmail || ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {it.scheduledTime ? new Date(it.scheduledTime).toLocaleString('vi-VN') : ''}
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Stack direction="column" spacing={0.5}>
                    <Typography variant="caption">
                      <strong>Nha sĩ:</strong> {it.dentist?.name || 'Chưa chọn'}
                    </Typography>
                    <Typography variant="caption">
                      <strong>Dịch vụ:</strong> {it.service?.name || 'Chưa chọn'}
                    </Typography>
                    <Typography variant="caption">
                      <strong>Chi nhánh:</strong> {it.branch?.name || 'Chưa chọn'}
                    </Typography>
                    <Typography variant="caption">
                      <strong>Thời lượng:</strong> {it.durationMinutes ? `${it.durationMinutes} phút` : 'Chưa xác định'}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={getStatusLabel(it.status)}
                        size="small"
                        sx={{ 
                          bgcolor: getStatusColor(it.status),
                          color: 'white',
                          fontWeight: 500
                        }}
                      />
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(it);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(it.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            ))}
          </Box>
        ) : (
          // Desktop table view
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <TableContainer sx={{ minWidth: 800 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Khách hàng</TableCell>
                    <TableCell>Liên hệ</TableCell>
                    <TableCell>Nha sĩ</TableCell>
                    <TableCell>Dịch vụ</TableCell>
                    <TableCell>Chi nhánh</TableCell>
                    <TableCell>Thời gian hẹn</TableCell>
                    <TableCell>Thời lượng</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell align="right">Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.map((it) => {
                    const createdTs = it.createdAt ? new Date(it.createdAt).getTime() : NaN;
                    const ageMs = Number.isFinite(createdTs) ? now - createdTs : Infinity;
                    const isNew = Number.isFinite(createdTs) && ageMs <= 5 * 60 * 1000;

                    return (
                      <TableRow
                        key={it.id}
                        hover
                        onClick={() => openDetailView(it)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{it.id}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {it.customerName || it.customer?.fullName || 'Khách vãng lai'}
                            </Typography>
                            {isNew && <Chip label="NEW" color="secondary" size="small" />}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8rem">
                            <div>{it.customerPhone || it.customer?.phone}</div>
                            <div>{it.customerEmail || it.customer?.email}</div>
                          </Typography>
                        </TableCell>
                        <TableCell>{it.dentist?.name || '-'}</TableCell>
                        <TableCell>{it.service?.name || '-'}</TableCell>
                        <TableCell>{it.branch?.name || '-'}</TableCell>
                        <TableCell>
                          {it.scheduledTime
                            ? new Date(it.scheduledTime).toLocaleString('vi-VN')
                            : '-'}
                        </TableCell>
                        <TableCell>{it.durationMinutes} phút</TableCell>
                        <TableCell>
                          <Chip 
                            label={getStatusLabel(it.status)}
                            size="small"
                            sx={{ 
                              bgcolor: getStatusColor(it.status),
                              color: 'white',
                              fontWeight: 500
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailView(it);
                              }}
                              title="Xem chi tiết"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(it);
                              }}
                              title="Chỉnh sửa"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(it.id);
                              }}
                              title="Xóa"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Pagination */}
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Số dòng mỗi trang:"
        />
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Chỉnh sửa lịch hẹn' : 'Tạo lịch hẹn tư vấn'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Khách hàng (có tài khoản)</InputLabel>
                <Select
                  label="Khách hàng (có tài khoản)"
                  value={formData.customerId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, customerId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <MenuItem value="">Không chọn (khách vãng lai)</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Tên khách hàng"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Nhập tên khách vãng lai"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Số điện thoại"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Nha sĩ</InputLabel>
                <Select
                  label="Nha sĩ"
                  value={formData.dentistId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, dentistId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <MenuItem value="">Không chọn</MenuItem>
                  {dentists.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name} {d.specialization && `(${d.specialization})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Phụ tá</InputLabel>
                <Select
                  label="Phụ tá"
                  value={formData.assistantId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, assistantId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <MenuItem value="">Không chọn</MenuItem>
                  {dentists.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Chi nhánh</InputLabel>
                <Select
                  label="Chi nhánh"
                  value={formData.branchId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, branchId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <MenuItem value="">Không chọn</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Dịch vụ</InputLabel>
                <Select
                  label="Dịch vụ"
                  value={formData.serviceId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <MenuItem value="">Không chọn</MenuItem>
                  {services.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name} - {s.price?.toLocaleString()}đ
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Thời gian hẹn"
                type="datetime-local"
                value={formData.scheduledTime || ''}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value || null })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Thời lượng (phút)"
                type="number"
                value={formData.durationMinutes || ''}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value ? Number(e.target.value) : null })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Ghi chú"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  label="Trạng thái"
                  value={formData.status || 'PENDING'}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as ConsultationStatus })
                  }
                >
                  <MenuItem value="PENDING">Chờ xử lý</MenuItem>
                  <MenuItem value="CONFIRMED">Xác nhận</MenuItem>
                  <MenuItem value="CANCELLED">Hủy</MenuItem>
                  <MenuItem value="COMPLETED">Hoàn thành</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Hủy</Button>
          <Button variant="contained" onClick={handleSave}>
            {editMode ? 'Cập nhật' : 'Tạo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={detailOpen} onClose={closeDetailView} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 3
        }}>
          <Typography variant="h6" fontWeight="bold">
            Chi tiết lịch hẹn tư vấn
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            ID: #{detailItem?.id}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {detailItem && (
            <Grid container spacing={3}>
              {/* Customer Information Section */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#e8eaf6', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#3f51b5" sx={{ mb: 2 }}>
                    Thông tin khách hàng
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Họ tên
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {detailItem.customerName || detailItem.customer?.fullName || 'Khách vãng lai'}
                        </Typography>
                      </Box>
                    </Grid>
                    {(detailItem.customerPhone || detailItem.customer?.phone) && (
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Số điện thoại
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {detailItem.customerPhone || detailItem.customer?.phone}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {(detailItem.customerEmail || detailItem.customer?.email) && (
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Email
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {detailItem.customerEmail || detailItem.customer?.email}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* Medical Staff Section */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#fff3e0', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#e65100" sx={{ mb: 2 }}>
                    Đội ngũ y tế
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Nha sĩ phụ trách
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {detailItem.dentist?.name || 'Chưa chọn'}
                        </Typography>
                        {detailItem.dentist?.specialization && (
                          <Chip 
                            label={detailItem.dentist.specialization} 
                            size="small" 
                            sx={{ mt: 0.5, bgcolor: '#ffe0b2', color: '#e65100', fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </Grid>
                    {detailItem.assistant && (
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Phụ tá
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                            {detailItem.assistant.name}
                          </Typography>
                          {detailItem.assistant.specialization && (
                            <Chip 
                              label={detailItem.assistant.specialization} 
                              size="small" 
                              sx={{ mt: 0.5, bgcolor: '#ffe0b2', color: '#e65100', fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* Service & Branch Section */}
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#e1f5fe', borderRadius: 2, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#0277bd" sx={{ mb: 2 }}>
                    Dịch vụ
                  </Typography>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {detailItem.service?.name || 'Chưa chọn'}
                    </Typography>
                    {detailItem.service?.price && (
                      <Typography variant="h6" color="#0277bd" sx={{ mt: 1, fontWeight: 'bold' }}>
                        {detailItem.service.price.toLocaleString('vi-VN')} ₫
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#f3e5f5', borderRadius: 2, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#7b1fa2" sx={{ mb: 2 }}>
                    Chi nhánh
                  </Typography>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {detailItem.branch?.name || 'Chưa chọn'}
                    </Typography>
                    {detailItem.branch?.address && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {detailItem.branch.address}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>

              {/* Appointment Time Section */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#fce4ec', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#c62828" sx={{ mb: 2 }}>
                    Thời gian hẹn
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Ngày & giờ
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5, color: '#c62828' }}>
                          {detailItem.scheduledTime
                            ? new Date(detailItem.scheduledTime).toLocaleString('vi-VN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Chưa xác định'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Thời lượng
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip 
                            label={detailItem.durationMinutes ? `${detailItem.durationMinutes} phút` : 'Chưa xác định'}
                            sx={{ bgcolor: '#ffcdd2', color: '#c62828', fontWeight: 600 }}
                          />
                        </Stack>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Notes Section */}
              {detailItem.notes && (
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#2e7d32" sx={{ mb: 2 }}>
                      Ghi chú
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {detailItem.notes}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {/* Status Section */}
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#fef3c7', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="#92400e" sx={{ mb: 2 }}>
                    Trạng thái
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip 
                      label={getStatusLabel(detailItem.status)}
                      sx={{ 
                        bgcolor: getStatusColor(detailItem.status),
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}
                    />
                  </Stack>
                </Paper>
              </Grid>

              {/* Metadata Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Ngày tạo
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString('vi-VN') : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Cập nhật lần cuối
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {detailItem.updatedAt ? new Date(detailItem.updatedAt).toLocaleString('vi-VN') : '-'}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#fafafa', flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={closeDetailView} variant="outlined">
            Đóng
          </Button>
          
          {/* Status action buttons */}
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            {detailItem?.status !== 'CONFIRMED' && (
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    const res = await ConsultationAPI.confirm(detailItem!.id);
                    if (res?.success) {
                      toast.success('Xác nhận thành công');
                      await loadConsultations();
                      closeDetailView();
                    } else {
                      toast.error(res?.message || 'Xác nhận thất bại');
                    }
                  } catch (e) {
                    toast.error((e as Error)?.message || 'Lỗi');
                  }
                }}
                sx={{ color: '#60a5fa', borderColor: '#60a5fa' }}
              >
                Xác nhận
              </Button>
            )}
            
            {detailItem?.status !== 'COMPLETED' && (
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    const res = await ConsultationAPI.complete(detailItem!.id);
                    if (res?.success) {
                      toast.success('Hoàn thành thành công');
                      await loadConsultations();
                      closeDetailView();
                    } else {
                      toast.error(res?.message || 'Hoàn thành thất bại');
                    }
                  } catch (e) {
                    toast.error((e as Error)?.message || 'Lỗi');
                  }
                }}
                sx={{ color: '#4ade80', borderColor: '#4ade80' }}
              >
                Hoàn thành
              </Button>
            )}
            
            {detailItem?.status !== 'CANCELLED' && (
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    const res = await ConsultationAPI.cancel(detailItem!.id);
                    if (res?.success) {
                      toast.success('Hủy thành công');
                      await loadConsultations();
                      closeDetailView();
                    } else {
                      toast.error(res?.message || 'Hủy thất bại');
                    }
                  } catch (e) {
                    toast.error((e as Error)?.message || 'Lỗi');
                  }
                }}
                sx={{ color: '#ef4444', borderColor: '#ef4444' }}
              >
                Hủy
              </Button>
            )}
          </Box>
          
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              if (detailItem) {
                closeDetailView();
                openEditDialog(detailItem);
              }
            }}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              }
            }}
          >
            Chỉnh sửa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc chắn muốn xóa lịch hẹn này không?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Hủy</Button>
          <Button variant="contained" color="error" onClick={doDelete}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
