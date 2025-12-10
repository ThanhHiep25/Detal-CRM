import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Avatar,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    IconButton,
    Paper,
    Stack,
    Divider,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DrugAPI, type DrugItem } from '../../services/drugs';
import { toast, ToastContainer } from 'react-toastify';

interface UserData {
    username: string;
    email: string;
    role: string;
    avatar_url?: string;
}

export default function DrugList() {
    const [items, setItems] = useState<DrugItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [tagFilter, setTagFilter] = useState<string>('');
    const [search, setSearch] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [creating, setCreating] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<DrugItem>>({});
    const [form, setForm] = useState<Partial<DrugItem>>({
        name: '',
        tag: '',
        description: '',
        quantity: 0,
        importedAt: '',
        expiryDate: '',
        status: '',
        price: 0,
        priceUnit: ''
    });

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Get user role from localStorage
    const isAdmin = useMemo(() => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return false;
            const user: UserData = JSON.parse(userData);
            return user.role === 'ROLE_ADMIN';
        } catch {
            return false;
        }
    }, []);

    const load = async (tag?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await DrugAPI.getDrugs(tag);
            if (res && res.success) setItems(res.data || []);
            else setError(res.message || 'Không lấy được danh sách thuốc');
        } catch (e) {
            setError((e as Error)?.message || 'Lỗi mạng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // derived list of tags from items for quick chips
    const tags = useMemo(() => {
        const s = new Set<string>();
        items.forEach(i => { if (i.tag) s.add(i.tag); });
        return Array.from(s).sort();
    }, [items]);

    const STATUS_OPTIONS: { value: string; label: string }[] = [
        { value: 'in_stock', label: 'Có hàng' },
        { value: 'low_stock', label: 'Sắp hết' },
        { value: 'out_of_stock', label: 'Hết hàng' },
        { value: 'near_expiry', label: 'Sắp hết hạn' },
        { value: 'expired', label: 'Hết hạn' },
        { value: 'pending', label: 'Đang chờ' },
        { value: 'discontinued', label: 'Ngưng cung cấp' }
    ];

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(it => {
            if (tagFilter) {
                if (!it.tag || it.tag.toLowerCase() !== tagFilter.toLowerCase()) return false;
            }
            if (statusFilter) {
                if (!it.status || it.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
            }
            if (!q) return true;
            return (it.name || '').toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q) || (it.tag || '').toLowerCase().includes(q);
        });
    }, [items, search, tagFilter, statusFilter]);

    // pagination slice
    const paged = useMemo(() => {
        const start = page * rowsPerPage;
        return filtered.slice(start, start + rowsPerPage);
    }, [filtered, page, rowsPerPage]);

    const openCreate = () => { setForm({ name: '', tag: '', description: '', quantity: 0, importedAt: '', expiryDate: '', status: '', price: 0, priceUnit: '' }); setCreateOpen(true); };
    const closeCreate = () => { setCreateOpen(false); };

    const handleCreate = async () => {
        setCreating(true);
        try {
            const payload: Partial<DrugItem> = {
                name: (form.name || '').trim(),
                tag: form.tag,
                description: form.description,
                quantity: Number(form.quantity || 0),
                importedAt: form.importedAt,
                expiryDate: form.expiryDate,
                status: form.status
                ,price: Number(form.price || 0),
                priceUnit: form.priceUnit
            };
            const res = await DrugAPI.createDrug(payload);
            if (res && res.success) {
                await load();
                closeCreate();
                toast.success('Tạo thành công');
            } else {
                toast.error(res.message || 'Tạo thất bại');
            }
        } catch (e) {
            toast.error((e as Error)?.message || 'Lỗi mạng');
        } finally {
            setCreating(false);
        }
    };

    const openConfirm = (id: number) => { setDeletingId(id); setConfirmOpen(true); };
    const closeConfirm = () => { setConfirmOpen(false); setDeletingId(null); };
    const handleDeleteConfirm = async () => {
        if (deletingId == null) return;
        try {
            const res = await DrugAPI.deleteDrug(deletingId);
            if (res && res.success) {
                toast.success('Xóa thành công');
                await load();
            } else {
                toast.error(res.message || 'Xóa thất bại');
            }
        } catch (e) {
            toast.error((e as Error)?.message || 'Lỗi mạng');
        } finally {
            closeConfirm();
        }
    };

    const openEdit = (item: DrugItem) => {
        setEditForm({ ...item });
        setEditOpen(true);
    };
    const closeEdit = () => { setEditOpen(false); setEditForm({}); };
    const handleUpdate = async () => {
        if (!editForm || typeof editForm.id !== 'number') return;
        setEditing(true);
        try {
            const payload: Partial<DrugItem> = {
                name: (editForm.name || '').trim(),
                tag: editForm.tag,
                description: editForm.description,
                quantity: Number(editForm.quantity || 0),
                importedAt: editForm.importedAt,
                expiryDate: editForm.expiryDate,
                status: editForm.status
                ,price: Number(editForm.price || 0),
                priceUnit: editForm.priceUnit
            };
            const res = await DrugAPI.updateDrug(editForm.id, payload);
            if (res && res.success) {
                toast.success('Cập nhật thành công');
                await load();
                closeEdit();
            } else {
                toast.error(res.message || 'Cập nhật thất bại');
            }
        } catch (e) {
            toast.error((e as Error)?.message || 'Lỗi mạng');
        } finally {
            setEditing(false);
        }
    };

    return (
        <div className="p-4 bg-white rounded-xl">
               {/* Header Section */}
        <div className="bg-gradient-to-r mb-5 from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản lý</p>
              <Typography variant="h5" fontWeight="bold" className="text-white">Danh sách thuốc</Typography>
            </div>
          </div>
        </div>
            <ToastContainer />
            <Paper sx={{ p: 1, mb: 2 }} elevation={2}>
                <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth size="small" label="Tìm theo tên / mô tả" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
                    </Grid>

                    <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="tag-filter-label">Tag</InputLabel>
                            <Select
                                labelId="tag-filter-label"
                                label="Tag"
                                value={tagFilter}
                                onChange={(e) => { const v = String((e.target as HTMLInputElement).value); setTagFilter(v); load(v || undefined); setPage(0); }}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                {tags.map(t => (
                                    <MenuItem key={t} value={t}>{t}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="status-filter-label">Trạng thái</InputLabel>
                            <Select
                                labelId="status-filter-label"
                                label="Trạng thái"
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(String((e.target as HTMLInputElement).value)); setPage(0); }}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                {STATUS_OPTIONS.map(s => (
                                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={1} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                        <Stack direction="row" spacing={1} justifyContent={isMobile ? 'flex-start' : 'flex-end'}>
                            <Tooltip title={isAdmin ? "Tạo thuốc mới" : "Bạn không có quyền tạo"}>
                                <span>
                                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate} fullWidth={isMobile} disabled={!isAdmin}>Tạo</Button>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Grid>

                    <Grid item xs={12}>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                            <Button size="small" onClick={() => { setTagFilter(''); setStatusFilter(''); load(); setPage(0); }}>Tất cả</Button>
                            {/* {tags.map(t => (
                                <Chip key={t} size="small" label={t} clickable onClick={() => { setTagFilter(t); load(t); setPage(0); }} variant="outlined" sx={{ bgcolor: 'background.paper' }} />
                            ))} */}
                            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                            {STATUS_OPTIONS.map(s => (
                                <Tooltip key={s.value} title={s.label}>
                                    <Chip
                                        size="small"
                                        label={s.label}
                                        clickable
                                        variant={statusFilter === s.value ? 'filled' : 'outlined'}
                                        color={s.value === 'in_stock' ? 'success' : s.value === 'out_of_stock' ? 'error' : 'default'}
                                        onClick={() => { setStatusFilter(s.value); setPage(0); }}
                                    />
                                </Tooltip>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : error ? (
                <Typography color="error">{error}</Typography>
            ) : (
                <>
                    {!isMobile ? (
                        <Card>
                            <CardContent>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ px: 1, py: 0.5 }}>ID</TableCell>
                                                <TableCell sx={{ px: 1, py: 0.5 }}>Tên thuốc</TableCell>
                                                <TableCell sx={{ px: 1, py: 0.5 }}>Thể loại</TableCell>
                                                <TableCell sx={{ px: 1, py: 0.5 }}>Số lượng</TableCell>
                                <TableCell sx={{ px: 1, py: 0.5 }}>Giá</TableCell>
                                <TableCell sx={{ px: 1, py: 0.5 }}>Đơn vị</TableCell>
                                                <TableCell sx={{ px: 1, py: 0.5 }}>Trạng thái</TableCell>
                                                <TableCell sx={{ px: 1, py: 0.5 }}>Hạn sử dụng</TableCell>
                                                <TableCell sx={{ px: 1, py: 0.5 }}>Ngày nhập</TableCell>
                                                <TableCell sx={{ px: 1, py: 0.5 }}>Mô tả</TableCell>
                                                <TableCell align="right" sx={{ px: 1, py: 0.5 }}>Hành động</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {paged.map(d => (
                                                <TableRow key={d.id} hover>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>{d.id}</TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>{d.name}</TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>{d.tag}</TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>{d.quantity ?? 0}</TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>{d.price != null ? d.price.toLocaleString('vi-VN') + ' đ' : '-'}</TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>{d.priceUnit ?? '-'}</TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>
                                                        {d.status ? (
                                                            <Chip
                                                                label={STATUS_OPTIONS.find(s => s.value === d.status)?.label || d.status}
                                                                size="small"
                                                                color={d.status === 'in_stock' ? 'success' : d.status === 'low_stock' ? 'warning' : d.status === 'out_of_stock' ? 'error' : d.status === 'expired' ? 'default' : 'primary'}
                                                            />
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>{d.expiryDate ?? ''}</TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5 }}>{d.importedAt ?? ''}</TableCell>
                                                    <TableCell sx={{ px: 1, py: 0.5, whiteSpace: 'pre-line', wordBreak: 'break-word', maxWidth: 300, lineClamp: 2, height: '3em', overflow: 'hidden' }} >{d.description}</TableCell>
                                                    <TableCell align="right" sx={{ px: 1, py: 0.5 }}>
                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            <Tooltip title={isAdmin ? "Sửa" : "Bạn không có quyền sửa"}>
                                                                <span>
                                                                    <IconButton size="small" onClick={() => openEdit(d)} disabled={!isAdmin}><EditIcon fontSize="small" /></IconButton>
                                                                </span>
                                                            </Tooltip>
                                                            <Tooltip title={isAdmin ? "Xóa" : "Bạn không có quyền xóa"}>
                                                                <span>
                                                                    <IconButton size="small" onClick={() => openConfirm(d.id)} disabled={!isAdmin}><DeleteIcon fontSize="small" /></IconButton>
                                                                </span>
                                                            </Tooltip>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {filtered.length === 0 && <Typography sx={{ mt: 2 }} color="text.secondary">Không có thuốc nào phù hợp.</Typography>}

                                {/* Pagination */}
                                {filtered.length > 0 && (
                                    <TablePagination
                                        component="div"
                                        count={filtered.length}
                                        page={page}
                                        onPageChange={(_, newPage) => setPage(newPage)}
                                        rowsPerPage={rowsPerPage}
                                        onRowsPerPageChange={(e) => { setRowsPerPage(Number((e.target as HTMLInputElement).value)); setPage(0); }}
                                        rowsPerPageOptions={[5, 10, 25, 50]}
                                        sx={{ mt: 1 }}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Stack spacing={2}>
                            {filtered.length === 0 && <Typography sx={{ mt: 1 }} color="text.secondary">Không có thuốc nào phù hợp.</Typography>}
                            {paged.map(d => (
                                <Card key={d.id} variant="outlined" sx={{ p: 1 }}>
                                    <CardHeader
                                        avatar={<Avatar>{(d.name || '').charAt(0).toUpperCase() || '?'}</Avatar>}
                                        title={<Typography variant="subtitle2">{d.name}</Typography>}
                                        subheader={<Stack direction="row" spacing={1} alignItems="center"><Chip size="small" label={d.tag} variant="outlined" /><Chip size="small" label={STATUS_OPTIONS.find(s => s.value === d.status)?.label || d.status} color={d.status === 'in_stock' ? 'success' : d.status === 'out_of_stock' ? 'error' : 'default'} variant="outlined" /></Stack>}
                                        action={
                                            <Stack direction="row" spacing={1}>
                                                <Tooltip title={isAdmin ? "Sửa" : "Chỉ admin mới có thể sửa"}>
                                                    <span>
                                                        <IconButton size="small" onClick={() => openEdit(d)} disabled={!isAdmin}><EditIcon fontSize="small" /></IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title={isAdmin ? "Xóa" : "Chỉ admin mới có thể xóa"}>
                                                    <span>
                                                        <IconButton size="small" onClick={() => openConfirm(d.id)} disabled={!isAdmin}><DeleteIcon fontSize="small" /></IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        }
                                    />
                                    <CardContent sx={{ pt: 0 }}>
                                        {/* On mobile keep brief: don't show description/importedAt to save space */}
                                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                            <Typography variant="caption">Số lượng: <strong>{d.quantity ?? 0}</strong></Typography>
                                            <Typography variant="caption">Giá: <strong>{d.price != null ? d.price.toLocaleString('vi-VN') + ' đ' : '-'}</strong></Typography>
                                            <Typography variant="caption">Đơn vị: <strong>{d.priceUnit ?? '-'}</strong></Typography>
                                            <Typography variant="caption">Hạn: <strong>{d.expiryDate ?? '-'}</strong></Typography>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Mobile pagination controls */}
                            {filtered.length > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <TablePagination
                                        component="div"
                                        count={filtered.length}
                                        page={page}
                                        onPageChange={(_, newPage) => setPage(newPage)}
                                        rowsPerPage={rowsPerPage}
                                        onRowsPerPageChange={(e) => { setRowsPerPage(Number((e.target as HTMLInputElement).value)); setPage(0); }}
                                        rowsPerPageOptions={[5, 10, 25]}
                                    />
                                </Box>
                            )}
                        </Stack>
                    )}
                </>
            )}

            <Dialog open={createOpen} onClose={closeCreate} fullWidth maxWidth="sm">
                <DialogTitle>Tạo thuốc mới</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Tên" value={form.name ?? ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
                        <TextField label="Tag" value={form.tag ?? ''} onChange={(e) => setForm(f => ({ ...f, tag: e.target.value }))} fullWidth />
                        <TextField label="Mô tả" value={form.description ?? ''} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={3} />
                                                                        <TextField
                                                                            label="Số lượng"
                                                                            type="text"
                                                                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                                            value={form.quantity ?? 0}
                                                                            onChange={(e) => {
                                                                                // keep only digits, remove leading zeros (but keep single zero)
                                                                                const raw = String(e.target.value || '');
                                                                                const digits = raw.replace(/\D+/g, '');
                                                                                const sanitized = digits.replace(/^0+(?=\d)/, '');
                                                                                setForm(f => ({ ...f, quantity: Number(sanitized || 0) }));
                                                                            }}
                                                                        />
                                                                        <TextField
                                                                            label="Giá"
                                                                            type="text"
                                                                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                                            value={form.price ?? 0}
                                                                            onChange={(e) => {
                                                                                const raw = String(e.target.value || '');
                                                                                const digits = raw.replace(/\D+/g, '');
                                                                                const sanitized = digits.replace(/^0+(?=\d)/, '');
                                                                                setForm(f => ({ ...f, price: Number(sanitized || 0) }));
                                                                            }}
                                                                        />
                        <TextField label="Đơn vị giá" value={form.priceUnit ?? ''} onChange={(e) => setForm(f => ({ ...f, priceUnit: e.target.value }))} />
                        <Stack direction="row" spacing={1}>
                            <TextField label="Ngày nhập" type="date" value={form.importedAt ?? ''} onChange={(e) => setForm(f => ({ ...f, importedAt: e.target.value }))} InputLabelProps={{ shrink: true }} />
                            <TextField label="Hạn dùng" type="date" value={form.expiryDate ?? ''} onChange={(e) => setForm(f => ({ ...f, expiryDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                        </Stack>
                        <FormControl fullWidth>
                            <InputLabel id="create-status-label">Trạng thái</InputLabel>
                            <Select
                                labelId="create-status-label"
                                label="Trạng thái"
                                value={form.status ?? ''}
                                onChange={(e) => setForm(f => ({ ...f, status: String((e.target as HTMLInputElement).value) }))}
                                size="small"
                            >
                                <MenuItem value="">Chọn trạng thái</MenuItem>
                                {STATUS_OPTIONS.map(s => (
                                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeCreate}>Hủy</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo'}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={confirmOpen} onClose={closeConfirm}>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <Typography>Bạn có chắc muốn xóa thuốc này không?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeConfirm}>Hủy</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Xóa</Button>
                </DialogActions>
            </Dialog>

            {/* Edit dialog */}
            <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
                <DialogTitle>Cập nhật thuốc</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Tên" value={editForm.name ?? ''} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} fullWidth />
                        <TextField label="Tag" value={editForm.tag ?? ''} onChange={(e) => setEditForm(f => ({ ...f, tag: e.target.value }))} fullWidth />
                        <TextField label="Mô tả" value={editForm.description ?? ''} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={3} />
                                                                        <TextField
                                                                            label="Số lượng"
                                                                            type="text"
                                                                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                                            value={editForm.quantity ?? 0}
                                                                            onChange={(e) => {
                                                                                const raw = String(e.target.value || '');
                                                                                const digits = raw.replace(/\D+/g, '');
                                                                                const sanitized = digits.replace(/^0+(?=\d)/, '');
                                                                                setEditForm(f => ({ ...f, quantity: Number(sanitized || 0) }));
                                                                            }}
                                                                        />
                                                                        <TextField
                                                                            label="Giá"
                                                                            type="text"
                                                                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                                            value={editForm.price ?? 0}
                                                                            onChange={(e) => {
                                                                                const raw = String(e.target.value || '');
                                                                                const digits = raw.replace(/\D+/g, '');
                                                                                const sanitized = digits.replace(/^0+(?=\d)/, '');
                                                                                setEditForm(f => ({ ...f, price: Number(sanitized || 0) }));
                                                                            }}
                                                                        />
                        <TextField label="Đơn vị giá" value={editForm.priceUnit ?? ''} onChange={(e) => setEditForm(f => ({ ...f, priceUnit: e.target.value }))} />
                        <Stack direction="row" spacing={1}>
                            <TextField label="Ngày nhập" type="date" value={editForm.importedAt ?? ''} onChange={(e) => setEditForm(f => ({ ...f, importedAt: e.target.value }))} InputLabelProps={{ shrink: true }} />
                            <TextField label="Hạn dùng" type="date" value={editForm.expiryDate ?? ''} onChange={(e) => setEditForm(f => ({ ...f, expiryDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                        </Stack>
                        <FormControl fullWidth>
                            <InputLabel id="edit-status-label">Trạng thái</InputLabel>
                            <Select
                                labelId="edit-status-label"
                                label="Trạng thái"
                                value={editForm.status ?? ''}
                                onChange={(e) => setEditForm(f => ({ ...f, status: String((e.target as HTMLInputElement).value) }))}
                                size="small"
                            >
                                <MenuItem value="">Chọn trạng thái</MenuItem>
                                {STATUS_OPTIONS.map(s => (
                                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEdit}>Hủy</Button>
                    <Button variant="contained" onClick={handleUpdate} disabled={editing}>{editing ? 'Đang lưu...' : 'Lưu'}</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
