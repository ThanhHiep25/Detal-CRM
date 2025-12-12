import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Box, Typography, CircularProgress } from "@mui/material";
import { green, grey } from '@mui/material/colors';
import { AppointmentAPI, type AppointmentItem } from '../../services/appointments';
import type { ApiResponse } from '../../services/user';

type TimelineItem = { type: 'work' | 'appointment' | 'selected'; start: number; end: number; label?: string };

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

  // map appointments to timeline items (convert ISO times to local hour decimal)
  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    const appts = appointments.map((a: AppointmentItem) => {
      // parse scheduledTime and endTime (UTC strings) into local hours
      const startDate = a.scheduledTime ? new Date(a.scheduledTime) : null;
  const endTimeVal = (a as unknown as Record<string, unknown>).endTime as string | undefined;
  const endDate = endTimeVal ? new Date(endTimeVal) : null;
      const start = startDate ? startDate.getHours() + (startDate.getMinutes() / 60) : dayStart;
      const end = endDate ? endDate.getHours() + (endDate.getMinutes() / 60) : (start + (a.estimatedMinutes ?? 30) / 60);
      return { type: 'appointment' as const, start, end, label: a.label || a.customerUsername || a.customerName || a.serviceName };
    });

    // sort appointments by start
    appts.sort((x, y) => x.start - y.start);

    // build work blocks from gaps between appointments
    const blocks: TimelineItem[] = [];
    let cursor = dayStart;
    for (const ap of appts) {
      if (ap.start > cursor) {
        blocks.push({ type: 'work', start: cursor, end: Math.max(cursor, ap.start) });
      }
      blocks.push(ap);
      cursor = Math.max(cursor, ap.end);
    }
    if (cursor < dayEnd) blocks.push({ type: 'work', start: cursor, end: dayEnd });
    return blocks;
  }, [appointments]);

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
                if (item.type === 'work') bgColor = green[200];
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
              <LegendItem color={green[200]} label="Lịch làm việc (khung trống)" />
              <LegendItem color={'skyblue'} label="Lịch hẹn" />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}