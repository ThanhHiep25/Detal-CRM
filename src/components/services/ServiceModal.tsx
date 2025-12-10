import { Dialog, DialogTitle, DialogContent, Grid, TextField, DialogActions, Button } from "@mui/material";
import { grey } from '@mui/material/colors';
import React from 'react';
import { ServiceAPI, type ServiceItem, type ServicePayload } from "../../services/service";
import { toast } from 'react-toastify';

// Style cho input đã định nghĩa ở các bước trước
const inputStyles = { '& .MuiFilledInput-root': { border: '1px solid transparent', borderRadius: '8px', backgroundColor: grey[100], '&:hover': { backgroundColor: grey[200] }, '&.Mui-focused': { backgroundColor: 'white', borderColor: 'primary.main' }, '&::before, &::after': { display: 'none' } }, '& .MuiInputLabel-root': { '&.Mui-focused': { color: 'primary.main' } } };

interface ServiceModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: ServiceItem; // optional when creating
  onSaved: (updated: ServiceItem) => void;
  mode?: 'create' | 'edit';
}

export function ServiceModal({ open, onClose, initialData, onSaved, mode = 'edit' }: ServiceModalProps) {
  // Use string-based draft to allow empty inputs and smooth typing; convert on submit
  const [draft, setDraft] = React.useState({
    name: initialData?.name || "",
    price: initialData?.price != null ? String(initialData.price) : "",
    description: initialData?.description || "",
    durationMinutes: initialData?.durationMinutes != null ? String(initialData.durationMinutes) : "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDraft({
      name: initialData?.name || "",
      price: initialData?.price != null ? String(initialData.price) : "",
      description: initialData?.description || "",
      durationMinutes: initialData?.durationMinutes != null ? String(initialData.durationMinutes) : "",
    });
  }, [initialData]);

  const handleChange = (field: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!draft.name.trim()) return 'Vui lòng nhập tên dịch vụ';
    if (draft.price.trim() === '') return 'Vui lòng nhập đơn giá';
    const priceNum = Number(draft.price);
    if (!isFinite(priceNum) || priceNum < 0) return 'Đơn giá không hợp lệ';
    if (draft.durationMinutes.trim() === '') return 'Vui lòng nhập thời lượng (phút)';
    const durationNum = Number(draft.durationMinutes);
    if (!Number.isInteger(durationNum) || durationNum < 0) return 'Thời lượng phải là số nguyên không âm';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const payload: ServicePayload = {
      name: draft.name.trim(),
      price: Number(draft.price),
      description: draft.description,
      durationMinutes: Number(draft.durationMinutes),
    };
    setSaving(true);
    try {
      const res = mode === 'create'
        ? await ServiceAPI.createService(payload)
        : await ServiceAPI.updateService(initialData!.id, payload);
      if (res.success && res.data) {
        toast.success(mode === 'create' ? 'Tạo dịch vụ thành công' : 'Cập nhật dịch vụ thành công');
        onSaved(res.data);
        onClose();
      } else {
        toast.error(res.message || (mode === 'create' ? 'Tạo dịch vụ thất bại' : 'Cập nhật thất bại'));
      }
    } catch {
      toast.error('Lỗi hệ thống hoặc mạng');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
  <DialogTitle>{mode === 'create' ? 'Thêm dịch vụ' : 'Chỉnh sửa dịch vụ'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tên dịch vụ"
              placeholder="eg. Vệ sinh răng"
              variant="filled"
              sx={inputStyles}
              value={draft.name}
              onChange={handleChange('name')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Đơn giá (VND)"
              placeholder="eg. 150000"
              variant="filled"
              sx={inputStyles}
              value={draft.price}
              onChange={handleChange('price')}
              inputProps={{ min: 0, step: 'any', inputMode: 'numeric' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Thời lượng (phút)"
              placeholder="eg. 30"
              variant="filled"
              sx={inputStyles}
              value={draft.durationMinutes}
              onChange={handleChange('durationMinutes')}
              inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Mô tả"
              multiline
              rows={3}
              placeholder="eg. Mô tả dịch vụ"
              variant="filled"
              sx={inputStyles}
              value={draft.description}
              onChange={handleChange('description')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: '0 24px 16px' }}>
        <Button variant="outlined" sx={{ textTransform: 'none', borderRadius: '8px' }} onClick={onClose} disabled={saving}>Đóng</Button>
        <Button variant="contained" disableElevation sx={{ textTransform: 'none', borderRadius: '8px' }} onClick={handleSubmit} disabled={saving}>Lưu</Button>
      </DialogActions>
    </Dialog>
  );
}