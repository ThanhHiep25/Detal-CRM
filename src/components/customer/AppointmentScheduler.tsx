import { useState, useEffect } from 'react';
import {  Card, Grid, Typography, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";
import { StaticDatePicker } from "@mui/x-date-pickers";
import { grey } from '@mui/material/colors';
import type { CreateAppointmentPayload } from '@/services/appointments';
import { DentistAPI } from '@/services/dentist';
import type { Dentist } from '@/services/dentist';
import { ServiceAPI } from '@/services/service';
import type { ServiceItem } from '@/services/service';
import dayjs from 'dayjs';

// Style cho input đã định nghĩa ở các bước trước
const inputStyles = { '& .MuiFilledInput-root': { border: '1px solid transparent', borderRadius: '8px', backgroundColor: grey[100], '&:hover': { backgroundColor: grey[200] }, '&.Mui-focused': { backgroundColor: 'white', borderColor: 'primary.main' }, '&::before, &::after': { display: 'none' } }, '& .MuiInputLabel-root': { '&.Mui-focused': { color: 'primary.main' } } };

export interface AppointmentSchedulerProps {
  onChange?: (payload: Partial<CreateAppointmentPayload>) => void;
}

export function AppointmentScheduler({ onChange }: AppointmentSchedulerProps) {
    const [date, setDate] = useState<Date | null>(new Date());
    const [dentistRefId, setDentistRefId] = useState<number | ''>('');
    const [assistantId, setAssistantId] = useState<number | ''>('');
    const [serviceId, setServiceId] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [dentists, setDentists] = useState<Dentist[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);

    // emit partial payload to parent whenever values change
    useEffect(() => {
        if (!onChange) return;
        const selectedService = typeof serviceId === 'number' ? services.find(s => s.id === serviceId) : undefined;
        const payload: Partial<CreateAppointmentPayload> = {
            dentistRefId: typeof dentistRefId === 'number' ? dentistRefId : undefined,
            assistantId: typeof assistantId === 'number' ? assistantId : undefined,
            serviceId: typeof serviceId === 'number' ? serviceId : undefined,
            estimatedMinutes: selectedService ? selectedService.durationMinutes : undefined,
            scheduledTime: date ? date.toISOString() : undefined,
            notes: notes || undefined,
        };
        onChange(payload);
    }, [date, dentistRefId, assistantId, serviceId, notes, onChange, services]);

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
                {/* Cột Lịch */}
                <Grid item xs={12} md={5}>
                    <StaticDatePicker
                        displayStaticWrapperAs="desktop"
                        value={date ? dayjs(date) : null}
                        onChange={(newDate) => {
                            if (newDate) {
                                const dayjsObj = newDate as ReturnType<typeof dayjs>;
                                setDate(dayjsObj.toDate());
                            } else {
                                setDate(null);
                            }
                        }}
                        sx={{
                            '.MuiPickersLayout-toolbar, .MuiDialogActions-root': { display: 'none' },
                            '.MuiPickersDay-root.Mui-selected': {
                                backgroundColor: 'primary.main', color: 'white', borderRadius: '50%'
                            },
                            border: `1px solid ${grey[200]}`,
                            borderRadius: 1,
                        }}
                    />
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
                        <Grid item xs={12}><TextField fullWidth label="Nội dung" multiline rows={4} placeholder="Nội dung" InputLabelProps={{ shrink: true }} variant="filled" sx={inputStyles} value={notes} onChange={(e) => setNotes(e.target.value)} /></Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Card>
    );
}