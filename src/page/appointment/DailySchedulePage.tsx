import { useState, useEffect, useMemo, MouseEvent } from 'react';
import { Typography, CircularProgress, useTheme, useMediaQuery, IconButton, Box, Popover, Button, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, ListItemButton, Divider, Dialog, DialogContent } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { AppointmentCard } from '@/components/appointment/AppointmentCard';
import { AppointmentDetailModal } from '@/components/appointment/AppointmentDetailModal';
import { ConsultationDetailModal } from '@/components/appointment/ConsultationDetailModal';
import type { AppointmentItem } from '@/services/appointments';
import { AppointmentAPI } from '@/services/appointments';
import { ConsultationAPI, type ConsultationItem } from '@/services/consultation-ab';
import { DentistAPI } from '@/services/dentist';
import { ServiceAPI } from '@/services/service';
import { UserAPI } from '@/services/user';
import { Appointment as DataAppointment, AppointmentStatus } from '@/data/data';

// --- CÁC HẰNG SỐ CẤU HÌNH CHO LỊCH ---
const DAY_START_HOUR = 7; // Lịch bắt đầu lúc 7 giờ sáng
const DAY_END_HOUR = 21;  // Lịch kết thúc lúc 21 giờ tối
const HOUR_HEIGHT = 80;   // Chiều cao của một giờ tính bằng pixel
const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60; // Số pixel cho mỗi phút

// NowIndicator: small component that updates its own state on an interval so
// the parent `DailySchedulePage` doesn't re-render every tick.
function NowIndicator({ selectedDate }: { selectedDate: string }) {
  const [offsetPx, setOffsetPx] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      const t = new Date();
      const yyyy = t.getFullYear();
      const mm = String(t.getMonth() + 1).padStart(2, '0');
      const dd = String(t.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      if (selectedDate !== todayStr) {
        setOffsetPx(null);
        return;
      }
      const minutes = t.getHours() * 60 + t.getMinutes();
      const offsetMinutes = minutes - (DAY_START_HOUR * 60);
      if (offsetMinutes < 0 || offsetMinutes > (DAY_END_HOUR - DAY_START_HOUR) * 60) {
        setOffsetPx(null);
      } else {
        // include header offset so 07:00 aligns with first hour row under header
        setOffsetPx(HOUR_HEIGHT + offsetMinutes * PIXELS_PER_MINUTE);
      }
    }

    update();
    const id = setInterval(update, 30 * 1000); // refresh every 30s
    return () => clearInterval(id);
  }, [selectedDate]);

  if (offsetPx == null) return null;
  return (
    <div style={{ top: `${offsetPx}px`, pointerEvents: 'none' }} className="absolute left-0 right-0 h-0.5 bg-red-500 z-40 shadow" />
  );
}

// --- HÀM TIỆN ÍCH ---
const timeToMinutes = (time: string) => {
  if (!time || !time.includes(':')) return 0; // Guard against invalid time format
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// minutesToTime helper removed — creation of appointments disabled so it's unused

type LocalDoctor = {
  id: number;
  name: string;
};

export function DailySchedulePage() {
  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<DataAppointment[]>([]);
  const [consultations, setConsultations] = useState<DataAppointment[]>([]);
  const [rawById, setRawById] = useState<Record<number, unknown>>({});
  const [consultationRawById, setConsultationRawById] = useState<Record<number, unknown>>({});
  const [doctors, setDoctors] = useState<LocalDoctor[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<DataAppointment | AppointmentItem | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationItem | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const openPicker = (e: MouseEvent<HTMLElement>) => {
    if (isMobile) setDialogOpen(true);
    else setPickerAnchor(e.currentTarget as HTMLElement);
  };
  const closePicker = () => { setPickerAnchor(null); setDialogOpen(false); };
  const pickerOpen = Boolean(pickerAnchor);

  // --- DATA FETCHING ---
  useEffect(() => {
    // Fetch dentists and appointments from backend and map to local shapes
    async function loadData(dateStr: string) {
      try {
        setLoading(true);

        // Fetch dentists, services and users in parallel to enrich appointment display
        const [dentistsRes, servicesRes, usersRes] = await Promise.all([
          DentistAPI.getDentists().catch(() => null),
          ServiceAPI.getServices().catch(() => null),
          UserAPI.getUsers().catch(() => null),
        ]);

        const unwrap = (r: unknown): unknown[] => {
          if (r && typeof r === 'object' && 'success' in (r as Record<string, unknown>) && Array.isArray((r as Record<string, unknown>).data)) {
            return (r as Record<string, unknown>).data as unknown[];
          }
          if (Array.isArray(r)) return r as unknown[];
          return [];
        };

        type DentistItem = { id?: number | string; name?: string };
        type ServiceItem = { id?: number | string; name?: string };
        type UserItem = { id?: number | string; fullName?: string; username?: string; email?: string };

        const dentistList = unwrap(dentistsRes) as DentistItem[];
        const serviceList = unwrap(servicesRes) as ServiceItem[];
        const userList = unwrap(usersRes) as UserItem[];

        const serviceMap = new Map<number | string, string>();
        serviceList.forEach((s) => { if (s && s.id != null) serviceMap.set(s.id, s.name || ''); });
        const userMap = new Map<number | string, string>();
        userList.forEach((u) => { if (u && u.id != null) userMap.set(u.id, u.fullName || u.username || u.email || ''); });

        // Fetch all appointments and consultations, then filter by scheduledTime for the selected date
        let rawApps: unknown[] = [];
        const appsRes: unknown = await AppointmentAPI.getAll();
        if (appsRes && typeof appsRes === 'object' && 'success' in (appsRes as Record<string, unknown>) && Array.isArray((appsRes as Record<string, unknown>).data)) {
          rawApps = (appsRes as Record<string, unknown>).data as unknown[];
        } else if (Array.isArray(appsRes)) {
          rawApps = appsRes as unknown[];
        }

        // Fetch consultations
        let rawConsultations: unknown[] = [];
        const consultRes: unknown = await ConsultationAPI.getAll();
        if (consultRes && typeof consultRes === 'object' && 'success' in (consultRes as Record<string, unknown>) && Array.isArray((consultRes as Record<string, unknown>).data)) {
          rawConsultations = (consultRes as Record<string, unknown>).data as unknown[];
        } else if (Array.isArray(consultRes)) {
          rawConsultations = consultRes as unknown[];
        }

        // dateStr passed in is YYYY-MM-DD already

        const hasScheduledTime = (x: unknown): x is Record<string, unknown> & { scheduledTime?: string } => {
          return !!x && typeof x === 'object' && ("scheduledTime" in x && typeof (x as Record<string, unknown>).scheduledTime === 'string');
        };

        const rawMap: Record<number, unknown> = {};
        const mappedApps: DataAppointment[] = rawApps
          .filter(hasScheduledTime)
          // if backend already returned day-schedule, it should only contain items for dateStr
          // otherwise we still filter by dateStr here to be safe
          .filter((a) => {
            try {
              const sched = (a as Record<string, unknown>).scheduledTime;
              const d = new Date(String(sched));
              if (Number.isNaN(d.getTime())) return false;
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const dStr = `${yyyy}-${mm}-${dd}`;
              return dStr === dateStr;
            } catch {
              return false;
            }
          })
          .map((a: Record<string, unknown>) => {
            const sched = a.scheduledTime;
            const d = new Date(String(sched));
            const startH = String(d.getHours()).padStart(2, '0');
            const startM = String(d.getMinutes()).padStart(2, '0');
            const startTime = `${startH}:${startM}`;
            const duration = typeof a.estimatedMinutes === 'number' && a.estimatedMinutes > 0 ? a.estimatedMinutes : (a.serviceDuration || 30);
            const endDate = new Date(d.getTime() + (Number(duration) || 30) * 60000);
            const endH = String(endDate.getHours()).padStart(2, '0');
            const endM = String(endDate.getMinutes()).padStart(2, '0');
            const endTime = `${endH}:${endM}`;

            // pick doctor id from common fields (use Record lookups safely)
            const doctorId = a['dentistId'] ?? a['dentistRefId'] ?? ((a['dentist'] as Record<string, unknown> | undefined)?.['id']) ?? a['doctorId'] ?? null;

            // map status to lowercase known ones if possible
            const rawStatus = (a.status || a.state || '').toString().toLowerCase();
            const status = (rawStatus.includes('confirm') ? 'confirmed' : rawStatus.includes('check') ? 'checked_in' : rawStatus.includes('complete') ? 'completed' : rawStatus.includes('cancel') ? 'cancelled' : 'confirmed') as AppointmentStatus;

            // enrich customer name and service name from fetched maps if possible
            let customerName = (a['customerName'] as string) || (a['customerUsername'] as string) || (a['customer'] as string) || (a['customerEmail'] as string) || '';
            const custId = a['customerId'] ?? a['customer_id'] ?? a['userId'] ?? a['customerId'];
            if (!customerName && custId != null && userMap.has(Number(custId))) {
              customerName = userMap.get(Number(custId)) || customerName;
            }

            let serviceName = (a['serviceName'] as string) || ((a['service'] as Record<string, unknown>) && (a['service'] as Record<string, unknown>)['name'] as string) || (a['label'] as string) || (a['service'] as string) || '';
            const svcId = a['serviceId'] ?? a['service_id'] ?? ((a['service'] as Record<string, unknown>) && (a['service'] as Record<string, unknown>)['id']);
            if (!serviceName && svcId != null && serviceMap.has(Number(svcId))) {
              serviceName = serviceMap.get(Number(svcId)) || serviceName;
            }

            const idVal = Number(a.id) || Math.floor(Math.random() * 1000000000);
            const item = {
              id: idVal,
              doctorId: doctorId ? Number(doctorId) : (dentistList.length ? Number(dentistList[0].id) : 0),
              customerName,
              service: serviceName,
              startTime,
              endTime,
              status,
            } as DataAppointment;
            rawMap[idVal] = a;
            return item;
          });

        // Map consultations to DataAppointment format (use consultation.status when available)
        const consultationRawMap: Record<number, unknown> = {};
        const mappedConsultations: DataAppointment[] = rawConsultations
          .filter(hasScheduledTime)
          .filter((c) => {
            try {
              const sched = (c as Record<string, unknown>).scheduledTime;
              const d = new Date(String(sched));
              if (Number.isNaN(d.getTime())) return false;
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const dStr = `${yyyy}-${mm}-${dd}`;
              return dStr === dateStr;
            } catch {
              return false;
            }
          })
          .map((c: Record<string, unknown>) => {
            const sched = c.scheduledTime;
            const d = new Date(String(sched));
            const startH = String(d.getHours()).padStart(2, '0');
            const startM = String(d.getMinutes()).padStart(2, '0');
            const startTime = `${startH}:${startM}`;
            const duration = typeof c.durationMinutes === 'number' && c.durationMinutes > 0 ? c.durationMinutes : 30;
            const endDate = new Date(d.getTime() + (Number(duration) || 30) * 60000);
            const endH = String(endDate.getHours()).padStart(2, '0');
            const endM = String(endDate.getMinutes()).padStart(2, '0');
            const endTime = `${endH}:${endM}`;

            const doctorId = c['dentistId'] ?? ((c['dentist'] as Record<string, unknown> | undefined)?.['id']) ?? null;

            // Map consultation.status (API: PENDING/CONFIRMED/CANCELLED/COMPLETED) to local appointment status strings
            const rawStatus = ((c['status'] as string) || '').toString().toLowerCase();
            const status = rawStatus.includes('pending') ? 'pending' : rawStatus.includes('confirm') ? 'confirmed' : rawStatus.includes('complete') ? 'completed' : rawStatus.includes('cancel') ? 'cancelled' : 'confirmed';

            let customerName = (c['customerName'] as string) || '';
            const custId = c['customerId'];
            if (!customerName && custId != null && userMap.has(Number(custId))) {
              customerName = userMap.get(Number(custId)) || customerName;
            }

            let serviceName = (c['serviceName'] as string) || ((c['service'] as Record<string, unknown>) && (c['service'] as Record<string, unknown>)['name'] as string) || '';
            const svcId = c['serviceId'] ?? ((c['service'] as Record<string, unknown>) && (c['service'] as Record<string, unknown>)['id']);
            if (!serviceName && svcId != null && serviceMap.has(Number(svcId))) {
              serviceName = serviceMap.get(Number(svcId)) || serviceName;
            }

            // Add prefix to differentiate from appointments
            const idVal = Number(c.id) || Math.floor(Math.random() * 1000000000);
            const consultationId = idVal + 10000000; // offset to avoid id collision
            
            const item = {
              id: consultationId,
              doctorId: doctorId ? Number(doctorId) : (dentistList.length ? Number(dentistList[0].id) : 0),
              customerName,
              service: serviceName ? `[Tư vấn] ${serviceName}` : '[Tư vấn]', // Prefix with consultation label
              startTime,
              endTime,
              status,
            } as DataAppointment;
            consultationRawMap[consultationId] = c;
            return item;
          });

        setDoctors(dentistList.map(d => ({ id: Number(d.id || 0), name: d.name || 'Bác sĩ' })));
        setAppointments(mappedApps);
        setConsultations(mappedConsultations);
        setRawById(rawMap);
        setConsultationRawById(consultationRawMap);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu lịch:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData(selectedDate);
  }, [selectedDate]);

  // --- handle date picker change (handle Date, Dayjs or null) ---
  const handleDateChange = (newVal: unknown) => {
    const toDate = (v: unknown): Date | null => {
      if (!v) return null;
      if (v instanceof Date) return v;
      // Dayjs instances typically have toDate(), or internal $d holding a Date
      if (typeof v === 'object' && v !== null) {
        const obj = v as Record<string, unknown>;
        const toDateFn = obj['toDate'];
        if (typeof toDateFn === 'function') {
          try { return (toDateFn as () => Date)(); } catch { /* ignore */ }
        }
        if ('$d' in obj && obj['$d'] instanceof Date) {
          return obj['$d'] as Date;
        }
      }
      return null;
    };

    const d = toDate(newVal);
    if (!d || Number.isNaN(d.getTime())) return;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // --- DATA PROCESSING (OPTIMIZATION) ---
  const appointmentsByDoctor = useMemo(() => {
    const grouped: { [key: number]: DataAppointment[] } = {};
    // Combine appointments and consultations
    const allItems = [...appointments, ...consultations];
    allItems.forEach(apt => {
      if (!grouped[apt.doctorId]) {
        grouped[apt.doctorId] = [];
      }
      grouped[apt.doctorId].push(apt);
    });
    // Sort by start time
    Object.keys(grouped).forEach(key => {
      grouped[Number(key)].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    });
    return grouped;
  }, [appointments, consultations]); // Chỉ tính toán lại khi danh sách appointments hoặc consultations thay đổi

  // Compute horizontal layout for overlapping items per doctor
  const layoutByDoctor = useMemo(() => {
    const result: Record<number, Record<number, { leftPercent: number; widthPercent: number }>> = {};
    Object.keys(appointmentsByDoctor).forEach((key) => {
      const docId = Number(key);
      const list = appointmentsByDoctor[docId] || [];
      // convert to intervals with numeric minutes
      const intervals = list.map((it) => ({
        id: it.id,
        start: timeToMinutes(it.startTime),
        end: timeToMinutes(it.endTime) || (timeToMinutes(it.startTime) + 30)
      }));

      // build continuous overlap groups
      const groups: Array<typeof intervals> = [];
      let currentGroup: typeof intervals = [];
      let groupEnd = -1;
      for (const iv of intervals) {
        if (currentGroup.length === 0) {
          currentGroup.push(iv);
          groupEnd = iv.end;
        } else {
          if (iv.start < groupEnd) {
            currentGroup.push(iv);
            groupEnd = Math.max(groupEnd, iv.end);
          } else {
            groups.push(currentGroup);
            currentGroup = [iv];
            groupEnd = iv.end;
          }
        }
      }
      if (currentGroup.length) groups.push(currentGroup);

      const mapping: Record<number, { leftPercent: number; widthPercent: number }> = {};

      // For each group, assign columns
      for (const group of groups) {
        // columns store end time for each column
        const columnsEnd: number[] = [];
        const assigned: Array<{ id: number; col: number }> = [];
        // ensure group is sorted by start
        group.sort((a, b) => a.start - b.start);
        for (const ev of group) {
          let placed = false;
          for (let i = 0; i < columnsEnd.length; i++) {
            if (ev.start >= columnsEnd[i]) {
              // place in this column
              assigned.push({ id: ev.id, col: i });
              columnsEnd[i] = ev.end;
              placed = true;
              break;
            }
          }
          if (!placed) {
            columnsEnd.push(ev.end);
            assigned.push({ id: ev.id, col: columnsEnd.length - 1 });
          }
        }

        const totalCols = Math.max(1, columnsEnd.length);
        // horizontal spacing
        const gap = 2; // percent gap between columns
        const totalGap = gap * (totalCols + 1);
        const available = Math.max(0, 100 - totalGap);
        const colWidth = available / totalCols;

        for (const a of assigned) {
          const left = gap + a.col * (colWidth + gap);
          mapping[a.id] = { leftPercent: left, widthPercent: colWidth };
        }
      }

      result[docId] = mapping;
    });
    return result;
  }, [appointmentsByDoctor]);

  // --- Current time indicator (for today's date) ---
  // Now indicator is handled by the NowIndicator child component to avoid
  // frequent parent re-renders.

  // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---
  const handleAppointmentClick = (appointment: DataAppointment) => {
    // Check if it's a consultation (id >= 10000000)
    const isConsultation = appointment.id >= 10000000;
    if (isConsultation) {
      const raw = consultationRawById[appointment.id] as ConsultationItem | undefined;
      setSelectedConsultation(raw ?? null);
      setSelectedAppointment(null);
    } else {
      const raw = rawById[appointment.id] as AppointmentItem | undefined;
      setSelectedAppointment(raw ?? appointment);
      setSelectedConsultation(null);
    }
    setModalOpen(true);
  };

  // Creation of new appointments has been removed — this view is read-only.

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAppointment(null);
    setSelectedConsultation(null);
  };

  // Editing/saving appointments removed — schedule is read-only in this page.

  // --- UI RENDERING ---
  const dayStartMinutes = DAY_START_HOUR * 60;
  const timeSlots = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => {
    const hour = DAY_START_HOUR + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });



  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <CircularProgress />
      </div>
    );
  }

  return (
    <main className="relative p-4 bg-white rounded-xl  flex flex-col items-center justify-center  w-full overflow-x-auto">
      {/* Collapsible legend */}
      {/** legendCollapsed controls whether the full legend is visible or a compact toggle button is shown */}
      <Legend />

      <div className="flex-1 flex flex-col   rounded ">
        {/* Header */}
        <div className="flex items-center justify-start p-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Typography variant="h5" fontWeight="bold">Lịch hẹn theo ngày</Typography>
            {isMobile ? (
              <Box sx={{ width: 260 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateCalendar
                    value={new Date(selectedDate)}
                    onChange={(newVal) => handleDateChange(newVal)}
                    // keep reduced size on mobile by using smaller sx
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </Box>
            ) : (
              <>
                <Button size="small" variant="outlined" startIcon={<CalendarTodayIcon />} onClick={openPicker}>
                  {selectedDate}
                </Button>
                <Popover
                  open={pickerOpen}
                  anchorEl={pickerAnchor}
                  onClose={closePicker}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                  <Box sx={{ width: 300, p: 1 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DateCalendar
                        value={new Date(selectedDate)}
                        onChange={(newVal) => {
                          handleDateChange(newVal);
                          closePicker();
                        }}
                        sx={{ width: '100%' }}
                      />
                    </LocalizationProvider>
                  </Box>
                </Popover>
              </>
            )}
          </div>
        </div>

        {/* Content: desktop timeline or mobile stacked list */}
        {isMobile ? (
          <div className="p-2 w-full">
            {/* Mobile header with compact date button */}
            <Box className="flex items-center justify-between mb-2">
              <Button size="small" variant="outlined" startIcon={<CalendarTodayIcon />} onClick={openPicker}>
                {selectedDate}
              </Button>
            </Box>

            {/* Dialog for mobile date picker */}
            <Dialog open={dialogOpen} onClose={closePicker} fullWidth maxWidth="xs">
              <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateCalendar
                    value={new Date(selectedDate)}
                    onChange={(newVal) => {
                      handleDateChange(newVal);
                      closePicker();
                    }}
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </DialogContent>
            </Dialog>

            {/* Appointments grouped by doctor as accordions */}
            {doctors.map((doctor) => (
              <Accordion key={doctor.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" className="font-bold">{doctor.name} <span style={{ marginLeft: 8, color: 'gray', fontSize: 12 }}>({(appointmentsByDoctor[doctor.id] || []).length})</span></Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {(appointmentsByDoctor[doctor.id] || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Không có lịch</Typography>
                  ) : (
                    <List disablePadding>
                      {(appointmentsByDoctor[doctor.id] || []).map((apt) => (
                        <div key={apt.id}>
                          <ListItem disablePadding>
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                              <ListItemButton onClick={() => handleAppointmentClick(apt)} style={{ flex: 1 }}>
                                <ListItemText primary={`${apt.startTime} — ${apt.customerName || 'Khách hàng'}`} secondary={apt.service} />
                              </ListItemButton>
                              <div style={{ paddingRight: 8 }}>
                                {(() => {
                                  const isConsultation = Number(apt.id) >= 10000000;
                                  const isCompleted = String(apt.status || '').toLowerCase().includes('complete');
                                  if (isConsultation) return null;
                                  return (
                                    <Button size="small" variant="contained" disabled={isCompleted} onClick={(e) => { e.stopPropagation(); try { window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'prescription', appointmentId: apt.id } })); } catch (err) { console.warn('app:navigate dispatch failed', err); } }} title={isCompleted ? 'Lịch đã hoàn thành' : undefined}>
                                      {isCompleted ? 'Đã hoàn thành' : 'Điều trị'}
                                    </Button>
                                  );
                                })()}
                              </div>
                            </div>
                          </ListItem>
                          <Divider />
                        </div>
                      ))}
                    </List>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 h-full relative overflow-x-auto w-[calc(75vw-2px)]">
            {/* Timeline column */}
            <div className="w-24 border-r bg-white z-30 sticky left-0">
              <div className="h-[80px] text-center pt-1 border-b border-gray-100" />
              {timeSlots.map((time, idx) => (
                <div key={time} className={`h-[80px] text-center pt-1 border-b border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <Typography variant="caption" color="text.secondary">{time}</Typography>
                </div>
              ))}
            </div>

            {/* Doctors area */}
            <div className="overflow-auto flex-1 min-w-0">
              {/* inner container uses full available width; doctor columns are flexible so they grow/shrink with the browser */}
              <div className="flex relative w-full min-w-0">
                <NowIndicator selectedDate={selectedDate} />
                {doctors.map(doctor => (
                  <div key={doctor.id} className="flex-1 min-w-[240px] border-r relative bg-white">
                    <div className="h-[80px] p-2 flex items-center justify-center text-center border-b border-gray-200 sticky top-0 bg-[#fafafa] z-20">
                      <Typography variant="subtitle2" className="font-bold text-[0.95rem]">{doctor.name}</Typography>
                    </div>

                    {/* Hour grid */}
                    {timeSlots.map(time => (
                      <div key={`${doctor.id}-${time}`} className="h-[80px] border-b border-dashed border-gray-200 px-1" />
                    ))}

                    {/* Appointments and Consultations */}
                    {(appointmentsByDoctor[doctor.id] || []).map(apt => {
                      // Add header offset (HOUR_HEIGHT) so 07:00 aligns with the first hour row under the header
                      const top = HOUR_HEIGHT + (timeToMinutes(apt.startTime) - dayStartMinutes) * PIXELS_PER_MINUTE;
                      const height = (timeToMinutes(apt.endTime) - timeToMinutes(apt.startTime)) * PIXELS_PER_MINUTE;
                      const finalHeight = Math.max(height, 0);

                      // Check if it's a consultation to apply purple color
                      const isConsultation = apt.id >= 10000000;
                      const consultationColor = isConsultation ? {
                        main: '#a855f7',
                        light: '#f3e8ff',
                        text: '#6b21a8'
                      } : undefined;

                      const layout = (layoutByDoctor[doctor.id] || {})[apt.id];
                      return (
                        <div key={apt.id} onClick={(e) => { e.stopPropagation(); handleAppointmentClick(apt); }}>
                          <AppointmentCard 
                            appointment={apt} 
                            top={top} 
                            height={finalHeight}
                            customColor={consultationColor}
                            leftPercent={layout?.leftPercent}
                            widthPercent={layout?.widthPercent}
                            showTreatment={!isConsultation}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedConsultation ? (
        <ConsultationDetailModal 
          open={modalOpen} 
          onClose={handleCloseModal} 
          consultation={selectedConsultation}
        />
      ) : (
        <AppointmentDetailModal 
          open={modalOpen} 
          onClose={handleCloseModal} 
          appointment={selectedAppointment} 
        />
      )}
    </main>
  );
}

// Small collapsible Legend component placed near the top-right of the schedule.
function Legend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {!collapsed ? (
        <div className="absolute top-10 right-12 rounded bg-white p-2 shadow z-50 border border-gray-200 flex flex-col gap-2 w-44">
          <div className="flex items-center justify-between">
            <p className="font-medium">Chỉ dẫn tham khảo</p>
            <button aria-label="Thu nhỏ" title="Thu nhỏ" onClick={() => setCollapsed(true)} className="text-sm text-gray-500 hover:text-gray-700">−</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-red-500" />
            <span className="text-sm">Thời gian hiện tại</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500/30" />
            <span className="text-sm">Lịch hẹn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-500/30" />
            <span className="text-sm">Lịch tư vấn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/30" />
            <span className="text-sm">Hoàn thành</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500/30" />
            <span className="text-sm">Hủy</span>
          </div>
        </div>
      ) : (
        <div className="absolute top-6 right-5 z-50">
          <IconButton aria-label="Mở chỉ dẫn" title="Mở chỉ dẫn" onClick={() => setCollapsed(false)} size="small" sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </div>
      )}
    </>
  );
}