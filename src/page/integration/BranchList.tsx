import  { useEffect, useState } from 'react';
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
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { BranchAPI, Branch, BranchStatus } from '../../services/branches';

export default function BranchListPage() {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<Partial<Branch> | null>(null);
	const [filterText, setFilterText] = useState('');
	const [filterStatus, setFilterStatus] = useState<'ALL' | string>('ALL');
	const [selectionModel, setSelectionModel] = useState<number[]>([]);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmIds, setConfirmIds] = useState<number[]>([]);
	const [confirmLoading, setConfirmLoading] = useState(false);

	const load = async () => {
		setLoading(true);
		try {
			const res = await BranchAPI.getBranches();
			if (res && res.success) setBranches(res.data || []);
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
		setEditing({ name: '', code: '', address: '', status: BranchStatus.ACTIVE });
		setOpen(true);
	};

	const openEdit = (b: Branch) => {
		setEditing({ ...b });
		setOpen(true);
	};

	const close = () => {
		setOpen(false);
		setEditing(null);
	};

	const save = async () => {
		if (!editing) return;
		if (!editing.name || editing.name.trim().length === 0) {
			toast.error('Vui lòng nhập tên chi nhánh');
			return;
		}
		try {
			if (editing.id) {
				const res = await BranchAPI.updateBranch(editing.id, editing as Partial<Branch>);
				if (res && res.success) {
					toast.success('Cập nhật thành công');
					await load();
					close();
				} else toast.error(res.message || 'Cập nhật thất bại');
			} else {
				const payload = { ...editing } as Partial<Branch>;
				const res = await BranchAPI.createBranch(payload);
				if (res && res.success) {
					toast.success('Tạo chi nhánh thành công');
					await load();
					close();
				} else toast.error(res.message || 'Tạo thất bại');
			}
		} catch {
			toast.error('Lỗi khi lưu');
		}
	};

	const openDeleteConfirm = (ids: number[]) => {
		setConfirmIds(ids);
		setConfirmOpen(true);
	};

	const doDelete = async (id?: number) => {
		if (!id) return openDeleteConfirm([]);
		openDeleteConfirm([id]);
	};

	const handleConfirmDelete = async () => {
		const idsToDelete = confirmIds.length > 0 ? confirmIds : selectionModel;
		if (idsToDelete.length === 0) {
			setConfirmOpen(false);
			return;
		}
		setConfirmLoading(true);
		try {
			for (const id of idsToDelete) {
				const res = await BranchAPI.deleteBranch(id);
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

	const toggleStatus = async (b: Branch) => {
		const next = b.status === BranchStatus.ACTIVE ? BranchStatus.INACTIVE : BranchStatus.ACTIVE;
		const res = await BranchAPI.updateBranchStatus(b.id, next);
		if (res && res.success) await load();
		else toast.error(res.message || 'Cập nhật trạng thái thất bại');
	};

	const exportCsv = () => {
		const visible = branches.filter(b => {
			const t = filterText.trim().toLowerCase();
			if (t) {
				if (!b.name?.toLowerCase().includes(t) && !(b.code || '').toLowerCase().includes(t)) return false;
			}
			if (filterStatus !== 'ALL' && String(b.status || '').toUpperCase() !== String(filterStatus).toUpperCase()) return false;
			return true;
		});
		const rows = selectionModel.length > 0 ? visible.filter(v => selectionModel.includes(v.id)) : visible;
		if (!rows || rows.length === 0) {
			toast.info('Không có dữ liệu để xuất');
			return;
		}
		const header = ['id', 'code', 'name', 'address', 'status'];
		const lines = [header.join(',')];
		for (const r of rows) {
			const line = [r.id, `"${(r.code || '').replace(/"/g, '""')}"`, `"${(r.name || '').replace(/"/g, '""')}"`, `"${(r.address || '').replace(/"/g, '""')}"`, r.status ?? ''].join(',');
			lines.push(line);
		}
		const csv = lines.join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `branches-${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="p-4 bg-white rounded-xl ">
			<div className="bg-gradient-to-r mb-5 from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản lý</p>
						<Typography variant="h5" fontWeight="bold" className="text-white">Danh sách chi nhánh</Typography>
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
						</Select>
					</FormControl>
					<Button variant="outlined" onClick={() => { exportCsv(); }}>Xuất CSV</Button>
					<Button color="error" variant="outlined" disabled={selectionModel.length === 0} onClick={() => openDeleteConfirm(selectionModel)}>Xóa đã chọn</Button>
				</Stack>
				<Box sx={{ height: 520, width: '100%' }}>
					<DataGrid
						rows={branches.filter(b => {
							const t = filterText.trim().toLowerCase();
							if (t) {
								if (!b.name?.toLowerCase().includes(t) && !(b.code || '').toLowerCase().includes(t)) return false;
							}
							if (filterStatus !== 'ALL' && String(b.status || '').toUpperCase() !== String(filterStatus).toUpperCase()) return false;
							return true;
						})}
						columns={[
							{ field: 'name', headerName: 'Tên', flex: 1 } as GridColDef,
							{ field: 'code', headerName: 'Mã', width: 140 } as GridColDef,
							{ field: 'address', headerName: 'Địa chỉ', width: 260 } as GridColDef,
							{ field: 'status', headerName: 'Trạng thái', width: 140, renderCell: (params: GridRenderCellParams) => {
								const v = String(params.value || '').toUpperCase();
								type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
								const color: ChipColor = v === 'ACTIVE' ? 'success' : v === 'INACTIVE' ? 'default' : 'primary';
								return <Chip label={v} color={color} size="small" />;
							}} as GridColDef,
							{ field: 'actions', headerName: 'Hành động', width: 160, sortable: false, filterable: false, renderCell: (params: GridRenderCellParams) => {
								const row = params.row as Branch;
								return (
									<>
										<IconButton size="small" onClick={() => openEdit(row)}><EditIcon /></IconButton>
										<IconButton size="small" color="error" onClick={() => doDelete(row.id)}><DeleteIcon /></IconButton>
										<Button size="small" onClick={() => toggleStatus(row)}>
											{row.status === BranchStatus.ACTIVE ? 'Set Inactive' : 'Set Active'}
										</Button>
									</>
								);
							}} as GridColDef
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

			<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
				<DialogTitle>Xác nhận xóa</DialogTitle>
				<DialogContent>
					<Typography>Bạn có chắc muốn xóa {confirmIds.length > 0 ? confirmIds.length : selectionModel.length} chi nhánh?</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
					<Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={confirmLoading}>{confirmLoading ? 'Đang xóa...' : 'Xóa'}</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
				<DialogTitle>{editing?.id ? 'Chỉnh sửa chi nhánh' : 'Tạo chi nhánh'}</DialogTitle>
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
								<TextField fullWidth label="Địa chỉ" value={editing?.address || ''} onChange={(e) => setEditing(s => ({ ...(s || {}), address: e.target.value }))} />
							</Grid>
							<Grid item xs={12}>
								<TextField fullWidth label="Mô tả" value={editing?.description || ''} onChange={(e) => setEditing(s => ({ ...(s || {}), description: e.target.value }))} multiline rows={3} />
							</Grid>
							<Grid item xs={12} sm={6}>
								<FormControl fullWidth>
									<InputLabel id="status-label">Trạng thái</InputLabel>
									<Select labelId="status-label" label="Trạng thái" value={editing?.status || BranchStatus.ACTIVE} onChange={(e) => setEditing(s => ({ ...(s || {}), status: e.target.value as BranchStatus }))}>
										<MenuItem value={BranchStatus.ACTIVE}>ACTIVE</MenuItem>
										<MenuItem value={BranchStatus.INACTIVE}>INACTIVE</MenuItem>
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

