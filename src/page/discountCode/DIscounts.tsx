import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Chip,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';
import DiscountsAPI, { type Discount } from '../../services/discounts';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Discount> | null>(null);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | string>('ALL');
  const [selectionModel, setSelectionModel] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIds, setConfirmIds] = useState<number[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await DiscountsAPI.getAll();
      if (res && res.success) setDiscounts(res.data || []);
      else toast.error(res.message || 'Không thể tải danh sách');
    } catch {
      toast.error('Lỗi khi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing({ name: '', code: '', percent: undefined, amount: undefined, status: 'ACTIVE' });
    setOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditing({ ...d });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  const save = async () => {
    if (!editing) return;
    // validation: name required and at least percent or amount
    if (!editing.name || editing.name.trim().length === 0) {
      toast.error('Vui lòng nhập tên mã giảm giá');
      return;
    }
    const hasPercent = typeof editing.percent === 'number' && !Number.isNaN(editing.percent) && editing.percent! > 0;
    const hasAmount = typeof editing.amount === 'number' && !Number.isNaN(editing.amount) && editing.amount! > 0;
    if (!hasPercent && !hasAmount) {
      toast.error('Phải cung cấp percent hoặc amount');
      return;
    }

    try {
      if (editing.id) {
        const res = await DiscountsAPI.update(editing.id, editing as Partial<Discount>);
        if (res && res.success) {
          toast.success('Cập nhật thành công');
          await load();
          close();
        } else {
          toast.error(res.message || 'Cập nhật thất bại');
        }
      } else {
        const payload = { ...editing } as Partial<Discount>;
        const res = await DiscountsAPI.create(payload);
        if (res && res.success) {
          toast.success('Tạo mã giảm giá thành công');
          await load();
          close();
        } else {
          toast.error(res.message || 'Tạo thất bại');
        }
      }
    } catch {
      toast.error('Lỗi khi lưu mã giảm giá');
    }
  };

  // open confirmation dialog for delete (accepts single id or multiple)
  const openDeleteConfirm = (ids: number[]) => {
    setConfirmIds(ids);
    setConfirmOpen(true);
  };

  const doDelete = async (id?: number) => {
    if (!id) return openDeleteConfirm([]);
    openDeleteConfirm([id]);
  };

  const handleConfirmDelete = async () => {
    if (confirmIds.length === 0 && selectionModel.length === 0) {
      setConfirmOpen(false);
      return;
    }
    const idsToDelete = confirmIds.length > 0 ? confirmIds : selectionModel;
    setConfirmLoading(true);
    try {
      // delete sequentially to show clearer errors
      for (const id of idsToDelete) {
        const res = await DiscountsAPI.delete(id);
        if (!res || !res.success) {
          toast.error(`Xóa ${id} thất bại: ${res?.message || 'Lỗi'}`);
        }
      }
      toast.success('Xóa hoàn tất');
      setSelectionModel([]);
      await load();
    } catch {
      toast.error('Lỗi khi xóa');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmIds([]);
    }
  };

  // export currently visible rows (or selected rows) to CSV
  const exportCsv = () => {
    const visible = discounts.filter(d => {
      const t = filterText.trim().toLowerCase();
      if (t) {
        if (!d.name?.toLowerCase().includes(t) && !(d.code || '').toLowerCase().includes(t)) return false;
      }
      if (filterStatus !== 'ALL' && String(d.status || '').toUpperCase() !== String(filterStatus).toUpperCase()) return false;
      return true;
    });
    const rows = selectionModel.length > 0 ? visible.filter(v => selectionModel.includes(v.id)) : visible;
    if (!rows || rows.length === 0) {
      toast.info('Không có dữ liệu để xuất');
      return;
    }
    const header = ['id', 'code', 'name', 'percent', 'amount', 'expiresAt', 'status'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const line = [
        r.id,
        `"${(r.code || '').replace(/"/g, '""')}"`,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        r.percent ?? '',
        r.amount ?? '',
        r.expiresAt ?? '',
        r.status ?? ''
      ].join(',');
      lines.push(line);
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discounts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 bg-white rounded-xl ">

      {/* Header Section */}
      <div className="bg-gradient-to-r mb-5 from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản lý</p>
            <Typography variant="h5" fontWeight="bold" className="text-white">Danh sách mã giảm giá</Typography>

          </div>
          <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>Tạo mới</Button>
        </div>
      </div>



      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField size="small" placeholder="Tìm kiếm theo tên" value={filterText} onChange={(e) => setFilterText(e.target.value)} sx={{ minWidth: 240 }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="filter-status-label">Trạng thái</InputLabel>
            <Select labelId="filter-status-label" label="Trạng thái" value={filterStatus} onChange={(e) => setFilterStatus(String((e.target as HTMLInputElement).value))}>
              <MenuItem value="ALL">Tất cả</MenuItem>
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="INACTIVE">INACTIVE</MenuItem>
              <MenuItem value="EXPIRED">EXPIRED</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => { exportCsv(); }}>Xuất CSV</Button>
          <Button color="error" variant="outlined" disabled={selectionModel.length === 0} onClick={() => openDeleteConfirm(selectionModel)}>Xóa đã chọn</Button>
        </Stack>
        <Box sx={{ height: 440, width: '100%' }}>
          <DataGrid
            rows={discounts.filter(d => {
              const t = filterText.trim().toLowerCase();
              if (t) {
                if (!d.name?.toLowerCase().includes(t) && !(d.code || '').toLowerCase().includes(t)) return false;
              }
              if (filterStatus !== 'ALL' && String(d.status || '').toUpperCase() !== String(filterStatus).toUpperCase()) return false;
              return true;
            })}
            columns={[
              { field: 'name', headerName: 'Tên', flex: 1 } as GridColDef,
              { field: 'percent', headerName: 'Percent', width: 110, renderCell: (params: GridRenderCellParams) => (params.value ?? '-') } as GridColDef,
              { field: 'amount', headerName: 'Amount', width: 140, renderCell: (params: GridRenderCellParams) => (params.value != null ? Number(params.value).toLocaleString('vi-VN') : '-') } as GridColDef,
              { field: 'expiresAt', headerName: 'Hết hạn', width: 200, renderCell: (params: GridRenderCellParams) => (params.value ? new Date(String(params.value)).toLocaleString() : '-') } as GridColDef,
              {
                field: 'status', headerName: 'Trạng thái', width: 140, renderCell: (params: GridRenderCellParams) => {
                  const v = String(params.value || '').toUpperCase();
                  type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
                  type ChipVariant = 'filled' | 'outlined';
                  const color: ChipColor = v === 'ACTIVE' ? 'success' : v === 'EXPIRED' ? 'error' : v === 'INACTIVE' ? 'default' : 'primary';
                  const variant: ChipVariant = v === 'INACTIVE' ? 'outlined' : 'filled';
                  return <Chip label={v} color={color} size="small" variant={variant} />;
                }
              } as GridColDef,
              {
                field: 'actions', headerName: 'Hành động', width: 140, sortable: false, filterable: false, renderCell: (params: GridRenderCellParams) => {
                  const row = params.row as Discount;
                  return (
                    <>
                      <IconButton size="small" onClick={() => openEdit(row)}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => doDelete(row.id)}><DeleteIcon /></IconButton>
                    </>
                  );
                }
              } as GridColDef
            ]}
            pageSizeOptions={[5, 10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pagination
            loading={loading}
            checkboxSelection
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={(newModel) => setSelectionModel(newModel as number[])}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>

      {/* Confirmation dialog for deletes */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa {confirmIds.length > 0 ? confirmIds.length : selectionModel.length} mã giảm giá?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={confirmLoading}>{confirmLoading ? 'Đang xóa...' : 'Xóa'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Tên" value={editing?.name || ''} onChange={(e) => setEditing(s => ({ ...(s || {}), name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Mã (code)" value={editing?.code || ''} onChange={(e) => setEditing(s => ({ ...(s || {}), code: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="number" label="Percent (%)" value={editing?.percent ?? ''} onChange={(e) => setEditing(s => ({ ...(s || {}), percent: e.target.value === '' ? undefined : Number(e.target.value) }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="number" label="Amount (VND)" value={editing?.amount ?? ''} onChange={(e) => setEditing(s => ({ ...(s || {}), amount: e.target.value === '' ? undefined : Number(e.target.value) }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Hết hạn" type="datetime-local" value={editing?.expiresAt ? new Date(editing.expiresAt).toISOString().slice(0, 16) : ''} onChange={(e) => setEditing(s => ({ ...(s || {}), expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="status-label">Trạng thái</InputLabel>
                  <Select labelId="status-label" label="Trạng thái" value={editing?.status || 'ACTIVE'} onChange={(e) => setEditing(s => ({ ...(s || {}), status: String(e.target.value) }))}>
                    <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                    <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                    <MenuItem value="EXPIRED">EXPIRED</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Hủy</Button>
          <Button variant="contained" onClick={save}>{editing?.id ? 'Lưu' : 'Tạo'}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
