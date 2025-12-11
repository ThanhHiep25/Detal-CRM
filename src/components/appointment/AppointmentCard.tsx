import { statusColors } from '@/data/data';
import { Box, Typography, Button } from '@mui/material';


interface AppointmentCardProps {
  appointment: {
    id?: number | string;
    customerName: string;
    service: string;
    startTime: string;
    endTime: string;
    status: keyof typeof statusColors;
  };
  top: number;
  height: number;
  customColor?: { main: string; light: string; text: string }; // Allow custom color override
  leftPercent?: number;
  widthPercent?: number;
  showTreatment?: boolean;
}

export function AppointmentCard({ appointment, top, height, customColor, leftPercent, widthPercent, showTreatment }: AppointmentCardProps) {
  const defaultColor = statusColors[appointment.status] || statusColors.confirmed;
  const color = customColor || defaultColor;
  const statusStr = String(appointment.status || '').toLowerCase();
  const treatmentDisabled = statusStr.includes('complete');

  return (
    <Box
      sx={{
        position: 'absolute',
        top: `${top}px`,
        height: `${height}px`,
        minHeight: '80px',
        backgroundColor: color.light,
        borderLeft: `4px solid ${color.main}`,
        borderRadius: '4px',
        p: 1,
        overflow: 'hidden',
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.8,
        },
        // conditional horizontal positioning: use percentage-based layout when provided
        ...(leftPercent !== undefined && widthPercent !== undefined
          ? { left: `${leftPercent}%`, width: `${widthPercent}%` }
          : { left: '4px', right: '4px' })
      }}
    >
      {showTreatment && (
        <Button size="small"
          variant="outlined"
          disabled={treatmentDisabled}
          title={treatmentDisabled ? 'Lịch đã hoàn thành' : undefined}
          onClick={(e) => {
            e.stopPropagation();
            try {
              window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'prescription', appointmentId: appointment.id } }));
            }
            catch (err) { console.warn('app:navigate dispatch failed', err); }
          }}
          sx={{ position: 'absolute', bottom: 6, right: 6, minWidth: 0, padding: '4px 6px', fontSize: '0.7rem' }}>
          Điều trị
        </Button>
      )}
      <Typography variant="body2" fontWeight="bold" color={color.text} noWrap>
        {appointment.customerName}
      </Typography>
      <Typography variant="caption" color={color.text} noWrap>
        {appointment.service}
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary">
        {appointment.startTime} - {appointment.endTime}
      </Typography>
    </Box>
  );
}