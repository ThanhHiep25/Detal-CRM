import { useState, useEffect } from "react";
import {
  Card, CardContent, Tabs, Tab, Box, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Button, InputAdornment, ToggleButton, ToggleButtonGroup, Stack
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import { grey, blue } from '@mui/material/colors';
import { toast, ToastContainer } from 'react-toastify';
import { UserAPI, type UserListItem, type ApiResponse } from '../../services/user';
import { ConsultationAPI, type ConsultationPayload } from '../../services/consultation';
import { DentistAPI, type Dentist } from '../../services/dentist';
import { BranchAPI, type Branch } from '../../services/branches';
import { ServiceAPI, type ServiceItem } from '../../services/service';
import { AppointmentAPI } from '../../services/appointments.ts';
import type { CreateAppointmentPayload } from '../../services/appointments.ts';

// Định nghĩa style chi tiết hơn cho input
const inputStyles = {
  // Style cho phần root của input
  '& .MuiFilledInput-root': {
    border: '1px solid transparent', // Thêm viền trong suốt để không bị giật layout khi focus
    borderRadius: '8px', // Tăng bo góc
    backgroundColor: grey[100], // Màu nền nhạt hơn
    transition: 'background-color 0.3s, border-color 0.3s',
    '&:hover': {
      backgroundColor: grey[200],
    },
    // Style khi input được focus
    '&.Mui-focused': {
      backgroundColor: 'white',
      borderColor: blue[600], // Viền xanh khi focus
    },
    // Bỏ gạch chân mặc định của variant="filled"
    '&::before, &::after': {
      display: 'none',
    },
  },
  // Style cho phần text label
  '& .MuiInputLabel-root': {
    color: grey[600],
    '&.Mui-focused': {
      color: blue[600], // Label màu xanh khi focus
    },
  },
};

// ... TabPanel function không đổi ...
function TabPanel(props: { children?: React.ReactNode; index: number; value: number; }) {
  const { children, value, index, ...other } = props;
  return (<div hidden={value !== index} {...other}>{value === index && <Box sx={{ pt: 3, px: 1 }}>{children}</Box>}</div>);
}


export function AppointmentForm(props?: { dentistId?: number | ''; setDentistId?: (v: number | '') => void; pageDate?: Date | null; setPageDate?: (d: Date | null) => void }) {
  const { dentistId: dentistIdProp, setDentistId: setDentistIdProp, pageDate: pageDateProp, setPageDate: setPageDateProp } = props || {};
  const [tabValue, setTabValue] = useState(0);
  const [infoType, setInfoType] = useState('general');
  // customer search / selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedUsers, setMatchedUsers] = useState<UserListItem[]>([]);
  // treatment tab search (separate state so searching in one tab doesn't affect the other)
  const [searchTreat, setSearchTreat] = useState('');
  const [matchedUsersTreat, setMatchedUsersTreat] = useState<UserListItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<UserListItem | null>(null);
  const [custFullName, setCustFullName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [consultationSubmitting, setConsultationSubmitting] = useState(false);

  // search users (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchQuery.trim();
      if (!q || q.length < 3) {
        setMatchedUsers([]);
        return;
      }
      try {
        const res: ApiResponse<UserListItem[]> = await UserAPI.getUsers();
        const users = res && Array.isArray(res.data) ? res.data : [];
        const filtered = users.filter(u => {
          const role = (u.role || '').toString().toLowerCase();
          const matchesRole = role === 'customer' || role === 'cust' || role === 'khachhang';
          const phone = (u as unknown as { phone?: string }).phone || u.profile?.phone || '';
          const matchesQuery = (u.email || '').includes(q) || phone.includes(q) || (u.username || '').includes(q) || (u.fullName || '').includes(q);
          return matchesRole && matchesQuery;
        });
        setMatchedUsers(filtered);
      } catch (err) {
        console.error('User search failed', err);
        setMatchedUsers([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // search users for treatment tab (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = searchTreat.trim();
      if (!q || q.length < 3) {
        setMatchedUsersTreat([]);
        return;
      }
      try {
        const res: ApiResponse<UserListItem[]> = await UserAPI.getUsers();
        const users = res && Array.isArray(res.data) ? res.data : [];
        const filtered = users.filter(u => {
          const role = (u.role || '').toString().toLowerCase();
          const matchesRole = role === 'customer' || role === 'cust' || role === 'khachhang';
          const phone = (u as unknown as { phone?: string }).phone || u.profile?.phone || '';
          const matchesQuery = (u.email || '').includes(q) || phone.includes(q) || (u.username || '').includes(q) || (u.fullName || '').includes(q);
          return matchesRole && matchesQuery;
        });
        setMatchedUsersTreat(filtered);
      } catch (err) {
        console.error('User search failed', err);
        setMatchedUsersTreat([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchTreat]);

  // fetch dentists/branches/services for selects
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [dentistsLoading, setDentistsLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // local fallback state when parent doesn't provide dentistId/setDentistId
  const [internalDentistId, setInternalDentistId] = useState<number | ''>('');
  const dentistId = typeof dentistIdProp !== 'undefined' ? dentistIdProp : internalDentistId;
  const setDentistId = setDentistIdProp ?? setInternalDentistId;

  // pageDateProp: when provided controls the page-level selected date (Date|null).
  // Keep internal scheduledDate string fallback for standalone use.
  const [internalScheduledDate, setInternalScheduledDate] = useState<string>('');
  const formatDateToYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Use local date parts to avoid UTC offset issues (toISOString() uses UTC and can shift the day)
  const scheduledDate = pageDateProp ? formatDateToYYYYMMDD(pageDateProp) : internalScheduledDate;
  const setScheduledDate = (val: string) => {
    if (setPageDateProp) {
      // convert YYYY-MM-DD -> Date (local)
      try {
        const d = val ? new Date(`${val}T00:00`) : null;
        setPageDateProp(d);
      } catch {
        setPageDateProp(null);
      }
    }
    setInternalScheduledDate(val);
  };
  const [assistantId, setAssistantId] = useState<number | ''>('');
  const [branchId, setBranchId] = useState<number | ''>('');
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(30);
  const [appointmentContent, setAppointmentContent] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    setDentistsLoading(true);
    DentistAPI.getDentists()
      .then(res => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) setDentists(res.data as Dentist[]);
        else setDentists([]);
      })
      .catch(() => { if (mounted) setDentists([]); })
      .finally(() => { if (mounted) setDentistsLoading(false); });

    setBranchesLoading(true);
    BranchAPI.getBranches()
      .then(res => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) setBranches(res.data as Branch[]);
        else setBranches([]);
      })
      .catch(() => { if (mounted) setBranches([]); })
      .finally(() => { if (mounted) setBranchesLoading(false); });

    setServicesLoading(true);
    ServiceAPI.getServices()
      .then((res) => {
        if (!mounted) return;
        // res is ApiResponse<ServiceItem[]>
        if (res && Array.isArray((res as ApiResponse<ServiceItem[]>).data)) setServices((res as ApiResponse<ServiceItem[]>).data);
        else setServices([]);
      })
      .catch(() => { if (mounted) setServices([]); })
      .finally(() => { if (mounted) setServicesLoading(false); });

    return () => { mounted = false; };
  }, []);

  // when service selection changes, update duration
  useEffect(() => {
    if (!serviceId) return;
    const s = services.find(x => x.id === serviceId);
    if (s && typeof s.durationMinutes === 'number') setDuration(s.durationMinutes);
  }, [serviceId, services]);

  useEffect(() => {
    if (selectedCustomer) {
      setCustFullName(selectedCustomer.fullName || selectedCustomer.username || '');
      setCustEmail(selectedCustomer.email || '');
      setCustPhone((selectedCustomer as unknown as { phone?: string }).phone || selectedCustomer.profile?.phone || '');
    }
  }, [selectedCustomer]);

  // validate time helper: accepts 'HH:MM' and returns true if between 08:00 and 20:00 inclusive
  const isTimeInBusinessHours = (time: string) => {
    if (!time) return false;
    const m = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return false;
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
    const total = hh * 60 + mm;
    const start = 8 * 60; // 08:00
    const end = 20 * 60;  // 20:00
    return total >= start && total <= end;
  };

  // validate date isn't older than N months (3 months) before now
  const isDateNotOlderThanMonths = (dateStr: string, timeStr?: string, months = 3) => {
    if (!dateStr) return false;
    // construct local datetime (if time provided) or start of day
    const dt = timeStr ? new Date(`${dateStr}T${timeStr}`) : new Date(`${dateStr}T00:00`);
    if (Number.isNaN(dt.getTime())) return false;
    const now = new Date();
    const pastLimit = new Date(now);
    pastLimit.setMonth(pastLimit.getMonth() - months);
    // allow if dt is >= pastLimit
    return dt.getTime() >= pastLimit.getTime();
  };

  // validate selected datetime is not in the past (strictly earlier than now)
  const isNotInPast = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return false;
    const dt = timeStr ? new Date(`${dateStr}T${timeStr}`) : new Date(`${dateStr}T00:00`);
    if (Number.isNaN(dt.getTime())) return false;
    const now = new Date();
    return dt.getTime() >= now.getTime();
  };

  // validate selected datetime is within the next N months (inclusive)
  const isWithinNextMonths = (dateStr: string, timeStr?: string, months = 3) => {
    if (!dateStr) return false;
    const dt = timeStr ? new Date(`${dateStr}T${timeStr}`) : new Date(`${dateStr}T00:00`);
    if (Number.isNaN(dt.getTime())) return false;
    const now = new Date();
    const futureLimit = new Date(now);
    futureLimit.setMonth(futureLimit.getMonth() + months);
    return dt.getTime() <= futureLimit.getTime();
  };

  const handleSelectCustomer = (u: UserListItem) => {
    // Set selected customer and clear both search inputs/results so the UI no longer shows suggestions
    setSelectedCustomer(u);
    setMatchedUsers([]);
    setMatchedUsersTreat([]);
    setSearchQuery('');
    setSearchTreat('');
  };

  const handleCreateConsultation = async () => {
    if (!custFullName.trim()) { toast.error('Vui lòng nhập tên khách hàng'); return; }
    if (!custEmail.trim() && !custPhone.trim()) { toast.error('Nhập email hoặc số điện thoại'); return; }
    // Validation: name (no special chars), phone (starts with 0 and 10 digits), email (@gmail.com)
    try {
      const nameRegex = new RegExp('^[\\p{L}\\s]+$','u');
      if (!nameRegex.test(custFullName.trim())) { toast.error('Tên không được chứa ký tự đặc biệt'); return; }
    } catch {
      const fallbackName = /^[A-Za-z\s.-]+$/;
      if (!fallbackName.test(custFullName.trim())) { toast.error('Tên không được chứa ký tự đặc biệt'); return; }
    }

    if (custPhone && custPhone.trim()) {
      if (!/^0\d{9}$/.test(custPhone.trim())) { toast.error('Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số'); return; }
    }

    if (custEmail && custEmail.trim()) {
      if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(custEmail.trim())) { toast.error('Email phải là địa chỉ @gmail.com'); return; }
    }

    setConsultationSubmitting(true);
    try {
      // Only send when user chọn; không map sang userId để tránh giá trị mặc định
      const resolvedDentistId = typeof dentistId === 'number' ? dentistId : undefined;
      const resolvedAssistantId = typeof assistantId === 'number' ? assistantId : undefined;

      // validate scheduled time (if provided) is within business hours
      if (scheduledTime && !isTimeInBusinessHours(scheduledTime)) {
        toast.error('Thời gian làm việc của nha khoa khoảng 08:00 - 20:00');
        setConsultationSubmitting(false);
        return;
      }

      // disallow past datetime
      if (scheduledDate && !isNotInPast(scheduledDate, scheduledTime)) {
        toast.error('Ngày giờ hẹn không được ở qúa khứ');
        setConsultationSubmitting(false);
        return;
      }
      // disallow booking too far in the future (> 3 months)
      if (scheduledDate && !isWithinNextMonths(scheduledDate, scheduledTime, 3)) {
        toast.error('Ngày hẹn không được đặt trước quá 3 tháng');
        setConsultationSubmitting(false);
        return;
      }

      const payload: ConsultationPayload = {
        fullName: custFullName.trim(),
        email: custEmail.trim(),
        phone: custPhone.trim(),
        method: 'web',
        content: appointmentContent.trim(),
        customerId: selectedCustomer ? selectedCustomer.id : undefined,
        dentistId: resolvedDentistId,
        assistantId: resolvedAssistantId,
        branchId: typeof branchId === 'number' ? branchId : undefined,
        serviceId: typeof serviceId === 'number' ? serviceId : undefined,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        durationMinutes: duration || undefined,
        notes: appointmentContent.trim()
      };
      console.debug('createConsultation payload:', payload);
      const res = await ConsultationAPI.create(payload);
      console.debug('createConsultation response:', res);
      if (res.success) {
        toast.success('Đăng ký tư vấn thành công');
        setSelectedCustomer(null);
        setCustFullName('');
        setCustEmail('');
        setCustPhone('');
        setAppointmentContent('');
        setDentistId('');
        setAssistantId('');
        setBranchId('');
        setServiceId('');
      } else {
        toast.error(res.message || 'Đăng ký thất bại');
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi mạng hoặc máy chủ');
    } finally {
      setConsultationSubmitting(false);
    }
  };

  return (
    // Thay elevation={1} bằng elevation={0} và thêm viền
    <Card elevation={0} sx={{ border: `1px solid ${grey[200]}` }}>
      <ToastContainer />
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Tabs
            value={tabValue}
            onChange={(__dirname__, v) => setTabValue(v)}
            sx={{
              minHeight: 'auto',
              '& .MuiTabs-indicator': { backgroundColor: blue[600] }
            }}
          >
            <Tab label="Tư Vấn" sx={{ textTransform: 'none', minHeight: 'auto', p: 1, fontWeight: 500 }} />
            <Tab label="Điều Trị" sx={{ textTransform: 'none', minHeight: 'auto', p: 1, fontWeight: 500 }} />
          </Tabs>
          <ToggleButtonGroup value={infoType} exclusive onChange={(__dirname__, v) => v && setInfoType(v)}
            sx={{
              '.MuiToggleButton-root.Mui-selected': { bgcolor: blue[50], color: blue[700], fontWeight: 600 },
              '.MuiToggleButton-root': { py: 0.5, px: 1.5, textTransform: 'none', fontSize: '0.875rem' }
            }}
          >
            <ToggleButton value="general">Thông tin chung</ToggleButton>
            <ToggleButton value="other">Khác</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Khách hàng"
                placeholder="Tìm kiếm theo email hoặc số điện thoại (>=3 ký tự)"
                InputLabelProps={{ shrink: true }}
                variant="filled"
                sx={inputStyles}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedCustomer(null); }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
              />
              {matchedUsers.length > 0 && (
                <Box sx={{ border: `1px solid ${grey[200]}`, mt: 1, borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                  {matchedUsers.map(u => (
                    <Box key={u.id} sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: grey[100] } }} onClick={() => handleSelectCustomer(u)}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Box component="div" sx={{ fontWeight: 600 }}>{u.fullName || u.username}</Box>
                          <Box component="div" sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>{u.email || ''} {u.profile?.phone ? `• ${u.profile.phone}` : ''}</Box>
                        </Box>
                        <Box sx={{ color: 'text.secondary' }}>Chọn</Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Tên" placeholder="eg. tên" InputLabelProps={{ shrink: true }} variant="filled" sx={inputStyles} value={custFullName} onChange={(e) => setCustFullName(e.target.value)} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Mã" placeholder="eg. mã" InputLabelProps={{ shrink: true }} variant="filled" sx={inputStyles} value={selectedCustomer ? String(selectedCustomer.id) : ''} disabled /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Số điện thoại" placeholder="eg. số điện thoại" InputLabelProps={{ shrink: true }} variant="filled" sx={inputStyles} value={custPhone} onChange={(e) => setCustPhone(e.target.value)} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Email" placeholder="eg. email" InputLabelProps={{ shrink: true }} variant="filled" sx={inputStyles} value={custEmail} onChange={(e) => setCustEmail(e.target.value)} /></Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Bác sĩ</InputLabel>
                <Select displayEmpty value={dentistId} onChange={(e) => {
                  const v = e.target.value as unknown;
                  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
                  setDentistId(Number.isNaN(n) ? '' : n);
                }}>
                  <MenuItem value=""><em>{dentistsLoading ? 'Đang tải...' : 'Chọn bác sĩ'}</em></MenuItem>
                  {dentists.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Kỹ thuật viên / Phụ tá</InputLabel>
                <Select displayEmpty value={assistantId} onChange={(e) => {
                  const v = e.target.value as unknown;
                  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
                  setAssistantId(Number.isNaN(n) ? '' : n);
                }}>
                  <MenuItem value=""><em>{dentistsLoading ? 'Đang tải...' : 'Chọn phụ tá'}</em></MenuItem>
                  {dentists.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Dự kiến (phút)</InputLabel>
                <Select displayEmpty value={duration} onChange={(e) => setDuration(Number(e.target.value) || 0)}>
                  <MenuItem value={15}>15 Phút</MenuItem>
                  <MenuItem value={30}>30 Phút</MenuItem>
                  <MenuItem value={45}>45 Phút</MenuItem>
                  <MenuItem value={60}>60 Phút</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={8}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Chi nhánh</InputLabel>
                <Select displayEmpty value={branchId} onChange={(e) => {
                  const v = e.target.value as unknown;
                  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
                  setBranchId(Number.isNaN(n) ? '' : n);
                }}>
                  <MenuItem value=""><em>{branchesLoading ? 'Đang tải...' : 'Chọn chi nhánh'}</em></MenuItem>
                  {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={12}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Dịch vụ quan tâm</InputLabel>
                <Select displayEmpty value={serviceId} onChange={(e) => {
                  const v = e.target.value as unknown;
                  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
                  setServiceId(Number.isNaN(n) ? '' : n);
                }}>
                  <MenuItem value=""><em>{servicesLoading ? 'Đang tải...' : 'Chọn dịch vụ'}</em></MenuItem>
                  {services.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Ngày dự kiến" type="date" variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Giờ dự kiến" type="time" variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </Grid>



            <Grid item xs={12}><TextField fullWidth label="Nội dung lịch hẹn" multiline rows={4} placeholder="eg. nội dung" InputLabelProps={{ shrink: true }} variant="filled" sx={inputStyles} value={appointmentContent} onChange={(e) => setAppointmentContent(e.target.value)} /></Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <Button variant="outlined" sx={{ textTransform: 'none', borderRadius: '8px', borderColor: grey[300], color: grey[800] }}>Đóng</Button>
              <Button variant="contained" disableElevation sx={{ textTransform: 'none', borderRadius: '8px' }} onClick={handleCreateConsultation} disabled={consultationSubmitting}>Lưu</Button>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Khách hàng"
                placeholder="Tìm kiếm theo email hoặc số điện thoại (>=3 ký tự)"
                InputLabelProps={{ shrink: true }}
                variant="filled"
                sx={inputStyles}
                value={searchTreat}
                onChange={(e) => { setSearchTreat(e.target.value); setSelectedCustomer(null); }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
              />
              {matchedUsersTreat.length > 0 && (
                <Box sx={{ border: `1px solid ${grey[200]}`, mt: 1, borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                  {matchedUsersTreat.map(u => (
                    <Box key={u.id} sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: grey[100] } }} onClick={() => handleSelectCustomer(u)}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Box component="div" sx={{ fontWeight: 600 }}>{u.fullName || u.username}</Box>
                          <Box component="div" sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>{u.email || ''} {u.profile?.phone ? `• ${u.profile.phone}` : ''}</Box>
                        </Box>
                        <Box sx={{ color: 'text.secondary' }}>Chọn</Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Họ và tên" variant="filled" sx={inputStyles} value={custFullName} onChange={(e) => setCustFullName(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Email" variant="filled" sx={inputStyles} value={custEmail} onChange={(e) => setCustEmail(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Số điện thoại" variant="filled" sx={inputStyles} value={custPhone} onChange={(e) => setCustPhone(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Dịch vụ</InputLabel>
                <Select displayEmpty value={serviceId} onChange={(e) => {
                  const v = e.target.value as unknown;
                  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
                  setServiceId(Number.isNaN(n) ? '' : n);
                }}>
                  <MenuItem value=""><em>{servicesLoading ? 'Đang tải...' : 'Chọn dịch vụ'}</em></MenuItem>
                  {services.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Ngày" type="date" variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Thời gian" type="time" variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Bác sĩ</InputLabel>
                <Select displayEmpty value={dentistId} onChange={(e) => {
                  const v = e.target.value as unknown;
                  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
                  setDentistId(Number.isNaN(n) ? '' : n);
                }}>
                  <MenuItem value=""><em>{dentistsLoading ? 'Đang tải...' : 'Chọn bác sĩ'}</em></MenuItem>
                  {dentists.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Phụ tá</InputLabel>
                <Select displayEmpty value={assistantId} onChange={(e) => {
                  const v = e.target.value as unknown;
                  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
                  setAssistantId(Number.isNaN(n) ? '' : n);
                }}>
                  <MenuItem value=""><em>{dentistsLoading ? 'Đang tải...' : 'Chọn phụ tá'}</em></MenuItem>
                  {dentists.map(d => <MenuItem key={d.id} value={d.userId ?? d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

               <Grid item xs={12} md={8}>
              <FormControl fullWidth variant="filled" sx={inputStyles}>
                <InputLabel shrink>Chi nhánh</InputLabel>
                <Select displayEmpty value={branchId} onChange={(e) => {
                    const v = e.target.value as unknown;
                    const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
                    setBranchId(Number.isNaN(n) ? '' : n);
                  }}>
                  <MenuItem value=""><em>{dentistsLoading ? 'Đang tải...' : 'Chọn chi nhánh'}</em></MenuItem>
                  {branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth label="Ghi chú" multiline rows={3} variant="filled" sx={inputStyles} value={appointmentContent} onChange={(e) => setAppointmentContent(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="outlined" sx={{ textTransform: 'none', borderRadius: '8px' }}>Hủy</Button>
              <Button variant="contained" disableElevation sx={{ textTransform: 'none', borderRadius: '8px' }} onClick={async () => {
                // create appointment submit (POST /api/appointments)
                if (!custFullName.trim()) { toast.error('Vui lòng nhập họ tên'); return; }
                if (!serviceId) { toast.error('Chọn dịch vụ'); return; }
                if (!scheduledDate) { toast.error('Chọn ngày dự kiến'); return; }
                // Validation: name (no special chars), phone (starts with 0 and 10 digits), email (@gmail.com)
                try {
                  const nameRegex = new RegExp('^[\\p{L}\\s]+$','u');
                  if (!nameRegex.test(custFullName.trim())) { toast.error('Tên không được chứa ký tự đặc biệt'); return; }
                } catch {
                  const fallbackName = /^[A-Za-z\s.-]+$/;
                  if (!fallbackName.test(custFullName.trim())) { toast.error('Tên không được chứa ký tự đặc biệt'); return; }
                }
                if (custPhone && custPhone.trim()) {
                  if (!/^0\d{9}$/.test(custPhone.trim())) { toast.error('Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số'); return; }
                }
                if (custEmail && custEmail.trim()) {
                  if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(custEmail.trim())) { toast.error('Email phải là địa chỉ @gmail.com'); return; }
                }
                // Build scheduledTime ISO.
                // Interpret the selected date+time as local time, then convert to an ISO UTC string.
                // Using a plain `${date}T${time}` (no trailing 'Z') constructs a local Date in JS.
                const timePart = scheduledTime || '09:00';
                // validate business hours
                if (!isTimeInBusinessHours(timePart)) {
                  toast.error('Giờ đặt phải trong khoảng 08:00 - 20:00');
                  return;
                }
                // validate date not older than 3 months
                if (!isDateNotOlderThanMonths(scheduledDate, timePart, 3)) {
                  toast.error('Ngày hẹn không được quá cũ (không quá 3 tháng trước)');
                  return;
                }
                // disallow past datetime
                if (!isNotInPast(scheduledDate, timePart)) {
                  toast.error('Không thể chọn ngày/giờ trong quá khứ');
                  return;
                }
                // disallow booking too far in the future (> 3 months)
                if (!isWithinNextMonths(scheduledDate, timePart, 3)) {
                  toast.error('Ngày hẹn không được đặt trước quá 3 tháng');
                  return;
                }
                // Build ISO and local representations in a robust, device-independent way.
                // Parse numeric components to avoid inconsistent Date parsing across browsers.
                const buildScheduledIsoAndLocal = (dateStr: string, timeStr: string) => {
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const [y, m, d] = (dateStr || '').split('-').map(s => Number(s));
                  const [hh, mm] = (timeStr || '00:00').split(':').map(s => Number(s));
                  // Construct a Date using numeric components (interpreted as local time)
                  const localDt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
                  const iso = localDt.toISOString(); // canonical UTC ISO string
                  const scheduledLocal = `${y}-${pad(m || 1)}-${pad(d || 1)} ${pad(hh || 0)}:${pad(mm || 0)}`;
                  // timezone offset like +07:00
                  const offsetMin = -localDt.getTimezoneOffset();
                  const sign = offsetMin >= 0 ? '+' : '-';
                  const offH = pad(Math.floor(Math.abs(offsetMin) / 60));
                  const offM = pad(Math.abs(offsetMin) % 60);
                  const scheduledLocalWithOffset = `${scheduledLocal} ${sign}${offH}:${offM}`;
                  return { iso, scheduledLocal, scheduledLocalWithOffset };
                };

                const { iso, scheduledLocalWithOffset } = buildScheduledIsoAndLocal(scheduledDate, timePart);
                const scheduledLocal = scheduledLocalWithOffset;

                // Try to resolve current user as receptionistId
                let receptionistIdNum = 0;
                try {
                  const meRes = await UserAPI.me();
                  // meRes may be ApiResponse<UserMe> or raw UserMe
                  if (meRes && typeof meRes === 'object') {
                    const maybe = meRes as unknown as { data?: unknown; id?: number };
                    if (maybe.data && typeof maybe.data === 'object') {
                      const d = maybe.data as { id?: number };
                      if (typeof d.id === 'number') receptionistIdNum = d.id;
                    } else if (typeof maybe.id === 'number') {
                      receptionistIdNum = maybe.id;
                    }
                  }
                } catch {
                  receptionistIdNum = 0;
                }

                const createPayload: CreateAppointmentPayload = {
                  customerId: selectedCustomer ? selectedCustomer.id : undefined,
                  customerName: custFullName.trim(),
                  customerEmail: custEmail.trim(),
                  customerPhone: custPhone.trim(),
                  dentistRefId: typeof dentistId === 'number' ? dentistId : 0,
                  receptionistId: typeof receptionistIdNum === 'number' ? receptionistIdNum : 0,
                  assistantId: typeof assistantId === 'number' ? assistantId : undefined,
                  branchId: typeof branchId === 'number' ? branchId : undefined,
                  serviceId: typeof serviceId === 'number' ? serviceId : 0,
                  estimatedMinutes: duration || 0,
                  scheduledTime: iso,
                  scheduledLocal: scheduledLocal,
                  notes: appointmentContent.trim(),
                  status: 'PENDING'
                };
                console.debug('createAppointment payload:', createPayload);
                try {
                  const res = await AppointmentAPI.create(createPayload);
                  console.debug('createAppointment response:', res);
                  if (res.success) {
                    toast.success('Đặt điều trị thành công');
                    // reset fields
                    setCustFullName(''); setCustEmail(''); setCustPhone(''); setServiceId(''); setScheduledDate(''); setScheduledTime('09:00'); setDentistId(''); setAssistantId(''); setAppointmentContent(''); setSelectedCustomer(null);
                  } else {
                    toast.error(res.message || 'Đặt điều trị thất bại');
                  }
                } catch (err) {
                  console.error(err);
                  toast.error('Lỗi mạng hoặc máy chủ');
                }
              }}>Đặt điều trị</Button>
            </Grid>
          </Grid>
        </TabPanel>
      </CardContent>
    </Card>
  );
}