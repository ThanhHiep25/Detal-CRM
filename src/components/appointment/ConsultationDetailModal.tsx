import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ConsultationItem } from '@/services/consultation-ab';

interface ConsultationDetailModalProps {
  open: boolean;
  onClose: () => void;
  consultation: ConsultationItem | null;
}

export function ConsultationDetailModal({ open, onClose, consultation }: ConsultationDetailModalProps) {
  if (!consultation) return null;

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Chưa xác định';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Không hợp lệ';
      
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
      return 'Không hợp lệ';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#7c3aed', color: 'white' }}>
        <Typography variant="h6" component="div">
          Chi tiết lịch tư vấn
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Customer Information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#faf5ff', borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="#7c3aed" gutterBottom>
            Thông tin khách hàng
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Tên khách hàng</Typography>
              <Typography variant="body1" fontWeight="medium">
                {consultation.customerName || consultation.customer?.fullName || 'Chưa có thông tin'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Số điện thoại</Typography>
              <Typography variant="body1">
                {consultation.customerPhone || consultation.customer?.phone || 'Chưa có'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body1">
                {consultation.customerEmail || consultation.customer?.email || 'Chưa có'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Medical Staff Information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#fff7ed', borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="#ea580c" gutterBottom>
            Đội ngũ y tế
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Nha sĩ</Typography>
              <Typography variant="body1" fontWeight="medium">
                {consultation.dentist?.fullName || consultation.dentist?.name || 'Chưa phân công'}
              </Typography>
              {consultation.dentist?.specialization && (
                <Chip 
                  label={consultation.dentist.specialization} 
                  size="small" 
                  sx={{ mt: 0.5, bgcolor: '#fed7aa', color: '#9a3412' }}
                />
              )}
            </Grid>
            {consultation.assistantId && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Trợ lý</Typography>
                <Typography variant="body1">
                  {consultation.assistant?.fullName || consultation.assistant?.name || 'Không có'}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Service Information */}
        {consultation.serviceId && (
          <>
            <Box sx={{ mb: 3, p: 2, bgcolor: '#eff6ff', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#2563eb" gutterBottom>
                Dịch vụ tư vấn
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2" color="text.secondary">Tên dịch vụ</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {consultation.service?.name || 'Chưa xác định'}
                  </Typography>
                </Grid>
                {consultation.service?.price && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Giá dịch vụ</Typography>
                    <Typography variant="body1" fontWeight="bold" color="#2563eb">
                      {new Intl.NumberFormat('vi-VN', { 
                        style: 'currency', 
                        currency: 'VND' 
                      }).format(consultation.service.price)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Branch Information */}
        {consultation.branchId && (
          <>
            <Box sx={{ mb: 3, p: 2, bgcolor: '#fdf4ff', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#a855f7" gutterBottom>
                Chi nhánh
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Tên chi nhánh</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {consultation.branch?.name || 'Chưa xác định'}
                  </Typography>
                </Grid>
                {consultation.branch?.address && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Địa chỉ</Typography>
                    <Typography variant="body1">
                      {consultation.branch.address}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Time Information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#fef2f2', borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="#dc2626" gutterBottom>
            Thời gian
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Thời gian hẹn</Typography>
              <Typography variant="body1" fontWeight="medium">
                {formatDateTime(consultation.scheduledTime)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Thời lượng dự kiến</Typography>
              <Typography variant="body1">
                {consultation.durationMinutes ? `${consultation.durationMinutes} phút` : 'Chưa xác định'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Notes */}
        {consultation.notes && (
          <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="#16a34a" gutterBottom>
              Ghi chú
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {consultation.notes}
            </Typography>
          </Box>
        )}

        {/* System Info */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e5e7eb' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Ngày tạo: {new Date(consultation.createdAt).toLocaleString('vi-VN')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Cập nhật: {new Date(consultation.updatedAt).toLocaleString('vi-VN')}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
