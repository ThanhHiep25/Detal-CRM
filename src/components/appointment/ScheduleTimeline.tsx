import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, CircularProgress } from "@mui/material";
import { green, grey } from '@mui/material/colors';
import { AppointmentAPI, type AppointmentItem } from '../../services/appointments';
import { DentistAssignmentsAPI, type DentistAssignment } from '@/services/dentistAssignments';
import type { ApiResponse } from '../../services/user';

type TimelineItem = { type: 'work' | 'appointment' | 'selected'; start: number; end: number; label?: string; source?: 'assigned' | 'inferred' };

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box sx={{ width: 16, height: 16, borderRadius: '4px', bgcolor: color }} />
    <Typography variant="body2" color="text.secondary">{label}</Typography>
  </Box>
);

export function ScheduleTimeline({ dentistId, date, dentistName }: { dentistId?: number; date?: string; dentistName?: string }) {
  const dayStart = 8;
  const dayEnd = 21;
  const totalHours = dayEnd - dayStart;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [assignments, setAssignments] = useState<DentistAssignment[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!dentistId || !date) {
      setAppointments([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    AppointmentAPI.getDaySchedule(dentistId, date)
      .then((res: unknown) => {
        if (!mounted) return;
        // try ApiResponse shape first
        const maybe = res as ApiResponse<unknown> | Record<string, unknown> | unknown;
        if (maybe && typeof maybe === 'object' && 'success' in (maybe as Record<string, unknown>)) {
          const r = maybe as ApiResponse<unknown>;
          if (Array.isArray(r.data)) setAppointments(r.data as AppointmentItem[]);
          else setAppointments([]);
        } else if (maybe && typeof maybe === 'object' && 'data' in (maybe as Record<string, unknown>)) {
          const r2 = maybe as Record<string, unknown>;
          if (Array.isArray(r2.data)) setAppointments(r2.data as AppointmentItem[]);
          else setAppointments([]);
        } else if (Array.isArray(maybe)) {
          setAppointments(maybe as AppointmentItem[]);
        } else {
          setAppointments([]);
        }
      })
      .catch((e) => { if (mounted) setError((e as Error)?.message || 'Lỗi tải lịch'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [dentistId, date]);

  // load dentist assignments once so we can apply assigned shifts to the timeline
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await DentistAssignmentsAPI.getAssignments();
        if (!mounted) return;
        if (res && (res as ApiResponse<DentistAssignment[]>).success && Array.isArray((res as ApiResponse<DentistAssignment[]>).data)) {
          setAssignments((res as ApiResponse<DentistAssignment[]>).data || []);
        } else if (Array.isArray(res)) {
          setAssignments(res as DentistAssignment[]);
        } else {
          setAssignments([]);
        }
      } catch (err) {
        console.warn('Failed to load dentist assignments', err);
        setAssignments([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // map appointments to timeline items (convert ISO times to local hour decimal)
  const timelineItems: TimelineItem[] = useMemo(() => {
    // helper parse HH:MM -> decimal hours
    const parseTime = (s?: string) => {
      if (!s) return 0;
      const m = s.match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return 0;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      return hh + (mm / 60);
    };

    // parse scheduleJson into map day->shifts
    const parseScheduleJson = (json?: string | null) => {
      if (!json) return {} as Record<string, Array<{ start: string; end: string }>>;
      try {
        const arr = JSON.parse(json) as Array<{ day: string; shifts: Array<{ start: string; end: string }> }>;
        const out: Record<string, Array<{ start: string; end: string }>> = {};
        for (const item of arr) out[item.day] = item.shifts || [];
        return out;
      } catch {
        return {} as Record<string, Array<{ start: string; end: string }>>;
      }
    };

    const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    // map appointments into items
    const appts = appointments.map((a: AppointmentItem) => {
      const startDate = a.scheduledTime ? new Date(a.scheduledTime) : null;
      const endTimeVal = (a as unknown as Record<string, unknown>).endTime as string | undefined;
      const endDate = endTimeVal ? new Date(endTimeVal) : null;
      const start = startDate ? startDate.getHours() + (startDate.getMinutes() / 60) : dayStart;
      const end = endDate ? endDate.getHours() + (endDate.getMinutes() / 60) : (start + (a.estimatedMinutes ?? 30) / 60);
      return { type: 'appointment' as const, start, end, label: a.label || a.customerUsername || a.customerName || a.serviceName };
    });
    appts.sort((x, y) => x.start - y.start);

    // Find all assignments that apply to the given `date`.
    // Assignments include a `weekStart` and are auto-extended to the end of that weekStart's month on the server.
    // Here we consider an assignment applicable for `date` when:
    //   start = new Date(assignment.weekStart)
    //   end = last day of start's month
    // and date is in [start, end] and assignment.dentistId === dentistId.
    if (dentistId && date && assignments && assignments.length > 0) {
      const target = new Date(date + 'T00:00:00');
      if (!isNaN(target.getTime())) {
        const applicableShifts: Array<{ start: string; end: string }> = [];
        for (const a of assignments) {
          if (!a.weekStart) continue;
          const start = new Date(a.weekStart + 'T00:00:00');
          if (isNaN(start.getTime())) continue;
          // compute last day of the month for start
          const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
          if (a.dentistId !== dentistId) continue;
          if (target.getTime() < start.getTime() || target.getTime() > endOfMonth.getTime()) continue;
          // assignment applies to target date
          const schedule = parseScheduleJson(a.scheduleJson);
          const dayIdx = (target.getDay() + 6) % 7; // Monday=0
          const weekdayName = WEEKDAYS[dayIdx];
          const shifts = schedule[weekdayName] || [];
          for (const s of shifts) applicableShifts.push({ start: s.start, end: s.end });
        }

        if (applicableShifts.length > 0) {
          // dedupe shifts by start-end string
          const dedupKey = new Set<string>();
          const blocks: TimelineItem[] = [];
          for (const s of applicableShifts) {
            const key = `${s.start}-${s.end}`;
            if (dedupKey.has(key)) continue;
            dedupKey.add(key);
            const sStart = parseTime(s.start);
            const sEnd = parseTime(s.end) || (sStart + 1);
            if (sEnd > sStart) blocks.push({ type: 'work', start: sStart, end: sEnd, source: 'assigned' });
          }
          // add appointments as well
          for (const ap of appts) blocks.push(ap);
          blocks.sort((a, b) => a.start - b.start);
          return blocks;
        }
      }
    }

    // fallback: build work blocks from gaps between appointments across full day
    const blocks: TimelineItem[] = [];
    let cursor = dayStart;
    for (const ap of appts) {
      if (ap.start > cursor) {
        blocks.push({ type: 'work', start: cursor, end: Math.max(cursor, ap.start), source: 'inferred' });
      }
      blocks.push(ap);
      cursor = Math.max(cursor, ap.end);
    }
    if (cursor < dayEnd) blocks.push({ type: 'work', start: cursor, end: dayEnd, source: 'inferred' });
    return blocks;
  }, [appointments, assignments, dentistId, date]);

  // whether there is an explicit assignment covering this date for the selected dentist
  const hasAssignmentForDate = useMemo(() => {
    if (!dentistId || !date || !assignments || assignments.length === 0) return false;
    const target = new Date(date + 'T00:00:00');
    if (isNaN(target.getTime())) return false;
    for (const a of assignments) {
      if (!a.weekStart) continue;
      const start = new Date(a.weekStart + 'T00:00:00');
      if (isNaN(start.getTime())) continue;
      const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      if (a.dentistId !== dentistId) continue;
      if (target.getTime() < start.getTime() || target.getTime() > endOfMonth.getTime()) continue;
      const schedule = (() => {
        try {
          return JSON.parse(a.scheduleJson || '[]') as Array<{ day: string; shifts: Array<{ start: string; end: string }> }>;
        } catch { return []; }
      })();
      const dayIdx = (target.getDay() + 6) % 7;
      const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const weekdayName = WEEKDAYS[dayIdx];
      const found = (schedule.find(s => s.day === weekdayName)?.shifts || []).length > 0;
      if (found) return true;
    }
    return false;
  }, [assignments, dentistId, date]);

  const timeToPercentage = (time: number) => ((time - dayStart) / totalHours) * 100;

  if (!dentistId || !date) return (
    <Card elevation={0} sx={{ border: `1px solid ${grey[200]}` }}>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">Chọn bác sĩ và ngày để xem lịch.</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Card elevation={0} sx={{ border: `1px solid ${grey[200]}` }}>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="body1" fontWeight={500} sx={{ mb: 2 }}>
          Lịch của bác sĩ {dentistName ? dentistName : `#${dentistId}`} — ngày: {date}
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={20} /></Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            {/* if no timeline items, show an explicit empty state */}
            {(!hasAssignmentForDate) && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="warning.main">Chú ý: Hiện tại ngày này nha sĩ không có lịch làm việc.</Typography>
              </Box>
            )}
            {timelineItems.length === 0 ? (
              <Box sx={{ p: 2, bgcolor: grey[50], borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">Không có lịch hẹn hoặc lịch làm việc cho ngày này.</Typography>
              </Box>
            ) : (
              <Box sx={{ position: 'relative', height: 36, width: '100%', bgcolor: grey[100], borderRadius: 1, overflow: 'hidden' }}>
                {timelineItems.map((item, index) => {
                const left = timeToPercentage(item.start);
                const width = timeToPercentage(item.end) - left;
                // clamp values so rendering stays inside the track
                const leftClamped = Math.max(0, Math.min(100, left));
                const widthClamped = Math.max(0, Math.min(100 - leftClamped, width));
                let bgColor = '#D3D3D3'; // default lightgray
                if (item.type === 'work') {
                  if (item.source === 'assigned') bgColor = green[200];
                  else bgColor = grey[300]; // inferred / no-assignment visual
                }
                if (item.type === 'appointment') bgColor = '#87CEEB'; // skyblue
                if (item.type === 'selected') bgColor = 'orange';
                
                return (
                  <Box key={index}
                    title={`${item.label || item.type} ${item.start.toFixed(2)} - ${item.end.toFixed(2)}`}
                    sx={{
                      position: 'absolute', height: '100%', left: `${leftClamped}%`, width: `${widthClamped}%`,
                      bgcolor: bgColor, borderRadius: 1, border: '1px solid rgba(255,255,255,0.6)', boxSizing: 'border-box',
                      display: 'flex', alignItems: 'center', px: 0.5, overflow: 'hidden', minWidth: 2, 
                    }}
                  >
                    
                  </Box>
                );
                })}
              </Box>
            )}

            <Box sx={{ position: 'relative', width: '100%', mt: 1, color: 'text.secondary', height: 20 }}>
              {Array.from({ length: Math.floor(totalHours / 2) + 1 }).map((_, i) => {
                const hour = dayStart + i * 2;
                return (
                  <Box key={hour} sx={{ position: 'absolute', left: `${timeToPercentage(hour)}%`, transform: 'translateX(-50%)' }}>
                    <Typography variant="caption">{hour}:00</Typography>
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
              <LegendItem color={green[200]} label="Lịch làm việc (phân công)" />
              <LegendItem color={grey[300]} label="Không có phân công / inferred" />
              <LegendItem color={'skyblue'} label="Lịch hẹn" />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}