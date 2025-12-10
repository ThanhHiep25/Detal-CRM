import { useEffect, useState, useRef } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TablePagination, TextField } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { SupplierAPI, Supplier } from '@/services/supplier';
import { toast, ToastContainer } from 'react-toastify';
import ExcelJS from 'exceljs';

export default function SupplierList() {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Supplier>>({ code: '', name: '' });
  const [selectedDetails, setSelectedDetails] = useState<Supplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Supplier | null>(null);
  // refs to manage pending optimistic deletes with undo
  const pendingDeletedRef = useRef<Record<number, Supplier>>({});
  const pendingTimersRef = useRef<Record<number, number>>({});
  const toastIdMapRef = useRef<Record<number, number>>({});
  // advanced UI state
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'name'|'code'|'id'>('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await SupplierAPI.getAll();
    if (res.success) setSuppliers(res.data || []);
    else toast.error(res.message || 'Lỗi khi tải nhà cung cấp');
    setLoading(false);
  };

  // True .xlsx export using ExcelJS for reliable styling
  const exportXlsx = async () => {
    try {
      const rows = filteredSorted;
      if (!rows.length) { toast.info('Không có dữ liệu để xuất'); return; }

      const headerCols = [
        { key: 'id', label: 'ID' },
        { key: 'code', label: 'Mã' },
        { key: 'name', label: 'Tên' },
        { key: 'phone', label: 'SĐT' },
        { key: 'representative', label: 'Người đại diện' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Địa chỉ' }
      ];

      const now = new Date();
      const exportedAt = now.toISOString().replace('T', ' ').slice(0, 19);
      const reportTitle = 'BÁO CÁO: DANH SÁCH NHÀ CUNG CẤP';

      const totalSuppliers = rows.length;
      const withPhone = rows.filter(r => (r.phone || '').toString().trim() !== '').length;
      const withEmail = rows.filter(r => (r.email || '').toString().trim() !== '').length;
      const withAddress = rows.filter(r => (r.address || '').toString().trim() !== '').length;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Suppliers');

      // Column definitions and widths
      sheet.columns = headerCols.map(h => ({ header: h.label, key: h.key, width: 25 }));

      // Title (merged across columns)
      const lastCol = headerCols.length;
      sheet.mergeCells(1, 1, 1, lastCol);
      const titleCell = sheet.getCell('A1');
      titleCell.value = reportTitle;
      titleCell.font = { name: 'Arial', size: 14, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Metadata: company, timestamp, filters, summary
      const companyName = 'NHAKHOA CRM';
      sheet.getCell('A2').value = 'Đơn vị';
      sheet.getCell('B2').value = companyName;
      sheet.getCell('A3').value = 'Thời gian xuất';
      sheet.getCell('B3').value = exportedAt;
      sheet.getCell('A4').value = 'Bộ lọc';
      sheet.getCell('B4').value = query || 'Tất cả';
      sheet.getCell('A5').value = 'Tổng số nhà cung cấp';
      sheet.getCell('B5').value = totalSuppliers;
      sheet.getCell('A6').value = 'Có SĐT';
      sheet.getCell('B6').value = withPhone;
      sheet.getCell('C6').value = 'Có Email';
      sheet.getCell('D6').value = withEmail;
      sheet.getCell('E6').value = 'Có địa chỉ';
      sheet.getCell('F6').value = withAddress;

      // Header row start at row 8 (leave a blank row between meta and table)
      const headerRowNumber = 8;
      const headerRow = sheet.getRow(headerRowNumber);
      headerCols.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h.label;
        cell.font = { bold: true, name: 'Arial', size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as ExcelJS.Fill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        } as Partial<ExcelJS.Borders>;
      });
      headerRow.height = 20;

      // Freeze header rows so header is always visible
      sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

      // Add data rows after header with alternating row shading and wrapped address
      let rowIndex = headerRowNumber + 1;
      rows.forEach((r, idx) => {
        const rec = r as unknown as Record<string, unknown>;
        const row = sheet.getRow(rowIndex);
        headerCols.forEach((h, ci) => {
          const val = rec[h.key] as string | number | null | undefined;
          const cell = row.getCell(ci + 1);
          cell.value = (val ?? '') as string | number;
          // wrap address column
          if (h.key === 'address') cell.alignment = { wrapText: true, vertical: 'top' } as Partial<ExcelJS.Alignment>;
        });
        // alternating fill for readability
        const isAlt = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
          if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } } as ExcelJS.Fill;
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as Partial<ExcelJS.Borders>;
        });
        row.commit();
        rowIndex++;
      });

      // Auto-filter on header
      sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber, column: lastCol }
      };

      // Write workbook to buffer and download
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suppliers-${(new Date()).toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file Excel');
    } catch (err) {
      console.error('exportXlsx error', err);
      toast.error('Lỗi khi xuất Excel. Vui lòng cài `exceljs` và thử lại.');
    }
  };

  const openCreate = () => { setForm({ code: '', name: '' }); setIsEditing(false); setDialogOpen(true); };
  const openEdit = (s: Supplier) => { setForm({ ...(s as Supplier) }); setIsEditing(true); setDialogOpen(true); };
  const closeCreate = () => { setDialogOpen(false); setIsEditing(false); setForm({ code: '', name: '' }); };

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Vui lòng nhập mã và tên'); return; }
    // basic validation: email and phone
    if (form.email && !/^\S+@\S+\.\S+$/.test(String(form.email))) { toast.error('Email không hợp lệ'); return; }
    if (form.phone && !/^[0-9()+\-\s]{6,20}$/.test(String(form.phone))) { toast.error('Số điện thoại không hợp lệ'); return; }
    if (isEditing && form.id) {
      setUpdating(true);
      const res = await SupplierAPI.update(form.id, form);
      setUpdating(false);
      if (res.success) {
        setSuppliers(prev => prev.map(p => (p.id === res.data?.id ? res.data as Supplier : p)));
        toast.success('Cập nhật thành công');
        closeCreate();
      } else {
        toast.error(res.message || 'Cập nhật thất bại');
      }
    } else {
      setCreating(true);
      const res = await SupplierAPI.create(form);
      setCreating(false);
      if (res.success) {
        setSuppliers(prev => [res.data as Supplier, ...prev]);
        toast.success('Tạo nhà cung cấp thành công');
        closeCreate();
      } else {
        toast.error(res.message || 'Tạo thất bại');
      }
    }
  };

  // derived lists: filter -> sort -> paginate
  const filteredSorted = (() => {
    const q = query.trim().toLowerCase();
    let arr = suppliers.slice();
    if (q) {
      arr = arr.filter(s => (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q));
    }
    arr.sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      const aa = String(aVal).toLowerCase();
      const bb = String(bVal).toLowerCase();
      if (aa < bb) return sortDir === 'asc' ? -1 : 1;
      if (aa > bb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  })();

  const paginated = filteredSorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (_: unknown, newPage: number) => { setPage(newPage); };
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(Number(e.target.value)); setPage(0); };

  const toggleSort = (field: 'name'|'code'|'id') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  // CSV export removed — only Excel export remains (exportXlsx)

  const openDeleteDialog = (s: Supplier) => {
    setDeleteCandidate(s);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteCandidate(null);
  };

  // Undo-capable delete: optimistic remove + schedule server delete with undo window
  

  const scheduleServerDelete = (id: number) => {
    const timer = window.setTimeout(() => {
      if (pendingDeletedRef.current[id]) {
        (async () => {
          try {
            const res = await SupplierAPI.delete(id);
            if (res.success) {
              toast.info('Xóa nhà cung cấp đã được thực hiện trên server');
            } else {
              if (pendingDeletedRef.current[id]) setSuppliers(prev => [pendingDeletedRef.current[id], ...prev]);
              toast.warn(res.message || 'Xóa trên server thất bại; đã phục hồi');
            }
          } catch (err) {
            console.error('Server delete failed', err);
            if (pendingDeletedRef.current[id]) setSuppliers(prev => [pendingDeletedRef.current[id], ...prev]);
            toast.error('Lỗi khi xóa trên server; đã phục hồi địa phương');
          } finally {
            delete pendingDeletedRef.current[id];
            if (pendingTimersRef.current[id]) { clearTimeout(pendingTimersRef.current[id]); delete pendingTimersRef.current[id]; }
            const tId = toastIdMapRef.current[id]; if (tId) { toast.dismiss(tId); delete toastIdMapRef.current[id]; }
          }
        })();
      }
    }, 8000);
    pendingTimersRef.current[id] = timer as unknown as number;
  };

  const undoDelete = (id: number) => {
    const timer = pendingTimersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete pendingTimersRef.current[id];
    }
    const deleted = pendingDeletedRef.current[id];
    if (deleted) {
      setSuppliers(prev => [deleted, ...prev]);
      delete pendingDeletedRef.current[id];
      const tId = toastIdMapRef.current[id];
      if (tId) { toast.dismiss(tId); delete toastIdMapRef.current[id]; }
      toast.success('Đã hoàn tác xóa');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate?.id) return;
    const id = deleteCandidate.id;
    // optimistic remove
    pendingDeletedRef.current[id] = deleteCandidate;
    setSuppliers(prev => prev.filter(s => s.id !== id));
    closeDeleteDialog();

    // show undo toast
    const tId = toast(({ closeToast }) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <span>Đã xóa nhà cung cấp</span>
        <Button variant="text" size="small" onClick={() => { undoDelete(id); closeToast?.(); }}>Hoàn tác</Button>
      </Box>
    ), {
      autoClose: 8000,
      closeOnClick: false,
      pauseOnHover: true,
      onClose: () => {
        if (pendingDeletedRef.current[id]) {
          scheduleServerDelete(id);
        }
      }
    });
    toastIdMapRef.current[id] = tId as unknown as number;
  };

  return (
    <div className="p-4 bg-white rounded-xl">
      <ToastContainer />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Danh sách nhà cung cấp</h2>
        <div className="flex items-center gap-2">
          <TextField size="small" placeholder="Tìm mã, tên, SĐT..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
          <Button variant="outlined" onClick={() => exportXlsx()}>Xuất Excel</Button>
          <Button variant="contained" onClick={openCreate}>Tạo nhà cung cấp</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><CircularProgress /></div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
                <TableCell onClick={() => toggleSort('code')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>Mã {sortBy === 'code' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</TableCell>
                <TableCell onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>Tên {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</TableCell>
                <TableCell> SĐT</TableCell>
                <TableCell>Người đại diện</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Địa chỉ</TableCell>
                <TableCell align="right">Hành động</TableCell>
              </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(s => (
              <TableRow key={s.id} hover onClick={() => setSelectedDetails(s)} style={{ cursor: 'pointer' }}>
                <TableCell onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>{s.code}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>{s.name}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>{s.phone}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>{s.representative}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>{s.email}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>{s.address}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" title="Sửa" onClick={(e) => { e.stopPropagation(); openEdit(s); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" title="Xóa" onClick={(e) => { e.stopPropagation(); openDeleteDialog(s); }}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TablePagination
        component="div"
        count={filteredSorted.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5,10,25,50]}
      />

      <Dialog open={dialogOpen} onClose={closeCreate} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Chỉnh sửa nhà cung cấp' : 'Tạo nhà cung cấp'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="normal" label="Mã" value={form.code || ''} onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value }))} />
          <TextField fullWidth margin="normal" label="Tên" value={form.name || ''} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} />
          <TextField fullWidth margin="normal" label="Số điện thoại" value={form.phone || ''} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} />
          <TextField fullWidth margin="normal" label="Người đại diện" value={form.representative || ''} onChange={(e) => setForm(prev => ({ ...prev, representative: e.target.value }))} />
          <TextField fullWidth margin="normal" label="Email" value={form.email || ''} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} />
          <TextField fullWidth margin="normal" label="Địa chỉ" value={form.address || ''} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreate}>Hủy</Button>
          <Button variant="contained" onClick={handleSave} disabled={creating || updating}>{(creating || updating) ? <CircularProgress size={18} /> : (isEditing ? 'Lưu' : 'Tạo')}</Button>
        </DialogActions>
      </Dialog>

      {/* Details dialog (read-only) */}
      <Dialog open={!!selectedDetails} onClose={() => setSelectedDetails(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi tiết nhà cung cấp</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="normal" label="Mã" value={selectedDetails?.code || ''} InputProps={{ readOnly: true }} />
          <TextField fullWidth margin="normal" label="Tên" value={selectedDetails?.name || ''} InputProps={{ readOnly: true }} />
          <TextField fullWidth margin="normal" label="Số điện thoại" value={selectedDetails?.phone || ''} InputProps={{ readOnly: true }} />
          <TextField fullWidth margin="normal" label="Người đại diện" value={selectedDetails?.representative || ''} InputProps={{ readOnly: true }} />
          <TextField fullWidth margin="normal" label="Email" value={selectedDetails?.email || ''} InputProps={{ readOnly: true }} />
          <TextField fullWidth margin="normal" label="Địa chỉ" value={selectedDetails?.address || ''} InputProps={{ readOnly: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDetails(null)}>Đóng</Button>
          <Button variant="contained" onClick={() => { if (selectedDetails) { openEdit(selectedDetails); setSelectedDetails(null); } }}>Chỉnh sửa</Button>
        </DialogActions>
      </Dialog>
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          Bạn có chắc muốn xóa nhà cung cấp "{deleteCandidate?.name}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Hủy</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>Xóa</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
