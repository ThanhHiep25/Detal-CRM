import React, { useState } from 'react';
import { Drawer, Box, Typography, Grid, Divider, Button, TextField, Chip } from '@mui/material';
import type { AppointmentItem } from '../../services/appointments';
import { AppointmentAPI } from '../../services/appointments';

interface Props {
  open: boolean;
  item: AppointmentItem | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function AppointmentDetail({ open, item, onClose, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduled, setScheduled] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (item) {
      setNotes(item.notes ?? '');
      if (item.scheduledTime) {
        const d = new Date(item.scheduledTime);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setScheduled(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else setScheduled('');
      setEditing(false);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<AppointmentItem> = { notes };
      if (scheduled) payload.scheduledTime = new Date(scheduled).toISOString();
      const res = await AppointmentAPI.update(item.id, payload);
      if (res && res.success) {
        setEditing(false);
        if (onUpdated) onUpdated();
      } else {
        alert(res.message || 'Cập nhật thất bại');
      }
    } catch (e) {
      alert((e as Error)?.message || 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Bạn có chắc muốn hủy lịch hẹn này?')) return;
    try {
      const res = await AppointmentAPI.cancel(item.id);
      if (res && res.success) {
        if (onUpdated) onUpdated();
        onClose();
      } else {
        alert(res.message || 'Hủy thất bại');
      }
    } catch (e) {
      alert((e as Error)?.message || 'Lỗi');
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 520, p: 2 } }}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Chi tiết lịch hẹn #{item.id}</Typography>
          <Chip label={item.status || 'UNKNOWN'} color={item.status === 'PENDING' ? 'warning' : (item.status === 'CONFIRMED' ? 'success' : 'default')} />
        </Box>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={1}>
          <Grid item xs={6}><Typography variant="subtitle2">Khách hàng</Typography><Typography>{item.customerUsername ?? item.customerEmail}</Typography></Grid>
          <Grid item xs={6}><Typography variant="subtitle2">Dịch vụ</Typography><Typography>{item.serviceName}</Typography></Grid>
          <Grid item xs={6}><Typography variant="subtitle2">Bác sĩ</Typography><Typography>{item.dentistName}</Typography></Grid>
          <Grid item xs={6}><Typography variant="subtitle2">Phụ tá</Typography><Typography>{item.assistantName}</Typography></Grid>
          <Grid item xs={12}><Typography variant="subtitle2">Chi nhánh</Typography><Typography>{item.branchName} {item.branchAddress ? `- ${item.branchAddress}` : ''}</Typography></Grid>
          <Grid item xs={12}><Typography variant="subtitle2">Thời gian</Typography><Typography>{item.scheduledTime ? new Date(item.scheduledTime).toLocaleString() : ''}</Typography></Grid>
          <Grid item xs={12}><Typography variant="subtitle2">Ước lượng (phút)</Typography><Typography>{item.estimatedMinutes ?? item.serviceDuration ?? '-'}</Typography></Grid>
          <Grid item xs={12}><Typography variant="subtitle2">Ghi chú</Typography>
            {!editing ? <Typography sx={{ whiteSpace: 'pre-wrap' }}>{item.notes || '-'}</Typography>
            : <TextField multiline rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />}
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mt: 3, justifyContent: 'flex-end' }}>
          {!editing ? (
            <>
              <Button onClick={() => setEditing(true)}>Chỉnh sửa</Button>
              <Button
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'prescription', appointmentId: item.id } }));
                    onClose();
                  } catch (err) { console.warn('app:navigate dispatch failed', err); }
                }}
              >
                Điều trị
              </Button>
              <Button color="error" onClick={handleCancel}>Hủy</Button>
              <Button variant="contained" onClick={onClose}>Đóng</Button>
            </>
          ) : (
            <>
              <TextField label="Thời gian" type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ display: 'none' }} />
              <Button onClick={() => setEditing(false)}>Hủy</Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
