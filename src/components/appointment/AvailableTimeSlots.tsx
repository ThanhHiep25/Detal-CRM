import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Chip, CircularProgress, Stack } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { green, grey, blue, red } from '@mui/material/colors';
import { AppointmentAPI, type DentistDaySchedule, type DentistScheduleAppointment } from '../../services/appointments';

interface AvailableTimeSlotsProps {
  dentistId?: number | '';
  date?: string; // YYYY-MM-DD format
  dentistName?: string;
  onSelectTime?: (time: string) => void;
  selectedTime?: string;
}

// Working hours: 08:00 - 20:00
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 20;

// Time slot interval in minutes
const SLOT_INTERVAL = 30;

interface TimeSlot {
  time: string; // HH:MM format
  available: boolean;
  appointment?: DentistScheduleAppointment;
  isPast?: boolean; // Flag để đánh dấu slot đã qua
}

// Convert UTC ISO string to local time (HH:MM)
function utcToLocalTime(utcString: string): { hours: number; minutes: number } {
  const d = new Date(utcString);
  return { hours: d.getHours(), minutes: d.getMinutes() };
}

// Generate all time slots for working hours
function generateAllTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = WORK_START_HOUR; h < WORK_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

// Check if a time slot is occupied by any appointment (using overlap detection)
function isSlotOccupied(
  slotTime: string,
  appointments: DentistScheduleAppointment[]
): { occupied: boolean; appointment?: DentistScheduleAppointment } {
  const [slotH, slotM] = slotTime.split(':').map(Number);
  const slotStartMinutes = slotH * 60 + slotM;
  const slotEndMinutes = slotStartMinutes + SLOT_INTERVAL; // Slot kéo dài 30 phút

  for (const appt of appointments) {
    const start = utcToLocalTime(appt.scheduledTime);
    const end = utcToLocalTime(appt.endTime);
    
    const apptStartMinutes = start.hours * 60 + start.minutes;
    const apptEndMinutes = end.hours * 60 + end.minutes;
    
    // Slot bị chiếm nếu có OVERLAP với appointment
    // Overlap xảy ra khi: slotStart < apptEnd AND slotEnd > apptStart
    // VD: Slot 16:00-16:30 overlap với appointment 16:03-17:03
    if (slotStartMinutes < apptEndMinutes && slotEndMinutes > apptStartMinutes) {
      return { occupied: true, appointment: appt };
    }
  }
  return { occupied: false };
}

// Check if a time slot has already passed (for today's date)
function isSlotInPast(slotTime: string, selectedDate: string): boolean {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Nếu ngày được chọn không phải hôm nay, không cần kiểm tra
  if (selectedDate !== todayStr) {
    // Nếu ngày đã qua thì tất cả slot đều là quá khứ
    if (selectedDate < todayStr) {
      return true;
    }
    return false;
  }
  
  // Nếu là hôm nay, kiểm tra giờ hiện tại
  const [slotH, slotM] = slotTime.split(':').map(Number);
  const slotMinutes = slotH * 60 + slotM;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Slot đã qua nếu thời gian slot <= thời gian hiện tại
  return slotMinutes <= currentMinutes;
}

export function AvailableTimeSlots({
  dentistId,
  date,
  dentistName,
  onSelectTime,
  selectedTime
}: AvailableTimeSlotsProps) {
  const [loading, setLoading] = useState(false);
  const [dentistSchedule, setDentistSchedule] = useState<DentistDaySchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch schedule when dentist or date changes
  useEffect(() => {
    if (!dentistId || !date) {
      setDentistSchedule(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    AppointmentAPI.getAllDentistsDaySchedule(date)
      .then((res) => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) {
          const found = res.data.find(d => d.dentistId === dentistId);
          setDentistSchedule(found || null);
        } else {
          setDentistSchedule(null);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to fetch schedule:', err);
        setError('Không thể tải lịch nha sĩ');
        setDentistSchedule(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [dentistId, date]);

  // Generate time slots with availability status
  const timeSlots: TimeSlot[] = useMemo(() => {
    const allSlots = generateAllTimeSlots();
    const appointments = dentistSchedule?.appointments || [];
    
    return allSlots.map(time => {
      const { occupied, appointment } = isSlotOccupied(time, appointments);
      const isPast = date ? isSlotInPast(time, date) : false;
      return {
        time,
        available: !occupied && !isPast, // Không available nếu bị chiếm HOẶC đã qua
        appointment,
        isPast // Thêm flag để phân biệt lý do không available
      };
    });
  }, [dentistSchedule, date]);

  // Count available vs busy slots
  const availableCount = timeSlots.filter(s => s.available).length;
  const busyCount = timeSlots.filter(s => !s.available).length;

  // If no dentist or date selected
  if (!dentistId || !date) {
    return (
      <Box sx={{ p: 2, bgcolor: grey[50], borderRadius: 2, textAlign: 'center' }}>
        <AccessTimeIcon sx={{ fontSize: 40, color: grey[400], mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Vui lòng chọn nha sĩ và ngày để xem khung giờ trống
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Đang tải lịch...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, bgcolor: red[50], borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ border: `1px solid ${grey[200]}`, borderRadius: 2, p: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={600} color="text.primary">
            Khung giờ làm việc
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dentistName || `Nha sĩ #${dentistId}`} • {date}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            size="small"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
            label={`${availableCount} trống`}
            sx={{ bgcolor: green[50], color: green[700], fontWeight: 500 }}
          />
          <Chip
            size="small"
            icon={<EventBusyIcon sx={{ fontSize: 16 }} />}
            label={`${busyCount} bận`}
            sx={{ bgcolor: grey[100], color: grey[600], fontWeight: 500 }}
          />
        </Stack>
      </Stack>

      {/* Time slots grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
          gap: 1,
          maxHeight: 200,
          overflowY: 'auto',
          pr: 1
        }}
      >
        {timeSlots.map(slot => (
          <Box
            key={slot.time}
            onClick={() => {
              if (slot.available && onSelectTime) {
                onSelectTime(slot.time);
              }
            }}
            sx={{
              py: 0.75,
              px: 1,
              borderRadius: 1,
              textAlign: 'center',
              cursor: slot.available ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              border: selectedTime === slot.time ? `2px solid ${blue[600]}` : '1px solid transparent',
              bgcolor: slot.available
                ? selectedTime === slot.time
                  ? blue[50]
                  : green[50]
                : grey[100],
              color: slot.available ? green[800] : grey[500],
              '&:hover': slot.available
                ? {
                    bgcolor: selectedTime === slot.time ? blue[100] : green[100],
                    transform: 'scale(1.02)'
                  }
                : {},
              fontWeight: slot.available ? 500 : 400,
              fontSize: '0.875rem',
              textDecoration: slot.available ? 'none' : 'line-through'
            }}
            title={
              slot.available
                ? `Giờ trống: ${slot.time}`
                : slot.isPast
                  ? `Đã qua: ${slot.time}`
                  : `Đã có lịch hẹn: ${slot.appointment?.status || 'PENDING'}`
            }
          >
            {slot.time}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 1, borderTop: `1px dashed ${grey[200]}` }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{ width: 12, height: 12, bgcolor: green[50], borderRadius: 0.5, border: `1px solid ${green[200]}` }} />
          <Typography variant="caption" color="text.secondary">Còn trống</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{ width: 12, height: 12, bgcolor: grey[100], borderRadius: 0.5, border: `1px solid ${grey[300]}` }} />
          <Typography variant="caption" color="text.secondary">Đã có lịch</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{ width: 12, height: 12, bgcolor: blue[50], borderRadius: 0.5, border: `2px solid ${blue[600]}` }} />
          <Typography variant="caption" color="text.secondary">Đang chọn</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
