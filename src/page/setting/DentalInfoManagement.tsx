import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Grid,
  Chip,
} from '@mui/material';
import { Edit, Delete, ChevronLeft, MapPin, FileText, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DentalInfoAPI, { DentalInfo } from '@/services/dentalinfo';

interface UserData {
  username?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
}

const DentalInfoManagement: React.FC = () => {
  const navigate = useNavigate();
  const [dentalInfos, setDentalInfos] = useState<DentalInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [formData, setFormData] = useState<DentalInfo>({
    name: '',
    code: '',
    address: '',
    description: '',
    active: true,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Kiểm tra quyền truy cập
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user: UserData = JSON.parse(userData);
        if (user.role === 'ROLE_ADMIN') {
          setIsAuthorized(true);
        } else {
          setMessage({ type: 'error', text: 'Bạn không có quyền truy cập trang này' });
          setTimeout(() => navigate('/'), 2000);
        }
      } else {
        setMessage({ type: 'error', text: 'Vui lòng đăng nhập' });
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error("Error checking authorization:", err);
      setMessage({ type: 'error', text: 'Lỗi xác thực' });
      setTimeout(() => navigate('/'), 2000);
    }
  }, [navigate]);

  // Tải danh sách
  const fetchDentalInfos = async () => {
    setLoading(true);
    const response = await DentalInfoAPI.getAll();
    if (response.success && response.data) {
      setDentalInfos(response.data);
    } else {
      setMessage({ type: 'error', text: response.error || 'Lỗi khi tải dữ liệu' });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchDentalInfos();
    }
  }, [isAuthorized]);

  // Mở dialog để tạo mới
  const handleOpenDialog = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      description: '',
      active: true,
    });
    setEditingId(null);
    setOpenDialog(true);
  };

  // Mở dialog để chỉnh sửa
  const handleEditClick = (item: DentalInfo) => {
    setFormData(item);
    setEditingId(item.id || null);
    setOpenDialog(true);
  };

  // Lưu (tạo mới hoặc cập nhật)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên phòng khám' });
      return;
    }

    let response;
    if (editingId) {
      response = await DentalInfoAPI.update(editingId, formData);
    } else {
      response = await DentalInfoAPI.create(formData);
    }

    if (response.success) {
      setMessage({ type: 'success', text: response.message || 'Thành công' });
      setOpenDialog(false);
      fetchDentalInfos();
    } else {
      setMessage({ type: 'error', text: response.error || 'Lỗi' });
    }
  };

  // Xóa
  const handleDelete = async (id: number) => {
    const response = await DentalInfoAPI.delete(id);
    if (response.success) {
      setMessage({ type: 'success', text: response.message || 'Thành công' });
      setDeleteConfirm(null);
      fetchDentalInfos();
    } else {
      setMessage({ type: 'error', text: response.error || 'Lỗi' });
    }
  };

  // Cập nhật form
  const handleInputChange = (field: keyof DentalInfo, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="relative flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 rounded-lg" style={{ minHeight: '100vh' }}>
      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="absolute top-5 left-5 w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300/80 flex items-center justify-center transition"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Check Authorization */}
      {!isAuthorized ? (
        <Box className="flex justify-center items-center flex-col gap-4" style={{ height: '100vh' }}>
          <div className="text-6xl opacity-50">🔒</div>
          <CircularProgress />
          <p className="text-gray-600 dark:text-gray-400 text-lg">Đang xác thực...</p>
        </Box>
      ) : (
        <>
          {/* Title */}
          <div className="text-center mb-8 mt-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              🏥 Quản Lý Phòng Khám
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Quản lý thông tin các chi nhánh phòng khám</p>
          </div>

          {/* Message */}
          {message && (
            <Alert severity={message.type} onClose={() => setMessage(null)} className="mb-6">
              {message.text}
            </Alert>
          )}

          {/* Add Button */}
          <Box className="mb-8 flex justify-center">
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenDialog}
              size="large"
              sx={{ textTransform: 'none', fontSize: '1.1rem', px: 4, py: 1.5 }}
            >
              + Thêm Phòng Khám Mới
            </Button>
          </Box>

          {/* Loading */}
          {loading ? (
            <Box className="flex justify-center items-center" style={{ height: '400px' }}>
              <CircularProgress size={60} />
            </Box>
          ) : dentalInfos.length === 0 ? (
            <Box className="flex justify-center items-center flex-col gap-4" style={{ height: '400px' }}>
              <div className="text-6xl opacity-50">📭</div>
              <p className="text-gray-500 dark:text-gray-400 text-xl">Không có phòng khám nào</p>
            </Box>
          ) : (
            <Grid container spacing={3}>
          {dentalInfos.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card
                className="dark:bg-gray-700 hover:shadow-xl transition-shadow h-full flex flex-col"
                sx={{
                  backgroundColor: item.active ? '#ffffff' : '#f9fafb',
                  borderLeft: `5px solid ${item.active ? '#3b82f6' : '#ef4444'}`,
                }}
              >
                <CardContent className="flex-1">
                  {/* Header com Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex-1 break-words">
                      {item.name}
                    </h2>
                    <Chip
                      label={item.active ? 'Hoạt động' : 'Đóng cửa'}
                      color={item.active ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                      className="ml-2"
                    />
                  </div>

                  {/* Code */}
                  {item.code && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-300">
                      <Code size={16} />
                      <span className="font-mono font-semibold">{item.code}</span>
                    </div>
                  )}

                  {/* Address */}
                  {item.address && (
                    <div className="flex items-start gap-2 mb-4 text-sm text-gray-700 dark:text-gray-200">
                      <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                      <span className="break-words">{item.address}</span>
                    </div>
                  )}

                  {/* Description */}
                  {item.description && (
                    <div className="flex items-start gap-2 mb-4">
                      <FileText size={16} className="mt-0.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 break-words">
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>ID: {item.id}</span>
                      {item.updatedAt && (
                        <span>
                          Cập nhật: {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>

                {/* Actions */}
                <CardActions className="border-t border-gray-200 dark:border-gray-600 flex justify-end gap-2">
                  <Tooltip title="Chỉnh Sửa">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleEditClick(item)}
                      className="hover:bg-blue-100 dark:hover:bg-blue-900"
                    >
                      <Edit size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Xóa">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => setDeleteConfirm(item.id || null)}
                      className="hover:bg-red-100 dark:hover:bg-red-900"
                    >
                      <Delete size={20} />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog Tạo/Sửa */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.3rem', backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb'}}>
          {editingId ? '✏️ Chỉnh Sửa Phòng Khám' : '➕ Thêm Phòng Khám Mới'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3, marginTop: 3 }}>
          <TextField
            label="Tên Phòng Khám *"
            fullWidth
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ví dụ: Phòng khám A"
            variant="outlined"
          />
          <TextField
            label="Mã (Code)"
            fullWidth
            value={formData.code || ''}
            onChange={(e) => handleInputChange('code', e.target.value)}
            placeholder="Ví dụ: PK-A"
            variant="outlined"
          />
          <TextField
            label="Địa Chỉ"
            fullWidth
            value={formData.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Ví dụ: 123 Đường X, TP.HCM"
            variant="outlined"
          />
          <TextField
            label="Mô Tả"
            fullWidth
            multiline
            rows={5}
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Nhập mô tả chi tiết về phòng khám"
            variant="outlined"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#f0fdf4', borderRadius: 1 }}>
            <input
              type="checkbox"
              checked={formData.active !== false}
              onChange={(e) => handleInputChange('active', e.target.checked)}
              className="w-5 h-5 cursor-pointer"
            />
            <label className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
              Phòng khám này đang hoạt động
            </label>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined">
            Hủy
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editingId ? 'Cập Nhật' : 'Tạo Mới'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#dc2626' }}>
          ⚠️ Xác Nhận Xóa
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <p className="text-gray-700 dark:text-gray-300">
            Bạn có chắc chắn muốn xóa phòng khám này không? Hành động này không thể hoàn tác.
          </p>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
            variant="contained"
            color="error"
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </div>
  );
};

export default DentalInfoManagement;
