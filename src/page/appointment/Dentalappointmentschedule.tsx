import { useEffect, useMemo, useState } from 'react';
import { Typography, CircularProgress, Box, Chip, ToggleButtonGroup, ToggleButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Card, CardContent, Grid, CardActions, Button, TextField, Select, MenuItem, FormControl, InputLabel, TablePagination, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { PickersDay } from '@mui/x-date-pickers';
import type { PickersDayProps } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AppointmentDetailModal } from '@/components/appointment/AppointmentDetailModal';
import { ConsultationDetailModal } from '@/components/appointment/ConsultationDetailModal';
import { AppointmentAPI, type AppointmentItem } from '@/services/appointments';
import { DentistAPI, type Dentist } from '@/services/dentist';
import { ConsultationAPI, type ConsultationItem } from '@/services/consultation-ab';
import { UserAPI, type UserMe } from '@/services/user';
import { Table2, TableOfContents } from 'lucide-react';

type DisplayItem = AppointmentItem & { isConsultation?: boolean; consultationId?: number };

export default function DentalAppointmentSchedule() {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
    const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
    // set of YYYY-MM-DD for the current month that have at least one appointment
    const [monthAppointmentDates, setMonthAppointmentDates] = useState<Set<string>>(new Set());
    const [dentist, setDentist] = useState<Dentist | null>(null);
    // date string in local YYYY-MM-DD (use local date, not toISOString which uses UTC)
    const formatDateLocal = (d: Date) => {
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [date, setDate] = useState<string>(() => {
        const t = new Date();
        return formatDateLocal(t);
    });
    const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<AppointmentItem | null>(null);
    const [selectedConsultation, setSelectedConsultation] = useState<ConsultationItem | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'card'>(() => 'table');
    // search / filter / pagination
    const [search, setSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);

    const qLower = search.trim().toLowerCase();

    const displayItems = useMemo(() => {
        const mapConsultationToDisplay = (c: ConsultationItem): DisplayItem | null => {
            if (!c.scheduledTime) return null;
            const d = new Date(c.scheduledTime);
            if (Number.isNaN(d.getTime())) return null;
            const key = formatDateLocal(d);
            if (key !== date) return null;
            const serviceName = c.service?.name || '';
            return {
                id: (Number(c.id) || 0) + 10000000,
                scheduledTime: c.scheduledTime,
                status: 'CONSULTATION',
                customerName: c.customerName || c.customer?.fullName || '',
                customerEmail: c.customerEmail || undefined,
                customerUsername: undefined,
                serviceName: serviceName ? `[Tư vấn] ${serviceName}` : '[Tư vấn]',
                label: serviceName ? `[Tư vấn] ${serviceName}` : 'Tư vấn',
                branchName: c.branch?.name,
                isConsultation: true,
                consultationId: c.id,
            } as DisplayItem;
        };

        const mappedConsultations = consultations.map(mapConsultationToDisplay).filter(Boolean) as DisplayItem[];
        const mappedAppointments = appointments.map(a => ({ ...a, isConsultation: false } as DisplayItem));
        return [...mappedAppointments, ...mappedConsultations];
    }, [appointments, consultations, date]);

    const filteredAppointments = useMemo(() => {
        return displayItems.filter((a) => {
            if (statusFilter && ((a.status || '').toString() !== statusFilter)) return false;
            if (!qLower) return true;
            const hay = `${a.customerName ?? ''} ${a.customerUsername ?? ''} ${a.customerEmail ?? ''} ${a.label ?? ''} ${a.serviceName ?? ''}`.toLowerCase();
            return hay.includes(qLower);
        });
    }, [displayItems, statusFilter, qLower]);

    const filteredCount = filteredAppointments.length;
    const pagedAppointments = filteredAppointments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // Initial load: get user and dentist once on mount
    useEffect(() => {
        let mounted = true;
        async function init() {
            setLoading(true);
            setError(null);
            try {
                const meRes = await UserAPI.me();
                const user: UserMe | null = meRes && meRes.data ? meRes.data as UserMe : null;
                if (!user || !user.id) {
                    if (mounted) setError('Không lấy được thông tin người dùng.');
                    return;
                }

                const dRes = await DentistAPI.getDentists();
                const list: Dentist[] = (() => {
                    if (dRes && typeof dRes === 'object' && Array.isArray((dRes as unknown as Record<string, unknown>).data)) {
                        return (dRes as unknown as { data: unknown }).data as Dentist[];
                    }
                    if (Array.isArray(dRes)) return dRes as Dentist[];
                    return [] as Dentist[];
                })();
                const matched = list.find(d => Number(d.userId) === Number(user.id));
                if (!matched) {
                    if (mounted) setError('Tài khoản hiện tại không phải là nha sĩ hoặc chưa liên kết với hồ sơ nha sĩ.');
                    return;
                }
                if (mounted) setDentist(matched);
            } catch (err) {
                console.error(err);
                if (mounted) setError((err as Error)?.message || 'Lỗi khi tải thông tin người dùng.');
            } finally {
                if (mounted) setLoading(false);
            }
        }
        init();
        return () => { mounted = false; };
    }, []);

    // load appointments for the selected day only (runs when `date` or `dentist` changes)
    const [dayLoading, setDayLoading] = useState(false);
    const monthKey = date.slice(0, 7);
    useEffect(() => {
        let mounted = true;
        async function loadDay() {
            if (!dentist) return;
            setDayLoading(true);
            try {
                const unwrapArray = (res: unknown): unknown[] => {
                    if (res && typeof res === 'object' && 'success' in (res as Record<string, unknown>) && Array.isArray((res as Record<string, unknown>).data)) {
                        return (res as Record<string, unknown>).data as unknown[];
                    }
                    if (Array.isArray(res)) return res as unknown[];
                    return [];
                };

                const [sched, consultRes] = await Promise.all([
                    AppointmentAPI.getDaySchedule(dentist.id, date),
                    ConsultationAPI.getByDentist(Number(dentist.id)),
                ]);

                const rawAppointments = unwrapArray(sched);
                const apps: AppointmentItem[] = (rawAppointments || []).map((r) => r as AppointmentItem);

                const rawConsultations = unwrapArray(consultRes) as ConsultationItem[];
                const dayConsultations = rawConsultations.filter((c) => {
                    if (!c.scheduledTime) return false;
                    const d = new Date(c.scheduledTime);
                    if (Number.isNaN(d.getTime())) return false;
                    return formatDateLocal(d) === date;
                });

                if (mounted) {
                    setAppointments(apps);
                    setConsultations(dayConsultations);
                }
            } catch (err) {
                console.error(err);
                if (mounted) setError((err as Error)?.message || 'Lỗi khi tải lịch ngày.');
            } finally {
                if (mounted) setDayLoading(false);
            }
        }
        loadDay();
        return () => { mounted = false; };
    }, [date, dentist]);

    // load highlights for the month (only when month changes or dentist is set)
    useEffect(() => {
        let mounted = true;
        async function loadMonthHighlights() {
            if (!dentist) return;
            try {
                const [yStr, mStr] = monthKey.split('-');
                const year = Number(yStr);
                const month = Number(mStr); // 1-12
                const daysInMonth = new Date(year, month, 0).getDate();
                const dayRequests: Promise<unknown>[] = [];
                for (let d = 1; d <= daysInMonth; d++) {
                    const dd = `${d}`.padStart(2, '0');
                    const dayStr = `${yStr}-${mStr}-${dd}`;
                    dayRequests.push(AppointmentAPI.getDaySchedule(dentist.id, dayStr));
                }
                const [dayResults, consultRes] = await Promise.all([
                    Promise.all(dayRequests),
                    ConsultationAPI.getByDentist(Number(dentist.id)),
                ]);

                const isApiResponse = (v: unknown): v is { success: boolean; data?: unknown } => {
                    return !!v && typeof v === 'object' && 'success' in (v as Record<string, unknown>);
                };
                const monthDates = new Set<string>();
                dayResults.forEach((res, idx) => {
                    let arr: unknown[] = [];
                    if (isApiResponse(res)) arr = (res.data as unknown[]) || [];
                    else if (Array.isArray(res)) arr = res as unknown[];
                    if (arr.length > 0) {
                        const d = (idx + 1).toString().padStart(2, '0');
                        monthDates.add(`${yStr}-${mStr}-${d}`);
                    }
                });

                const unwrapArray = (res: unknown): ConsultationItem[] => {
                    if (res && typeof res === 'object' && 'success' in (res as Record<string, unknown>) && Array.isArray((res as Record<string, unknown>).data)) {
                        return (res as Record<string, unknown>).data as ConsultationItem[];
                    }
                    if (Array.isArray(res)) return res as ConsultationItem[];
                    return [] as ConsultationItem[];
                };
                const consults = unwrapArray(consultRes);
                consults.forEach((c) => {
                    if (!c.scheduledTime) return;
                    const d = new Date(c.scheduledTime);
                    if (Number.isNaN(d.getTime())) return;
                    const key = formatDateLocal(d);
                    if (key.startsWith(monthKey)) monthDates.add(key);
                });

                if (mounted) setMonthAppointmentDates(monthDates);
            } catch (err) {
                console.error(err);
            }
        }
        loadMonthHighlights();
        return () => { mounted = false; };
    }, [monthKey, dentist]);

    // Day renderer: highlight days that are present in monthAppointmentDates (pale green)
    const Day = (props: PickersDayProps) => {
        const { day } = props as unknown as { day: Date };
        const key = formatDateLocal(day as Date);
        const has = monthAppointmentDates.has(key);
        return (
            <PickersDay
                {...props}
                day={day}
                sx={has ? { bgcolor: '#e6f4ea', color: 'inherit', '&:hover': { bgcolor: '#d0edd6' } } : undefined}
            />
        );
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[80vh]">
            <CircularProgress />
        </div>
    );
    if (error) return (<Box className="p-4"><Typography color="error">{error}</Typography></Box>);

    return (
        <div className="p-4 bg-white rounded-xl">
            <Box sx={{ display: 'flex', gap: 2, flexDirection: isSmall ? 'column' as const : 'row' as const }}>
                <Box sx={{ width: isSmall ? '100%' : 320, mb: isSmall ? 2 : 0 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <StaticDatePicker
                            displayStaticWrapperAs="desktop"
                            orientation="portrait"
                            value={selectedDate}
                            onChange={(newVal) => {
                                if (!newVal) return;
                                let dateObj: Date;
                                if (newVal instanceof Date) dateObj = newVal;
                                else if (newVal && typeof newVal === 'object' && 'toDate' in newVal && typeof (newVal as unknown as Record<string, unknown>).toDate === 'function') {
                                    dateObj = ((newVal as unknown as Record<string, unknown>).toDate as () => Date)();
                                } else dateObj = new Date(newVal as unknown as string | number);
                                setSelectedDate(dateObj);
                                setDate(formatDateLocal(dateObj));
                            }}
                            slots={{ day: Day }}
                        />
                    </LocalizationProvider>
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Box className="flex items-center justify-between mb-2">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">Lịch của bác sĩ: {dentist?.name ?? '-'}</Typography>
                        </Box>
                        {!isSmall ? <Typography variant="body2" color="text.secondary">Ngày: {date}</Typography> : null}
                    </Box>

                    {/* Search / filters toolbar */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField size="small" placeholder="Tìm kiếm (khách, dịch vụ, tiêu đề)" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ minWidth: 240 }} />
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select value={statusFilter} label="Trạng thái" onChange={(e) => { setStatusFilter(e.target.value as string); setPage(0); }}>
                                <MenuItem value="">Tất cả</MenuItem>
                                <MenuItem value="PENDING">PENDING</MenuItem>
                                <MenuItem value="CONFIRMED">CONFIRMED</MenuItem>
                                <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                                <MenuItem value="CANCELLED">CANCELLED</MenuItem>
                                <MenuItem value="CONSULTATION">TƯ VẤN</MenuItem>
                            </Select>
                        </FormControl>

                        <ToggleButtonGroup
                            size="small"
                            value={viewMode}
                            exclusive
                            onChange={(_, val) => { if (val) setViewMode(val); }}
                            aria-label="view mode"
                        >
                            <ToggleButton value="table" aria-label="table view">
                                <Table2 className='w-4 h-4 mr-2' />Bảng</ToggleButton>
                            <ToggleButton value="card" aria-label="card view">
                                <TableOfContents className='w-4 h-4 mr-2' />Thẻ</ToggleButton>
                        </ToggleButtonGroup>


                    </Box>
                    <div className="flex flex-row mb-2">
                        <div className="flex items-center">
                            <span className='h-4 w-4 bg-blue-500 rounded-full mr-2'></span>
                            <p>Lịch hẹn hiện tại</p>
                        </div>
                        <div className="flex items-center ml-4">
                            <span className='h-4 w-4 bg-green-500 rounded-full mr-2'></span>
                            <p>Lịch hẹn từng ngày</p>
                        </div>
                        <div className="flex items-center ml-4">
                            <span className='h-4 w-4 bg-purple-500 rounded-full mr-2'></span>
                            <p>Lịch tư vấn</p>
                        </div>
                    </div>

                    {dayLoading ? (
                        <div className="w-full h-[70vh] flex flex-col items-center justify-center">
                            <CircularProgress />
                        </div>
                    ) : displayItems.length === 0 ? (
                        <div className="w-full h-[70vh] flex flex-col items-center justify-center">
                            <img src="/planet.png" alt="planet" className="w-[200px] h-1/3" />
                            <Typography variant="h6" color="text.secondary">Không có lịch hẹn cho ngày đã chọn.</Typography>
                        </div>
                    ) : (
                        viewMode === 'table' ? (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Thời gian</TableCell>
                                            <TableCell>Khách</TableCell>
                                            <TableCell>Dịch vụ</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pagedAppointments.map((a) => {
                                            const isConsult = (a as DisplayItem).isConsultation;
                                            const statusLabel = isConsult ? 'TƯ VẤN' : (a.status ?? '-');

                                            const handleOpenDetail = () => {
                                                if (isConsult) {
                                                    const found = consultations.find(c => c.id === (a as DisplayItem).consultationId) || null;
                                                    setSelectedConsultation(found);
                                                    setSelectedAppointmentDetail(null);
                                                } else {
                                                    setSelectedAppointmentDetail(a as AppointmentItem);
                                                    setSelectedConsultation(null);
                                                }
                                                setModalOpen(true);
                                            };

                                            return (
                                                <TableRow key={a.id} hover onClick={handleOpenDetail} style={{ cursor: 'pointer' }}>
                                                    <TableCell>{a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</TableCell>
                                                    <TableCell>{a.customerName ?? a.customerUsername ?? a.customerEmail ?? '-'}</TableCell>
                                                    <TableCell>{a.serviceName ?? '-'}</TableCell>
                                                    <TableCell>{statusLabel}</TableCell>
                                                    <TableCell align="right">
                                                        <Button size="small" onClick={(e) => { e.stopPropagation(); handleOpenDetail(); }}>Xem</Button>
                                                        {!isConsult && (
                                                            <Button size="small" variant="contained" color="primary" sx={{ ml: 1 }} onClick={(e) => {
                                                                e.stopPropagation();
                                                                try { window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'prescription', appointmentId: a.id } })); } catch (err) { console.warn('app:navigate dispatch failed', err); }
                                                            }}>Điều trị</Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                                    <TablePagination
                                        component="div"
                                        count={filteredCount}
                                        page={page}
                                        onPageChange={(_, newPage) => setPage(newPage)}
                                        rowsPerPage={rowsPerPage}
                                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                                        rowsPerPageOptions={[5, 10, 20, 50]}
                                    />
                                </Box>
                            </TableContainer>
                        ) : (
                            <Grid container spacing={2}>
                                {pagedAppointments.map((a) => (
                                    <Grid item xs={12} sm={6} md={4} key={a.id}>
                                        <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => {
                                            const isConsult = (a as DisplayItem).isConsultation;
                                            if (isConsult) {
                                                const found = consultations.find(c => c.id === (a as DisplayItem).consultationId) || null;
                                                setSelectedConsultation(found);
                                                setSelectedAppointmentDetail(null);
                                            } else {
                                                setSelectedAppointmentDetail(a as AppointmentItem);
                                                setSelectedConsultation(null);
                                            }
                                            setModalOpen(true);
                                        }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="subtitle2">{a.label ?? 'Lịch'}</Typography>
                                                    <Chip label={(a as DisplayItem).isConsultation ? 'TƯ VẤN' : (a.status ?? '')} size="small" color={(a as DisplayItem).isConsultation ? 'secondary' : 'default'} />
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">{a.serviceName ?? '-'}</Typography>
                                                <Typography variant="body2" color="text.secondary">{a.branchName ?? '-'}</Typography>
                                                <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold', borderBottom: 1, borderColor: 'divider' }}>
                                                    {a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    -
                                                    {a.scheduledTime ? new Date(a.scheduledTime).toLocaleDateString() : ''}
                                                </Typography>
                                            </CardContent>
                                            <CardActions>
                                                <Button size="small" onClick={(e) => {
                                                    e.stopPropagation();
                                                    const isConsult = (a as DisplayItem).isConsultation;
                                                    if (isConsult) {
                                                        const found = consultations.find(c => c.id === (a as DisplayItem).consultationId) || null;
                                                        setSelectedConsultation(found);
                                                        setSelectedAppointmentDetail(null);
                                                    } else {
                                                        setSelectedAppointmentDetail(a as AppointmentItem);
                                                        setSelectedConsultation(null);
                                                    }
                                                    setModalOpen(true);
                                                }}>Chi tiết</Button>
                                                {!(a as DisplayItem).isConsultation && (
                                                    <Button size="small" variant="contained" color="primary" onClick={(e) => {
                                                        e.stopPropagation();
                                                        try { window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'prescription', appointmentId: a.id } })); } catch (err) { console.warn('app:navigate dispatch failed', err); }
                                                    }}>Điều trị</Button>
                                                )}
                                            </CardActions>
                                        </Card>
                                    </Grid>
                                ))}
                                <Stack sx={{ width: '100%', alignItems: 'center', mt: 2 }}>
                                    <TablePagination
                                        component="div"
                                        count={filteredCount}
                                        page={page}
                                        onPageChange={(_, newPage) => setPage(newPage)}
                                        rowsPerPage={rowsPerPage}
                                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                                        rowsPerPageOptions={[5, 10, 20, 50]}
                                    />
                                </Stack>
                            </Grid>
                        )
                    )}
                </Box>
            </Box>

            {selectedConsultation ? (
                <ConsultationDetailModal open={modalOpen} onClose={() => { setModalOpen(false); setSelectedConsultation(null); }} consultation={selectedConsultation} />
            ) : (
                <AppointmentDetailModal open={modalOpen} onClose={() => { setModalOpen(false); setSelectedAppointmentDetail(null); }} appointment={selectedAppointmentDetail} fullScreen={isSmall} />
            )}
        </div>
    );
}
