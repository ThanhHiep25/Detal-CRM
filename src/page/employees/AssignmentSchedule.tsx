
import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider, useMediaQuery, useTheme, Grid, Stack, Chip } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
// calendar grid implemented locally
import { DentistAssignmentsAPI, DentistAssignment } from '@/services/dentistAssignments';
import { DentistAPI, Dentist } from '@/services/dentist';
import { ServiceAPI, ServiceItem } from '@/services/service';
import { BranchAPI, Branch } from '@/services/branches';
import { UserAPI, UserMe } from '@/services/user';

// helper to detect ApiResponse-like wrapper
function isApiResponse<T>(v: unknown): v is { data?: T } {
    return typeof v === 'object' && v !== null && 'data' in (v as Record<string, unknown>);
}

function weekdayFromDate(date: Date) {
    const map = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return map[date.getDay()];
}

function parseScheduleJson(json?: string | null) {
    if (!json) return {} as Record<string, Array<{ start: string; end: string }>>;
    try {
        const arr = JSON.parse(json) as Array<{ day: string; shifts: Array<{ start: string; end: string }> }>;
        const out: Record<string, Array<{ start: string; end: string }>> = {};
        for (const item of arr) out[item.day] = item.shifts || [];
        return out;
    } catch {
        return {} as Record<string, Array<{ start: string; end: string }>>;
    }
}

function formatMinutes(min: number) {
    const hh = Math.floor(min / 60);
    const mm = min % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const AssignmentSchedule: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [assignments, setAssignments] = useState<DentistAssignment[]>([]);
    const [dentists, setDentists] = useState<Dentist[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [me, setMe] = useState<UserMe | null>(null);
    const [loading, setLoading] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [modalAssignment, setModalAssignment] = useState<DentistAssignment | null>(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
    const [showTimelineOnMobile, setShowTimelineOnMobile] = useState(false);


    function sameDay(a: Date, b: Date) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }





    // Check whether `date` falls within the assignment's active period:
    // - Starts at `weekStart` (anchor)
    // - Extends to end of month OR until the next assignment for the same dentist starts
    function isDateInAssignmentPeriod(assignment: DentistAssignment, date: Date, allAssignments: DentistAssignment[]) {
        try {
            const anchor = assignment.weekStart ?? assignment.createdAt ?? null;
            if (!anchor) return false;
            
            const a = new Date(anchor);
            a.setHours(0, 0, 0, 0);
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            
            // Check if date is before assignment start
            if (d.getTime() < a.getTime()) return false;
            
            // Find the end date for this assignment
            // 1. Get end of month from assignment start
            const endOfMonth = new Date(a.getFullYear(), a.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            
            // 2. Find next assignment for same dentist with later weekStart
            const nextAssignment = allAssignments
                .filter(a => {
                    if ((a.dentistId ?? 0) !== (assignment.dentistId ?? 0)) return false;
                    if (a.id === assignment.id) return false;
                    const nextStart = a.weekStart ?? a.createdAt ?? null;
                    if (!nextStart) return false;
                    const nextDate = new Date(nextStart);
                    return nextDate.getTime() > new Date(anchor).getTime();
                })
                .sort((a, b) => {
                    const aStart = new Date(a.weekStart ?? a.createdAt ?? 0);
                    const bStart = new Date(b.weekStart ?? b.createdAt ?? 0);
                    return aStart.getTime() - bStart.getTime();
                })[0];
            
            // 3. Determine end date: earlier of end-of-month or next assignment start
            let endDate = endOfMonth;
            if (nextAssignment) {
                const nextStart = new Date(nextAssignment.weekStart ?? nextAssignment.createdAt ?? endOfMonth);
                nextStart.setHours(0, 0, 0, 0);
                if (nextStart.getTime() < endDate.getTime()) {
                    endDate = new Date(nextStart.getTime() - 1); // End just before next assignment
                }
            }
            
            // Check if date is within the period
            return d.getTime() >= a.getTime() && d.getTime() <= endDate.getTime();
        } catch {
            return false;
        }
    }

    // calendarDays are provided by DateCalendar; we keep viewMonth state for header sync


    // (Day-specific previews/badges were removed to use the default DateCalendar appearance.)

    // DateCalendar will manage its own header/month navigation; no local viewMonth state needed

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        (async () => {
            try {
                const [aRes, dRes, sRes, bRes, meRes] = await Promise.all([
                    DentistAssignmentsAPI.getAssignments(),
                    DentistAPI.getDentists(),
                    ServiceAPI.getServices(),
                    BranchAPI.getBranches(),
                    UserAPI.getMe()
                ]);
                if (!mounted) return;
                if (aRes && aRes.success && Array.isArray(aRes.data)) setAssignments(aRes.data as DentistAssignment[]);
                else setAssignments([]);
                if (dRes && dRes.success && Array.isArray(dRes.data)) setDentists(dRes.data as Dentist[]);
                else setDentists([]);
                if (sRes && (sRes as { success?: boolean; data?: unknown }).success && Array.isArray((sRes as { data?: unknown }).data)) {
                    setServices(((sRes as { data?: unknown }).data as ServiceItem[]));
                } else setServices([]);
                if (bRes && (bRes as { success?: boolean; data?: unknown }).success && Array.isArray((bRes as { data?: unknown }).data)) {
                    setBranches(((bRes as { data?: unknown }).data as Branch[]));
                } else setBranches([]);
                // meRes may be ApiResponse<UserMe> or raw UserMe depending on service method; normalize
                let maybeMe: UserMe | null = null;
                if (isApiResponse<UserMe>(meRes)) maybeMe = (meRes as { data?: UserMe }).data ?? null;
                else maybeMe = (meRes as UserMe) ?? null;
                setMe(maybeMe);
            } catch (err) {
                console.error('Failed loading assignments/dentists/me', err);
                setAssignments([]);
                setDentists([]);
                setMe(null);
            } finally {
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // determine if current user is dentist role
    const userRole = (() => {
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return undefined;
            const parsed = JSON.parse(raw) as { role?: string };
            return parsed?.role;
        } catch {
            return undefined;
        }
    })();

    // find dentistId for current user (if dentist)
    const myDentistId = (() => {
        if (!me) return undefined;
        const d = dentists.find(x => x.userId === me.id);
        return d?.id;
    })();

    // helper: check if a given date has any assignment (either createdAt matches or scheduleJson contains shifts for that weekday)
    function dateHasAssignment(d?: Date | null) {
        if (!d) return false;
        try {
            // when the current user is a dentist, only consider assignments for that dentist
            const relevant = (userRole === 'ROLE_DENTIST' && myDentistId)
                ? assignments.filter(a => (a.dentistId ?? 0) === myDentistId)
                : assignments;
            const iso = d.toISOString().slice(0, 10);
            // quick createdAt match for single-date assignments ONLY when there is no scheduleJson.
            if (relevant.some(a => a.createdAt && !a.scheduleJson && a.createdAt.slice(0, 10) === iso)) return true;
            // check scheduleJson for weekday
            const wd = weekdayFromDate(d);
            return relevant.some(a => {
                const map = parseScheduleJson(a.scheduleJson ?? null);
                const shifts = map[wd] || [];
                if (!Array.isArray(shifts) || shifts.length === 0) return false;
                // Check if date is within the assignment's active period
                return isDateInAssignmentPeriod(a, d, assignments);
            });
        } catch {
            return false;
        }
    }

    // custom day renderer for DateCalendar: highlight days that have assignments
    function CustomDay(props: PickersDayProps) {
        const { day, ...other } = props as PickersDayProps;
        const has = dateHasAssignment(day as Date);
        return (
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <PickersDay
                    {...other}
                    day={day}
                    sx={has ? { bgcolor: 'rgba(16,185,129,0.12)', color: 'success.main', '&:hover': { bgcolor: 'rgba(16,185,129,0.18)' } } : {}}
                />
            </Box>
        );
    }



    function getAssignmentsForDate(date: Date | null) {
        if (!date) return [] as DentistAssignment[];
        const wd = weekdayFromDate(date);
        const out: DentistAssignment[] = [];
        for (const a of assignments) {
            // If current user is a dentist, only show assignments assigned to them
            if (userRole === 'ROLE_DENTIST' && myDentistId) {
                if ((a.dentistId ?? 0) !== myDentistId) continue;
            }

            if (a.createdAt && !a.scheduleJson) {
                const d = new Date(a.createdAt);
                if (!isNaN(d.getTime()) && sameDay(d, date)) { out.push(a); continue; }
            }
            const map = parseScheduleJson(a.scheduleJson ?? null);
            const shifts = map[wd] || [];
            if (!Array.isArray(shifts) || shifts.length === 0) continue;
            // Check if date is within the assignment's active period (extends to end of month or next assignment)
            if (isDateInAssignmentPeriod(a, date, assignments)) {
                out.push(a);
            }
        }
        return out;
    }

    // list assignments that start in the future relative to the provided date (or today)
    function getUpcomingAssignments(date: Date | null) {
        const base = date ? new Date(date) : new Date();
        // normalize base to 00:00 for fair comparison
        base.setHours(0, 0, 0, 0);
        const out: DentistAssignment[] = [];
        // when the current user is a dentist, only include upcoming assignments for them
        const relevant = (userRole === 'ROLE_DENTIST' && myDentistId)
            ? assignments.filter(a => (a.dentistId ?? 0) === myDentistId)
            : assignments;
        for (const a of relevant) {
            if (!a.weekStart) continue;
            const ws = new Date(a.weekStart);
            if (isNaN(ws.getTime())) continue;
            if (ws.getTime() > base.getTime()) out.push(a);
        }
        return out;
    }

    function getDentistNameById(id?: number | null) {
        if (!id) return '---';
        // If current user is dentist and id matches, show 'Bạn' for clarity
        if (userRole === 'ROLE_DENTIST' && myDentistId && id === myDentistId) {
            const d = dentists.find(x => x.id === id);
            return d?.name ? `Bạn (${d.name})` : 'Bạn';
        }
        const d = dentists.find(x => x.id === id);
        return d?.name ?? String(id);
    }

    function getServiceNameById(id?: number | null) {
        if (!id) return '---';
        const s = services.find(x => x.id === id);
        return s?.name ?? String(id);
    }

    function getBranchNameById(id?: number | null) {
        if (!id) return '---';
        // first try branches API
        const b = branches.find(x => x.id === id);
        if (b) return b.name;
        // fallback: try to find in dentists' branchNames
        for (const d of dentists) {
            if (Array.isArray(d.branchIds) && d.branchIds.includes(id)) {
                if (Array.isArray(d.branchNames)) {
                    const idx = d.branchIds.indexOf(id);
                    return d.branchNames[idx] ?? String(id);
                }
            }
        }
        return String(id);
    }

    return (
        <Box className="p-6 bg-white rounded-xl space-y-4 w-[80vw]">
            <div className="max-w-8xl mx-auto space-y-4">
                <div className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center">
                        <Typography variant="h5" fontWeight="bold">Lịch phân công nhân viên</Typography>
                        <div className="flex bg-slate-400/80  rounded-full  px-3 py-1  items-center ml-6 gap-2">
                            <span className='w-4 h-4 bg-blue-500 rounded-full'></span>
                            <p> Đang làm việc</p>
                        </div>

                        <div className="flex bg-slate-400/80 rounded-full px-3 py-1 items-center ml-6 gap-2">
                            <span className='w-4 h-4 bg-red-500 rounded-full'></span>
                            <p> Nghỉ phép</p>
                        </div>

                    </div>
                </div>
            </div>

            <div className="flex gap-4 flex-col lg:flex-row">
                <Paper className="p-3" sx={{ width: { xs: '100%', lg: 360 } }}>
                    {/* Month calendar grid */}
                    <div className="text-sm text-gray-600 mb-2">Hiển thị: {userRole === 'ROLE_DENTIST' ? 'Lịch của bạn' : 'Tất cả nhân viên'}</div>

                    <div className="mb-2">
                        <DateCalendar
                            value={selectedDate}
                            onChange={(d) => { if (d) setSelectedDate(d instanceof Date ? d : d.toDate()); }}
                            slots={{ day: CustomDay }}
                        />
                    </div>

                    {/* Summary panel for selected date */}
                    <div>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>Chi tiết: {selectedDate ? selectedDate.toLocaleDateString() : '-'}</Typography>
                        <Paper variant="outlined" sx={{ p: 1, maxHeight: 260, overflow: 'auto' }}>
                            <List dense>
                                {(() => {
                                    const todays = getAssignmentsForDate(selectedDate);
                                    if (todays.length === 0) {
                                        return <ListItem><ListItemText primary="Không có phân công" /></ListItem>;
                                    }
                                    return todays.map((a, idx) => {
                                        const wd = weekdayFromDate(selectedDate ?? new Date());
                                        const shifts = parseScheduleJson(a.scheduleJson ?? null)[wd] || [];
                                        return (
                                            <React.Fragment key={idx}>
                                                <ListItem alignItems="flex-start" secondaryAction={(
                                                    <Button size="small" onClick={() => { setModalAssignment(a); setDetailModalOpen(true); }}>Xem thêm</Button>
                                                )}>
                                                    <ListItemText
                                                        primary={getDentistNameById(a.dentistId ?? null)}
                                                        secondary={shifts.length > 0 ? shifts.map(s => `${s.start}-${s.end}`).join(', ') : (a.createdAt ? `Tạo: ${new Date(a.createdAt).toLocaleString()}` : 'Không có ca')}
                                                    />
                                                </ListItem>
                                                <Divider component="li" />
                                            </React.Fragment>
                                        );
                                    });
                                })()}

                                {/* Upcoming assignments (future weekStart) shown when viewing earlier dates */}
                                {(() => {
                                    const upcoming = getUpcomingAssignments(selectedDate);
                                    if (!upcoming || upcoming.length === 0) return null;
                                    return (
                                        <>
                                            <ListItem>
                                                <ListItemText primary={<strong>Sắp có phân công</strong>} />
                                            </ListItem>
                                            <Divider component="li" />
                                            {upcoming.map((a, idx) => {


                                                const ws = a.weekStart ? new Date(a.weekStart) : null;
                                                return (
                                                    <React.Fragment key={"up_" + idx}>
                                                        <ListItem alignItems="flex-start" >
                                                            <div className="flex flex-col">
                                                                <ListItemText
                                                                    primary={`${getDentistNameById(a.dentistId ?? null)} – Bắt đầu ${ws ? ws.toLocaleDateString() : '-'}`}

                                                                />
                                                                <Button size="small" variant='contained' onClick={() => { setModalAssignment(a); setDetailModalOpen(true); }}>
                                                                    Xem thêm
                                                                </Button>
                                                            </div>

                                                        </ListItem>
                                                        <Divider component="li" />
                                                    </React.Fragment>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </List>
                        </Paper>
                    </div>
                </Paper>

                <div className="flex-1">
                    {/* Mobile toggle to show/hide timeline to save vertical space */}
                    <div style={{ marginBottom: 8, display: isMobile ? 'block' : 'none' }}>
                        <Button size="small" variant="outlined" onClick={() => setShowTimelineOnMobile(prev => !prev)}>
                            {showTimelineOnMobile ? 'Ẩn lịch biểu' : 'Hiển thị lịch biểu'}
                        </Button>
                    </div>
                    {/* Timeline view similar to provided mock: columns per dentist, time rows */}
                    {loading ? <Paper className="p-4">Đang tải...</Paper> : (
                        (() => {
                            // determine dentists to show
                            const dentistsToShow = (userRole === 'ROLE_DENTIST' && myDentistId) ? dentists.filter(d => d.id === myDentistId) : dentists;
                            if (!dentistsToShow || dentistsToShow.length === 0) return <Paper className="p-4">Không có bác sĩ để hiển thị</Paper>;

                            // timeline settings
                            const dayStart = 7 * 60; // 07:00
                            const dayEnd = 19 * 60; // 19:00
                            const total = dayEnd - dayStart; // minutes
                            const hours: number[] = [];
                            for (let t = dayStart; t <= dayEnd; t += 60) hours.push(t);

                            // collect shifts per dentist for selectedDate
                            const wd = selectedDate ? weekdayFromDate(selectedDate) : weekdayFromDate(new Date());
                            const shiftsPerDentist: Record<number, Array<{ startMin: number; endMin: number }>> = {};
                            for (const d of dentistsToShow) shiftsPerDentist[d.id] = [];
                            for (const a of assignments) {
                                const did = a.dentistId ?? 0;
                                if (!(did in shiftsPerDentist)) continue;
                                const map = parseScheduleJson(a.scheduleJson ?? null);
                                const shifts = map[wd] || [];
                                if (!Array.isArray(shifts) || shifts.length === 0) continue;
                                // Check if date is within the assignment's active period (extends to end of month or next assignment)
                                if (!isDateInAssignmentPeriod(a, selectedDate ?? new Date(), assignments)) continue;
                                for (const s of shifts) {
                                    const [sh, sm] = s.start.split(':').map(Number);
                                    const [eh, em] = s.end.split(':').map(Number);
                                    const startMin = (sh || 0) * 60 + (sm || 0);
                                    const endMin = (eh || 0) * 60 + (em || 0);
                                    // clamp to timeline range
                                    const sMin = Math.max(startMin, dayStart);
                                    const eMin = Math.min(endMin, dayEnd);
                                    if (eMin > sMin) shiftsPerDentist[did].push({ startMin: sMin, endMin: eMin });
                                }
                            }

                            // hide timeline on mobile unless toggled
                            if (isMobile && !showTimelineOnMobile) return <div />;

                            const columnsTemplate = `80px repeat(${dentistsToShow.length}, minmax(160px, 1fr))`;

                            return (
                                <div className="border rounded bg-white overflow-auto w-[60vw]" style={{ overflowX: 'auto' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: columnsTemplate, minWidth: `${80 + dentistsToShow.length * 160}px` }}>
                                        {/* Header row */}
                                        <div style={{ borderRight: '1px solid rgba(0,0,0,0.08)', padding: '8px 4px' }} />
                                        {dentistsToShow.map(d => {
                                            const isActive = !!d.active;
                                            const dotColor = isActive ? 'rgba(59,130,246,1)' : 'rgba(239,68,68,1)';
                                            return (
                                                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px', borderRight: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: 600 }}>
                                                    <span style={{ width: 10, height: 10, borderRadius: 6, background: dotColor, display: 'inline-block' }} />
                                                    <span>{d.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: columnsTemplate, minWidth: `${80 + dentistsToShow.length * 160}px`, position: 'relative' }}>
                                        {/* Time column */}
                                        <div style={{ borderRight: '1px solid rgba(0,0,0,0.08)' }} className="text-xs text-gray-600">
                                            <div style={{ height: 40 }} />
                                            {hours.map((h, i) => (
                                                <div key={i} style={{ height: 60, display: 'flex', alignItems: 'flex-start', paddingLeft: 8, borderTop: '1px dashed rgba(0,0,0,0.04)' }}>
                                                    {String(Math.floor(h / 60)).padStart(2, '0')}:00
                                                </div>
                                            ))}
                                        </div>

                                        {/* Dentist columns */}
                                        {dentistsToShow.map(d => (
                                            <div key={d.id} style={{ position: 'relative', minHeight: `${hours.length * 60}px`, borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                                                {/* background hour lines */}
                                                {hours.map((_, i) => (
                                                    <div key={i} style={{ height: 60, borderTop: '1px dashed rgba(0,0,0,0.04)' }} />
                                                ))}

                                                {/* shifts */}
                                                {(shiftsPerDentist[d.id] || []).map((sh, idx) => {
                                                    const top = ((sh.startMin - dayStart) / total) * 100;
                                                    const height = ((sh.endMin - sh.startMin) / total) * 100;
                                                    const isActive = !!d.active;
                                                    const bg = isActive ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)';
                                                    const border = isActive ? '4px solid rgba(59,130,246,1)' : '4px solid rgba(239,68,68,1)';
                                                    const titleColor = isActive ? 'rgba(30,64,175,1)' : 'rgba(185,28,28,1)';
                                                    return (
                                                        <div key={idx} style={{ position: 'absolute', left: '8%', right: '8%', top: `${top}%`, height: `${height}%`, background: bg, borderLeft: border, borderRadius: 4, padding: '6px', boxSizing: 'border-box' }}>
                                                            <div className="font-semibold text-sm" style={{ color: titleColor }}>{d.name}</div>
                                                            <div className="text-xs text-gray-600">{formatMinutes(sh.startMin)} - {formatMinutes(sh.endMin)}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}

                                        {/* current time indicator across grid */}
                                        {selectedDate && sameDay(selectedDate, new Date()) && (() => {
                                            const now = new Date();
                                            const nowMin = now.getHours() * 60 + now.getMinutes();
                                            if (nowMin >= dayStart && nowMin <= dayEnd) {
                                                const top = ((nowMin - dayStart) / total) * 100;
                                                return <div style={{ position: 'absolute', left: 80, right: 0, top: `${top}%`, height: 2, background: 'red' }} />;
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>
            </div>

            {/* Detail modal for a single assignment */}
            <Dialog open={detailModalOpen} onClose={() => { setDetailModalOpen(false); setModalAssignment(null); }} maxWidth="md" fullWidth>
                <DialogTitle>Chi tiết phân công</DialogTitle>
                <DialogContent dividers>
                    {modalAssignment ? (
                        <div>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <Stack spacing={1}>
                                        <Typography variant="h6">{getDentistNameById(modalAssignment.dentistId ?? null)}</Typography>
                                        <Typography variant="body2">Mã phân công: <strong>{modalAssignment.id ?? '-'}</strong></Typography>
                                        {modalAssignment.serviceId ? <Typography variant="body2">Dịch vụ: <strong>{getServiceNameById(modalAssignment.serviceId ?? null)}</strong></Typography> : null}
                                        {modalAssignment.branchId ? <Typography variant="body2">Cơ sở: <strong>{getBranchNameById(modalAssignment.branchId ?? null)}</strong></Typography> : null}
                                        {modalAssignment.createdAt ? <Typography variant="body2">Tạo: {new Date(modalAssignment.createdAt as string).toLocaleString()}</Typography> : null}
                                        {modalAssignment.updatedAt ? <Typography variant="body2">Cập nhật: {new Date(modalAssignment.updatedAt as string).toLocaleString()}</Typography> : null}
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={8}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Lịch theo ngày</Typography>
                                    <Paper variant="outlined" sx={{ p: 1, backgroundColor: '#f7f7f7' }}>
                                        <Stack spacing={1}>
                                            {(() => {
                                                try {
                                                    const parsed = parseScheduleJson(modalAssignment.scheduleJson ?? null);
                                                    const order = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                                                    const entries = Object.entries(parsed).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
                                                    if (entries.length === 0) return <Typography variant="body2">Không có lịch</Typography>;
                                                    return entries.map(([day, shifts]) => (
                                                        <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 600 }}>{(function mapDay(d: string) { switch (d) { case 'MONDAY': return 'Thứ Hai'; case 'TUESDAY': return 'Thứ Ba'; case 'WEDNESDAY': return 'Thứ Tư'; case 'THURSDAY': return 'Thứ Năm'; case 'FRIDAY': return 'Thứ Sáu'; case 'SATURDAY': return 'Thứ Bảy'; case 'SUNDAY': return 'Chủ Nhật'; default: return d; } })(day)}</div>
                                                            <div>
                                                                {shifts.length > 0 ? shifts.map((s, i) => (
                                                                    <Chip key={i} label={`${s.start} - ${s.end}`} size="small" sx={{ mr: 0.5 }} />
                                                                )) : <Typography variant="body2">Không có ca</Typography>}
                                                            </div>
                                                        </div>
                                                    ));
                                                } catch {
                                                    return <Typography variant="body2">Không thể phân tích scheduleJson</Typography>;
                                                }
                                            })()}
                                        </Stack>
                                    </Paper>
                                </Grid>
                                {modalAssignment.notes ? (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ mt: 1 }}>Ghi chú</Typography>
                                        <Paper variant="outlined" sx={{ p: 1 }}>{modalAssignment.notes}</Paper>
                                    </Grid>
                                ) : null}
                            </Grid>
                        </div>
                    ) : (
                        <Typography>Không có dữ liệu</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDetailModalOpen(false); setModalAssignment(null); }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AssignmentSchedule;