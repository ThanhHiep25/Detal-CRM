import React, { useEffect, useState } from 'react';
import PrescriptionSampleAPI, { PrescriptionSample } from '../../services/prescriptionSample';
import DrugAPI, { DrugItem } from '../../services/drugs';
import { CardContent, Grid, TextField, Button, Select, MenuItem, InputLabel, FormControl, Chip, Box, Typography, List, IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
// removed unused icons
import { grey } from '@mui/material/colors';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PrescriptionSamplePage: React.FC = () => {
    const [samples, setSamples] = useState<PrescriptionSample[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('DRAFT');
    const [drugs, setDrugs] = useState<DrugItem[]>([]);
    const [prices, setPrices] = useState<Record<number, number>>({});
    const [selectedDrugId, setSelectedDrugId] = useState<number | ''>('');
    const [selectedDrugQty, setSelectedDrugQty] = useState<number>(1);
    const [sampleLines, setSampleLines] = useState<Array<{ id: number; qty: number }>>([]);
    const [loading, setLoading] = useState(false);

    // small toast helper using react-toastify
    const showToast = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        // react-toastify uses 'type' instead of severity
        toast(message, { type: severity });
    };
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number }>({ open: false, id: undefined });

    const inputStyles = {
        '& .MuiFilledInput-root': {
            backgroundColor: grey[50],
            borderRadius: 1
        }
    };

    const [openAddDrug, setOpenAddDrug] = useState(false);
    const [newDrugName, setNewDrugName] = useState('');
    const [newDrugTag, setNewDrugTag] = useState('');
    const [newDrugDesc, setNewDrugDesc] = useState('');
    const [newDrugPrice, setNewDrugPrice] = useState<number | ''>('');
    const [addingDrug, setAddingDrug] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailSample, setDetailSample] = useState<PrescriptionSample | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const fetchSamples = async () => {
        setLoading(true);
        const res = await PrescriptionSampleAPI.getSamples();
        setLoading(false);
        if (res.success) setSamples(res.data || []);
        else showToast(res.message || 'Failed to load samples', 'error');
    };

    const fetchDrugs = async () => {
        const res = await DrugAPI.getDrugs();
        if (res.success) setDrugs(res.data || []);
        else { console.warn('Failed to load drugs:', res.message); showToast('Không thể tải danh sách thuốc', 'error'); }
    };

    // keep a simple price map derived from drug catalog
    useEffect(() => {
        if (!drugs || drugs.length === 0) { setPrices({}); return; }
        const map: Record<number, number> = {};
        drugs.forEach(d => {
            if (typeof d.price === 'number' && !Number.isNaN(d.price)) map[d.id] = d.price;
        });
        setPrices(map);
    }, [drugs]);

    // intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchSamples(); fetchDrugs(); }, []);

    const handleCreate = async () => {
        if (!name.trim()) { showToast('Tên mẫu là bắt buộc', 'warning'); return; }
        if (sampleLines.length === 0) { showToast('Vui lòng thêm ít nhất một thuốc vào đơn', 'warning'); return; }
        const drugIds = sampleLines.map(l => l.id);
        const lines = sampleLines.map(l => ({ drugId: l.id, quantity: l.qty }));
        const totalAmount = sampleLines.reduce((s, it) => s + (((prices[it.id] ?? drugs.find(d => d.id === it.id)?.price) || 0) * it.qty), 0);
        const payload = { name, description, status, drugIds, lines, totalAmount } as unknown as Partial<PrescriptionSample>;
        setLoading(true);
        try {
            let res;
            if (editingId) {
                res = await PrescriptionSampleAPI.updateSample(editingId, payload);
            } else {
                res = await PrescriptionSampleAPI.createSample(payload);
            }
            setLoading(false);
            if (res && res.success) {
                setName(''); setDescription(''); setStatus('DRAFT'); setSampleLines([]);
                setEditingId(null);
                fetchSamples();
                showToast(editingId ? 'Cập nhật mẫu thành công' : 'Tạo mẫu thành công', 'success');
            } else {
                showToast(res?.message || (editingId ? 'Cập nhật mẫu thất bại' : 'Tạo mẫu thất bại'), 'error');
            }
        } catch {
            setLoading(false);
            showToast('Lỗi khi lưu mẫu', 'error');
        }
    };

    const handleDelete = (id?: number) => {
        if (id == null) return;
        setDeleteConfirm({ open: true, id });
    };
    const openDetail = (s: PrescriptionSample) => {
        setDetailSample(s);
        setDetailOpen(true);
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailSample(null);
    };

    const startEdit = (s: PrescriptionSample) => {
        setEditingId(s.id ?? null);
        setName(s.name || '');
        setDescription(s.description || '');
        setStatus(s.status || 'DRAFT');
        // populate sampleLines from lines or drugIds
        const lines = (s as unknown as { lines?: Array<{ drugId?: number; quantity?: number }> }).lines;
        if (lines && lines.length > 0) {
            setSampleLines(lines.map(l => ({ id: l.drugId as number, qty: l.quantity as number })));
        } else {
            setSampleLines((s.drugIds || []).map(id => ({ id, qty: 1 })));
        }
        // scroll to top where form is
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* ignore */ }
    };

    const handleDeleteConfirmed = async () => {
        const id = deleteConfirm.id;
        if (!id) { setDeleteConfirm({ open: false }); return; }
        setLoading(true);
        const res = await PrescriptionSampleAPI.deleteSample(id);
        setLoading(false);
        setDeleteConfirm({ open: false });
        if (res.success) { fetchSamples(); showToast('Xóa mẫu thành công', 'success'); }
        else { showToast(res.message || 'Xóa thất bại', 'error'); }
    };

    return (
        <div className='p-4 bg-white rounded-xl'>
            <ToastContainer/>
            <CardContent>
                <Grid container spacing={3}>
                    {/* Left: Form + quantity/lines */}
                    <Grid item xs={12} md={8}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6">Thêm mẫu đơn thuốc</Typography>
                                <Chip label={status} size="small" color={status === 'ACTIVE' ? 'success' : status === 'INACTIVE' ? 'default' : 'warning'} />
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                <TextField variant="filled" label="Tên mẫu" value={name} onChange={e => setName(e.target.value)} sx={inputStyles} fullWidth />
                                <TextField variant="filled" label="Mô tả" value={description} onChange={e => setDescription(e.target.value)} sx={inputStyles} fullWidth multiline rows={3} />
                                <FormControl fullWidth>
                                    <InputLabel id="ps-status-label">Trạng thái</InputLabel>
                                    <Select labelId="ps-status-label" value={status} onChange={e => setStatus(e.target.value)} label="Trạng thái">
                                        <MenuItem value="DRAFT">DRAFT</MenuItem>
                                        <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                                        <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel id="ps-drug-single-label">Chọn thuốc</InputLabel>
                                    <Select labelId="ps-drug-single-label" value={String(selectedDrugId)} onChange={e => {
                                        const v = e.target.value as string;
                                        const n = parseInt(v, 10);
                                        setSelectedDrugId(Number.isNaN(n) ? '' : n);
                                    }} label="Chọn thuốc">
                                        <MenuItem value=""><em>Chọn thuốc</em></MenuItem>
                                        {drugs.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.name}{d.tag ? ` (${d.tag})` : ''}</MenuItem>)}
                                    </Select>
                                </FormControl>

                                {/* Quantity controls */}
                                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <TextField label="Số lượng" type="number" inputProps={{ min: 1 }} value={selectedDrugQty} onChange={e => setSelectedDrugQty(Math.max(1, Number(e.target.value) || 1))} sx={{ width: 120 }} />
                                        <Button size="small" onClick={() => {
                                            if (!selectedDrugId) { showToast('Vui lòng chọn thuốc', 'warning'); return; }
                                            const exists = sampleLines.find(l => l.id === selectedDrugId);
                                            if (exists) {
                                                setSampleLines(prev => prev.map(l => l.id === selectedDrugId ? { ...l, qty: l.qty + selectedDrugQty } : l));
                                            } else {
                                                setSampleLines(prev => [...prev, { id: selectedDrugId as number, qty: selectedDrugQty }]);
                                            }
                                            setSelectedDrugId(''); setSelectedDrugQty(1);
                                        }} variant="contained">Thêm vào đơn</Button>
                                    
                                        <Box sx={{ flex: 1 }} />
                                        <Typography variant="body2">Số dòng: {sampleLines.length}</Typography>
                                    </Box>
                                </Paper>

                                {/* Selected lines */}
                                <Paper variant="outlined" sx={{ p: 1, mt: 2 }}>
                                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Chi tiết đơn</Typography>
                                    {sampleLines.length > 0 ? (
                                        <TableContainer sx={{ maxHeight: 300 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Sản phẩm</TableCell>
                                                        <TableCell align="right">Đơn giá</TableCell>
                                                        <TableCell align="center" sx={{ width: 120 }}>Số lượng</TableCell>
                                                        <TableCell align="right">Thành tiền</TableCell>
                                                        <TableCell align="center">Hành động</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {sampleLines.map(line => {
                                                        const d = drugs.find(x => x.id === line.id);
                                                        const price = (prices[line.id] ?? d?.price) || 0;
                                                        const subtotal = price * (line.qty || 0);
                                                        return (
                                                            <TableRow key={line.id}>
                                                                <TableCell>{d ? d.name : String(line.id)}</TableCell>
                                                                <TableCell align="right">{price.toLocaleString('vi-VN')} đ</TableCell>
                                                                <TableCell align="center">
                                                                    <TextField
                                                                        type="number"
                                                                        size="small"
                                                                        inputProps={{ min: 1 }}
                                                                        value={line.qty}
                                                                        onChange={e => {
                                                                            const q = Math.max(1, Number(e.target.value) || 1);
                                                                            setSampleLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: q } : l));
                                                                        }}
                                                                        sx={{ width: 100 }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">{subtotal.toLocaleString('vi-VN')} đ</TableCell>
                                                                <TableCell align="center">
                                                                    <IconButton size="small" onClick={() => setSampleLines(prev => prev.filter(p => p.id !== line.id))}>
                                                                        <DeleteIcon fontSize="small" />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">Chưa thêm thuốc nào vào đơn.</Typography>
                                    )}

                                    <Divider sx={{ my: 1 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Paper variant="outlined" sx={{ width: 280, p: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div>Tổng</div>
                                                <div>{sampleLines.reduce((s, it) => s + (((prices[it.id] ?? drugs.find(d => d.id === it.id)?.price) || 0) * it.qty), 0).toLocaleString('vi-VN')} đ</div>
                                            </Box>
                                        </Paper>
                                    </Box>
                                </Paper>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="contained" onClick={handleCreate} disabled={loading} fullWidth> Tạo mẫu </Button>
                                    <Button variant="outlined" onClick={() => { setName(''); setDescription(''); setStatus('DRAFT'); setSampleLines([]); }} fullWidth>Hủy</Button>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Right: Samples list only */}
                    <Grid item xs={12} md={4}>
                        <Paper variant="outlined" sx={{ p: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Danh sách mẫu</Typography>
                                <Typography variant="caption" color="text.secondary">{loading ? 'Đang tải...' : `${samples.length} mẫu`}</Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            {samples.length === 0 && !loading && <Typography color="text.secondary">Chưa có mẫu nào.</Typography>}
                            <List>
                                {samples.map(s => (
                                    <Paper key={s.id} variant="outlined" sx={{ mb: 1, p: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box>
                                                <Typography sx={{ fontWeight: 600 }}>{s.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">{s.description}</Typography>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>{s.drugIds?.map(id => {
                                                    const d = drugs.find(x => x.id === id);
                                                    return <Chip key={id} label={d ? d.name : String(id)} size="small" />;
                                                })}</Box>
                                            </Box>
                                            <Box sx={{ flex: 1 }} />
                                            <Stack direction="row" spacing={1}>
                                                <Tooltip title="Xem">
                                                    <IconButton size="small" onClick={() => openDetail(s)} aria-label={`xem-${s.id}`}>
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Sửa">
                                                    <IconButton size="small" onClick={() => startEdit(s)} aria-label={`sua-${s.id}`}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                <Tooltip title="Xóa mẫu"><IconButton edge="end" aria-label="delete" onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton></Tooltip>
                                            </Stack>
                                        </Box>
                                    </Paper>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Dialog: add new drug */}
                <Dialog open={openAddDrug} onClose={() => setOpenAddDrug(false)} fullWidth maxWidth="sm">
                    <DialogTitle>Thêm thuốc mới</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField label="Tên thuốc (có thể nhập nhiều, ngăn cách bằng dấu phẩy hoặc xuống dòng)" value={newDrugName} onChange={e => setNewDrugName(e.target.value)} fullWidth multiline rows={2} />
                            <TextField label="Tag (ví dụ: OTC)" value={newDrugTag} onChange={e => setNewDrugTag(e.target.value)} fullWidth />
                            <TextField label="Mô tả" value={newDrugDesc} onChange={e => setNewDrugDesc(e.target.value)} fullWidth multiline rows={3} />
                            <TextField label="Giá" value={newDrugPrice === '' ? '' : String(newDrugPrice)} onChange={e => setNewDrugPrice(e.target.value === '' ? '' : Number(e.target.value))} fullWidth />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAddDrug(false)} disabled={addingDrug}>Hủy</Button>
                        <Button variant="contained" onClick={async () => {
                            if (!newDrugName.trim()) { showToast('Tên thuốc là bắt buộc', 'warning'); return; }
                            setAddingDrug(true);
                            try {
                                // split by newline or comma to support bulk add
                                const rawNames = newDrugName.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
                                const createdIds: number[] = [];
                                for (const nm of rawNames) {
                                    const payload: Partial<DrugItem> = { name: nm, tag: newDrugTag.trim() || undefined, description: newDrugDesc.trim() || undefined, price: typeof newDrugPrice === 'number' ? newDrugPrice : undefined };
                                    try {
                                        const res = await DrugAPI.createDrug(payload);
                                        if (res.success && res.data && res.data.id) createdIds.push(res.data.id);
                                    } catch (e) {
                                        console.error('createDrug failed for', nm, e);
                                    }
                                }
                                if (createdIds.length > 0) {
                                    await fetchDrugs();
                                    // add created ids to sampleLines (qty = 1), avoid duplicates
                                    setSampleLines(prev => {
                                        const prevIds = prev.map(p => p.id);
                                        const newLines = createdIds.filter(id => !prevIds.includes(id)).map(id => ({ id, qty: 1 }));
                                        return [...prev, ...newLines];
                                    });
                                    setOpenAddDrug(false);
                                    setNewDrugName(''); setNewDrugTag(''); setNewDrugDesc(''); setNewDrugPrice('');
                                } else {
                                    showToast('Không có thuốc nào được tạo (đã xảy ra lỗi)', 'error');
                                }
                            } finally {
                                setAddingDrug(false);
                            }
                        }} disabled={addingDrug}>Lưu thuốc</Button>
                    </DialogActions>
                </Dialog>

                {/* Delete confirmation dialog */}
                <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: undefined })}>
                    <DialogTitle>Xác nhận</DialogTitle>
                    <DialogContent>
                        <Typography>Bạn có chắc muốn xóa mẫu này không?</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteConfirm({ open: false, id: undefined })}>Hủy</Button>
                        <Button color="error" variant="contained" onClick={handleDeleteConfirmed}>Xóa</Button>
                    </DialogActions>
                </Dialog>

                {/* Toast container (react-toastify) */}
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
                {/* Detail dialog for a sample */}
                <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="md">
                    <DialogTitle>Chi tiết mẫu</DialogTitle>
                    <DialogContent>
                        {detailSample ? (
                            <Box>
                                <Typography variant="h6">{detailSample.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{detailSample.description}</Typography>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Sản phẩm</TableCell>
                                                <TableCell align="right">Đơn giá</TableCell>
                                                <TableCell align="center">Số lượng</TableCell>
                                                <TableCell align="right">Thành tiền</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(() => {
                                                type SampleLine = { drugId?: number; id?: number; quantity?: number; qty?: number };
                                                const lines: SampleLine[] = (detailSample as unknown as { lines?: SampleLine[] }).lines || (detailSample.drugIds || []).map((id: number) => ({ drugId: id, quantity: 1 }));
                                                return lines.map((ln: SampleLine, idx: number) => {
                                                    const id = ln.drugId ?? ln.id;
                                                    const qty = ln.quantity ?? ln.qty ?? 1;
                                                    const d = typeof id === 'number' ? drugs.find(x => x.id === id) : undefined;
                                                    const price = (typeof id === 'number' ? (prices[id] ?? d?.price) : undefined) || 0;
                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>{d ? d.name : String(id)}</TableCell>
                                                            <TableCell align="right">{price.toLocaleString('vi-VN')} đ</TableCell>
                                                            <TableCell align="center">{qty}</TableCell>
                                                            <TableCell align="right">{(price * qty).toLocaleString('vi-VN')} đ</TableCell>
                                                        </TableRow>
                                                    );
                                                });
                                            })()}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        ) : null}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDetail}>Đóng</Button>
                    </DialogActions>
                </Dialog>
            </CardContent>
        </div>
    );
};

export default PrescriptionSamplePage;
