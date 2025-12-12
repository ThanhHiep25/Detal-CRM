import { useState, useEffect } from 'react';
import { 
    Card, 
    Grid, 
    Typography, 
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem, 
    TextField,
    Box,
    Chip,
    Stack
} from "@mui/material";
import { StaticDatePicker } from "@mui/x-date-pickers";
import { grey, blue } from '@mui/material/colors';
import type { CreateAppointmentPayload } from '@/services/appointments';
import { DentistAPI } from '@/services/dentist';
import type { Dentist } from '@/services/dentist';
import { ServiceAPI } from '@/services/service';
import type { ServiceItem } from '@/services/service';
import dayjs, { type Dayjs } from 'dayjs';

// Style cho input đã định nghĩa ở các bước trước
const inputStyles = { '& .MuiFilledInput-root': { border: '1px solid transparent', borderRadius: '8px', backgroundColor: grey[100], '&:hover': { backgroundColor: grey[200] }, '&.Mui-focused': { backgroundColor: 'white', borderColor: 'primary.main' }, '&::before, &::after': { display: 'none' } }, '& .MuiInputLabel-root': { '&.Mui-focused': { color: 'primary.main' } } };

// Danh sách các khung giờ có sẵn
const TIME_SLOTS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

export interface AppointmentSchedulerProps {
  onChange?: (payload: Partial<CreateAppointmentPayload>) => void;
}

export function AppointmentScheduler({ onChange }: AppointmentSchedulerProps) {
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [dentistRefId, setDentistRefId] = useState<number | ''>('');
    const [assistantId, setAssistantId] = useState<number | ''>('');
    const [serviceId, setServiceId] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [dentists, setDentists] = useState<Dentist[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);

    const todayStart = dayjs().startOf('day');
    const maxDate = dayjs().add(3, 'month').endOf('day');

    // emit partial payload to parent whenever values change
    useEffect(() => {
        if (!onChange) return;
        const selectedService = typeof serviceId === 'number' ? services.find(s => s.id === serviceId) : undefined;
        let scheduledIso: string | undefined;
        
        if (selectedDate && selectedTime) {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const dateTime = selectedDate.hour(hours).minute(minutes).second(0).millisecond(0);
            scheduledIso = dateTime.toISOString();
        }

        const payload: Partial<CreateAppointmentPayload> = {
            dentistRefId: typeof dentistRefId === 'number' ? dentistRefId : undefined,
            assistantId: typeof assistantId === 'number' ? assistantId : undefined,
            serviceId: typeof serviceId === 'number' ? serviceId : undefined,
            estimatedMinutes: selectedService ? selectedService.durationMinutes : undefined,
            scheduledTime: scheduledIso,
            notes: notes || undefined,
        };
        onChange(payload);
    }, [selectedDate, selectedTime, dentistRefId, assistantId, serviceId, notes, onChange, services]);

    // fetch dentists on mount for both dentist and assistant selects
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await DentistAPI.getDentists();
                if (!mounted) return;
                if (res && res.success) setDentists(res.data || []);
                else setDentists(res.data || []);
            } catch (err) {
                console.warn('Failed to load dentists', err);
                setDentists([]);
            }
        })();
        // fetch services as well
        (async () => {
            try {
                const sres = await ServiceAPI.getServices();
                if (!mounted) return;
                if (sres && sres.success) setServices(sres.data || []);
                else setServices(sres.data || []);
            } catch (err) {
                console.warn('Failed to load services', err);
                setServices([]);
            }
        })();
        return () => { mounted = false; };
    }, []);

    return (
        <Card elevation={0} sx={{ border: `1px solid ${grey[200]}`, p: 2, mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Lịch hẹn</Typography>
            <Grid container spacing={3}>
                {/* Cột Chọn Ngày */}
                <Grid item xs={12} md={5}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                        Chọn ngày
                    </Typography>
                    <StaticDatePicker
                        displayStaticWrapperAs="desktop"
                        value={selectedDate}
                        onChange={(newDate) => setSelectedDate(newDate ? dayjs(newDate) : null)}
                        shouldDisableDate={(d) => {
                            const dd = dayjs(d);
                            return dd.isBefore(todayStart, 'day') || dd.isAfter(maxDate, 'day');
                        }}
                        sx={{
                            '.MuiPickersLayout-toolbar, .MuiDialogActions-root': { display: 'none' },
                            '.MuiPickersDay-root.Mui-selected': {
                                backgroundColor: 'primary.main',
                                color: 'white',
                                borderRadius: '50%'
                            },
                            border: `1px solid ${grey[200]}`,
                            borderRadius: 1,
                        }}
                    />
                    
                    {/* Chọn giờ */}
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
                            Chọn giờ
                        </Typography>
                        <Box sx={{ 
                            maxHeight: 200, 
                            overflowY: 'auto',
                            border: `1px solid ${grey[200]}`,
                            borderRadius: 1,
                            p: 1
                        }}>
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                {TIME_SLOTS.map((time) => (
                                    <Chip
                                        key={time}
                                        label={time}
                                        onClick={() => setSelectedTime(time)}
                                        color={selectedTime === time ? 'primary' : 'default'}
                                        variant={selectedTime === time ? 'filled' : 'outlined'}
                                        sx={{ 
                                            minWidth: 70,
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: selectedTime === time ? undefined : grey[100]
                                            }
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    </Box>
                </Grid>

                {/* Cột Form */}
                <Grid item xs={12} md={7}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth variant="filled" sx={inputStyles}>
                                <InputLabel shrink>Bác sĩ</InputLabel>
                                <Select value={dentistRefId} onChange={(e) => {
                                    const v = e.target.value as unknown;
                                    setDentistRefId(v === '' ? '' : Number(v));
                                }} displayEmpty>
                                    <MenuItem value=""><em>Chọn bác sĩ</em></MenuItem>
                                    {dentists.map(d => (
                                        <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth variant="filled" sx={inputStyles}>
                                <InputLabel shrink>Phụ tá</InputLabel>
                                <Select value={assistantId} onChange={(e) => {
                                    const v = e.target.value as unknown;
                                    setAssistantId(v === '' ? '' : Number(v));
                                }} displayEmpty>
                                    <MenuItem value=""><em>Chọn phụ tá</em></MenuItem>
                                    {dentists.map(d => (
                                        <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth variant="filled" sx={inputStyles}>
                                <InputLabel shrink>Dịch vụ quan tâm</InputLabel>
                                <Select value={serviceId} onChange={(e) => {
                                    const v = e.target.value as unknown;
                                    setServiceId(v === '' ? '' : Number(v));
                                }} displayEmpty>
                                    <MenuItem value=""><em>Chọn dịch vụ</em></MenuItem>
                                    {services.map(s => (
                                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField 
                                fullWidth 
                                label="Nội dung" 
                                multiline 
                                rows={4} 
                                placeholder="Nhập nội dung ghi chú" 
                                InputLabelProps={{ shrink: true }} 
                                variant="filled" 
                                sx={inputStyles} 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                            />
                        </Grid>
                        
                        {/* Hiển thị thông tin đã chọn */}
                        {(selectedDate || selectedTime) && (
                            <Grid item xs={12}>
                                <Box sx={{ 
                                    p: 2, 
                                    bgcolor: blue[50], 
                                    borderRadius: 1,
                                    border: `1px solid ${blue[200]}`
                                }}>
                                    <Typography variant="subtitle2" color="primary" fontWeight={600}>
                                        Thông tin lịch hẹn
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        <strong>Ngày:</strong> {selectedDate ? selectedDate.format('DD/MM/YYYY') : 'Chưa chọn'}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Giờ:</strong> {selectedTime || 'Chưa chọn'}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </Grid>
            </Grid>
        </Card>
    );
}