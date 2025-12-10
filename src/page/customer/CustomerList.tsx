import { useEffect, useState, useRef } from 'react';
import {
  Box, Card, CardContent, CardActions, Button, Grid, Typography, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Checkbox, FormControlLabel, FormControl, InputLabel, Select, MenuItem, IconButton,
  Avatar, InputAdornment, Tooltip, Chip, Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { grey } from '@mui/material/colors';
import { toast, ToastContainer } from 'react-toastify';
import { http } from '@/services/http';
import { UserAPI, ApiResponse, UserListItem, UserProfile } from '@/services/user';
import { getOccupations, getNationalities, getCustomerGroups } from '@/services/lookups';
import { BranchAPI } from '@/services/branches';
import { IdCardIcon, ListIcon } from 'lucide-react';
import { FaSync } from 'react-icons/fa';

export function CustomerList() {
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<UserListItem[]>([]);
  // pagination & search
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 25; // fixed page size (removed selector)

  // edit dialog
  const [editing, setEditing] = useState<{ open: boolean; user?: UserListItem | null }>({ open: false, user: null });
  const [form, setForm] = useState<Partial<UserProfile> & { fullName?: string }>({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<{ open: boolean; user?: UserListItem | null }>({ open: false, user: null });
  // lookups maps
  const [occupationsMap, setOccupationsMap] = useState<Record<number, string>>({});
  const [nationalitiesMap, setNationalitiesMap] = useState<Record<number, string>>({});
  const [customerGroupsMap, setCustomerGroupsMap] = useState<Record<number, string>>({});
  const [branchesMap, setBranchesMap] = useState<Record<number, string>>({});

  useEffect(() => {
    let mounted = true;

    async function loadCustomers() {
      setLoading(true);
      try {
        // fetch customers list from dedicated endpoint
        const res = await http.get<ApiResponse<UserListItem[]>>('/api/users/customers');
        const wrapped = res.data;
        if (!mounted) return;
        if (!wrapped || !wrapped.success) {
          toast.error(wrapped?.message || 'Không tải được danh sách khách hàng');
          setCustomers([]);
          setLoading(false);
          return;
        }

        const list = Array.isArray(wrapped.data) ? wrapped.data as UserListItem[] : [];

        // enrich items that don't have profile by calling getProfile
        const enriched = await Promise.all(list.map(async (u) => {
          if (u.profile) return u;
          try {
            const pRes = await UserAPI.getProfile(u.id) as ApiResponse<UserProfile | null>;
            if (pRes && pRes.success && pRes.data) {
              return { ...u, profile: pRes.data } as UserListItem;
            }
          } catch (err) {
            // ignore and return original
            console.warn('Failed to enrich profile', err);
          }
          return u;
        }));

        if (mounted) setCustomers(enriched);
      } catch (err) {
        console.error('Load customers failed', err);
        toast.error((err as Error)?.message || 'Lỗi khi tải danh sách khách hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // initial load
    loadCustomers();

    // load lookups in parallel
    (async () => {
      try {
        const [occs, nats, groups] = await Promise.all([getOccupations(), getNationalities(), getCustomerGroups()]);
        if (!mounted) return;
        const occMap: Record<number, string> = {};
        occs.forEach(o => { occMap[o.id] = o.name; });
        setOccupationsMap(occMap);

        const natMap: Record<number, string> = {};
        nats.forEach(n => { natMap[n.id] = n.name; });
        setNationalitiesMap(natMap);

        const grpMap: Record<number, string> = {};
        groups.forEach(g => { grpMap[g.id] = g.name; });
        setCustomerGroupsMap(grpMap);
      } catch (err) {
        console.warn('Failed to load lookups', err);
      }

      // load branches (separately since BranchAPI returns wrapped response)
      try {
        const bRes = await BranchAPI.getBranches();
        if (!mounted) return;
        if (bRes && bRes.success && Array.isArray(bRes.data)) {
          const bMap: Record<number, string> = {};
          bRes.data.forEach(b => { bMap[b.id] = b.name; });
          setBranchesMap(bMap);
        }
      } catch (err) {
        console.warn('Failed to load branches', err);
      }
    })();

    // expose refresh on window for debug (optional) - not necessary; keep local only
    return () => { mounted = false; };
  }, []);

  // client-side filtering / paging
  const filteredCustomers = customers.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = (u.fullName || u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const phone = (u.profile?.phone || '').toLowerCase();
    return name.includes(s) || email.includes(s) || phone.includes(s);
  });

  const total = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ensure current page is valid if filters/pageSize change
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const pagedCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);


  // Helper to refresh the list (re-fetch)
  async function refreshCustomers() {
    setPage(1);
    setLoading(true);
    try {
      const res = await http.get<ApiResponse<UserListItem[]>>('/api/users/customers');
      const wrapped = res.data;
      if (!wrapped || !wrapped.success) {
        toast.error(wrapped?.message || 'Không tải được danh sách khách hàng');
        setCustomers([]);
        return;
      }
      const list = Array.isArray(wrapped.data) ? wrapped.data as UserListItem[] : [];
      const enriched = await Promise.all(list.map(async (u) => {
        if (u.profile) return u;
        try {
          const pRes = await UserAPI.getProfile(u.id) as ApiResponse<UserProfile | null>;
          if (pRes && pRes.success && pRes.data) {
            return { ...u, profile: pRes.data } as UserListItem;
          }
        } catch (err) {
          console.warn('Failed to enrich profile', err);
        }
        return u;
      }));
      setCustomers(enriched);
    } catch (err) {
      console.error('Refresh customers failed', err);
      toast.error((err as Error)?.message || 'Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }

  // Delete customer by id
  // Confirm / delete with undo support
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserListItem | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [pendingBulkIds, setPendingBulkIds] = useState<number[]>([]);
  // selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const allOnPageSelected = pagedCustomers.length > 0 && pagedCustomers.every(c => selectedIds.includes(c.id));
  const someOnPageSelected = pagedCustomers.some(c => selectedIds.includes(c.id));
  // refs to manage scheduled deletes (so we can cancel on undo)
  const pendingDeleteTimersRef = useRef<Record<number, number>>({});
  const pendingDeletedUsersRef = useRef<Record<number, UserListItem>>({});

  // cleanup any pending delete timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingDeleteTimersRef.current).forEach(tid => clearTimeout(tid));
      pendingDeleteTimersRef.current = {};
      pendingDeletedUsersRef.current = {};
    };
  }, []);

  function promptDelete(u: UserListItem) {
    setPendingDeleteUser(u);
    setConfirmOpen(true);
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function selectAllOnPage() {
    const pageIds = pagedCustomers.map(c => c.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      // unselect all on this page
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      // add missing ids
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function performDelete(id: number) {
    setLoading(true);
    try {
      const res = await http.delete<ApiResponse<null>>(`/api/users/${id}`);
      const wrapped = res.data;
      if (wrapped && wrapped.success) {
        return { success: true } as ApiResponse<null>;
      }
      return { success: false, message: wrapped?.message || 'Xóa thất bại', data: null } as ApiResponse<null>;
    } catch (err) {
      console.error('Delete customer failed', err);
      return { success: false, message: (err as Error)?.message || 'Lỗi khi xóa khách hàng', data: null } as ApiResponse<null>;
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteUser) {
      setConfirmOpen(false);
      return;
    }
    const u = pendingDeleteUser;
    setConfirmOpen(false);
    setPendingDeleteUser(null);
    // schedule actual server delete after undo window (8s)
    // remove from UI immediately
    setCustomers(prev => prev.filter(x => x.id !== u.id));
    pendingDeletedUsersRef.current[u.id] = u;

    const timeoutMs = 8000;
    const timeoutId = window.setTimeout(async () => {
      // perform server delete now
      delete pendingDeleteTimersRef.current[u.id];
      const delRes = await performDelete(u.id);
      // cleanup stored user
      const stored = pendingDeletedUsersRef.current[u.id];
      delete pendingDeletedUsersRef.current[u.id];
      if (delRes && delRes.success) {
        toast.success('Xóa khách hàng thành công');
      } else {
        // if delete failed, restore user to UI
        if (stored) setCustomers(prev => [stored, ...prev]);
        toast.error(delRes?.message || 'Xóa khách hàng thất bại');
      }
    }, timeoutMs) as unknown as number;

    pendingDeleteTimersRef.current[u.id] = timeoutId;

    // show undo toast — clicking Undo cancels timeout and restores user locally
    const toastId = toast(
      () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>Xóa khách hàng</span>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              // cancel scheduled delete
              const t = pendingDeleteTimersRef.current[u.id];
              if (t) {
                clearTimeout(t);
                delete pendingDeleteTimersRef.current[u.id];
              }
              const stored = pendingDeletedUsersRef.current[u.id];
              if (stored) {
                setCustomers(prev => [stored, ...prev]);
                delete pendingDeletedUsersRef.current[u.id];
                toast.info('Hoàn tác xóa thành công');
              }
              toast.dismiss(toastId);
            }}
          >
            Hoàn tác
          </Button>
        </Box>
      ),
      { autoClose: timeoutMs }
    );
  }

  // Export CSV (either all filtered or only selected)
  function exportCsv(onlySelected = false) {
    const rows = (onlySelected ? customers.filter(c => selectedIds.includes(c.id)) : filteredCustomers).map(u => ({
      id: u.id,
      fullName: u.fullName ?? u.username ?? '',
      email: u.email ?? '',
      phone: u.profile?.phone ?? '',
      branch: u.profile?.branchId != null ? (branchesMap[u.profile!.branchId] ?? String(u.profile!.branchId)) : '',
      createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : ''
    }));

    const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${onlySelected ? 'selected' : 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Toggle enabled state for selected users
  async function toggleEnableSelected(enable: boolean) {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const promises = selectedIds.map(id => http.put(`/api/users/${id}`, { enabled: enable }));
      await Promise.all(promises);
      setCustomers(prev => prev.map(u => selectedIds.includes(u.id) ? { ...u, enabled: enable } : u));
      toast.success(`Cập nhật trạng thái ${enable ? 'bật' : 'tắt'} cho ${selectedIds.length} khách hàng`);
      clearSelection();
    } catch (err) {
      console.error('Toggle enable failed', err);
      toast.error((err as Error)?.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  }

  // Confirm bulk delete
  async function confirmBulkDelete() {
    if (!pendingBulkIds || pendingBulkIds.length === 0) {
      setConfirmBulkOpen(false);
      return;
    }
    const ids = pendingBulkIds.slice();
    setConfirmBulkOpen(false);
    setPendingBulkIds([]);
    // remove from UI immediately and schedule deletes
    const toDeleteUsers = customers.filter(u => ids.includes(u.id));
    setCustomers(prev => prev.filter(u => !ids.includes(u.id)));
    toDeleteUsers.forEach(u => { pendingDeletedUsersRef.current[u.id] = u; });

    const timeoutMs = 8000;
    // schedule deletes per id
    ids.forEach(id => {
      const tid = window.setTimeout(async () => {
        delete pendingDeleteTimersRef.current[id];
        const delRes = await performDelete(id);
        const stored = pendingDeletedUsersRef.current[id];
        delete pendingDeletedUsersRef.current[id];
        if (!delRes.success && stored) {
          setCustomers(prev => [stored, ...prev]);
          toast.error(delRes?.message || `Xóa khách hàng ${id} thất bại`);
        }
      }, timeoutMs) as unknown as number;
      pendingDeleteTimersRef.current[id] = tid;
    });

    const toastId = toast(
      () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>Xóa {ids.length} khách hàng</span>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              // cancel all scheduled deletes
              ids.forEach(id => {
                const t = pendingDeleteTimersRef.current[id];
                if (t) { clearTimeout(t); delete pendingDeleteTimersRef.current[id]; }
                const stored = pendingDeletedUsersRef.current[id];
                if (stored) { setCustomers(prev => [stored, ...prev]); delete pendingDeletedUsersRef.current[id]; }
              });
              toast.info('Hoàn tác xóa thành công');
              toast.dismiss(toastId);
            }}
          >
            Hoàn tác
          </Button>
        </Box>
      ),
      { autoClose: timeoutMs }
    );
    clearSelection();
  }

  function openEdit(u: UserListItem) {
    setEditing({ open: true, user: u });
    setForm({ ...(u.profile || {}), id: u.profile?.id, userId: u.id, phone: u.profile?.phone ?? '', birthDate: u.profile?.birthDate ?? '', gender: u.profile?.gender ?? '', address: u.profile?.address ?? '', emergencyContact: u.profile?.emergencyContact ?? '', province: u.profile?.province ?? '', district: u.profile?.district ?? '', ward: u.profile?.ward ?? '', sourceDetail: u.profile?.sourceDetail ?? '', isReturning: u.profile?.isReturning ?? false, fullName: u.fullName ?? '' });
  }

  async function saveProfile() {
    if (!editing.user) return;
    setSaving(true);
    try {
      // Prepare profile payload (strip UI-only fields)
      const profilePayload = { ...(form as Partial<UserProfile>) } as Partial<UserProfile> & Record<string, unknown>;
      if ((profilePayload as Record<string, unknown>)['fullName'] != null) delete (profilePayload as Record<string, unknown>)['fullName'];

      // If fullName changed, also update the user record
      const needsUserUpdate = Boolean(form.fullName && form.fullName !== editing.user.fullName);
      if (needsUserUpdate) {
        try {
          const userPayload = { ...((editing.user as unknown) as Record<string, unknown>), fullName: form.fullName } as Record<string, unknown>;
          await http.put(`/api/users/${editing.user.id}`, userPayload);
        } catch (uErr) {
          console.warn('Failed to update user fullName', uErr);
          // don't block profile update; show toast later if profile update fails
        }
      }

      const res = await UserAPI.updateProfile(profilePayload as Partial<UserProfile>);
      if (res && res.success) {
        toast.success('Cập nhật profile thành công');
        // refresh list: update the single user in state
        setCustomers(prev => prev.map(u => u.id === (editing.user!.id) ? { ...u, profile: res.data as UserProfile, fullName: form.fullName ?? u.fullName } : u));
        setEditing({ open: false, user: null });
      } else {
        toast.error(res?.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      toast.error((err as Error)?.message || 'Lỗi khi cập nhật profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box className="p-4 bg-white rounded-xl">
      <ToastContainer />
      {/* Header Section */}
      <div className="bg-gradient-to-r mb-5 from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-2xl shadow-lg p-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản lý</p>
            <Typography variant="h5" fontWeight="bold" className="text-white">Danh sách khách hàng</Typography>
            <p className="text-sm opacity-90 mt-1">Tổng: <strong>{total}</strong> khách hàng</p>
          </div>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" color="text.secondary" sx={{ flexGrow: 1, fontWeight: 'bold' }}>Tổng: {total}</Typography>
            <Tooltip title="Xuất CSV">
              <button className="px-3 py-2 bg-green-500 text-white rounded-xl flex items-center gap-2"
                onClick={() => exportCsv()}>Xuất CSV</button>
            </Tooltip>
            <Tooltip title="Làm mới">
              <button className="px-3 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2"
                onClick={refreshCustomers}>
                <FaSync /> Tải lại
              </button>
            </Tooltip>
          </Box>
        </div>
      </div>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="table"><ListIcon fontSize="small" className='w-4 h-4 mr-1' />Bảng</ToggleButton>
            <ToggleButton value="cards"><IdCardIcon fontSize="small" className='w-4 h-4 mr-1' />Thẻ</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            size="small"
            placeholder="Tìm tên, email hoặc số điện thoại"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ width: 320 }}
          />
        </Box>
      </Box>

      {/* bulk actions */}
      {selectedIds.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <Typography variant="body2">Đã chọn: {selectedIds.length}</Typography>
          <Button color="error" variant="contained" size="small" onClick={() => { setPendingBulkIds(selectedIds); setConfirmBulkOpen(true); }}>Xóa đã chọn</Button>
          <Button variant="outlined" size="small" onClick={() => exportCsv(true)}>Xuất đã chọn</Button>
          <Button variant="outlined" size="small" onClick={() => toggleEnableSelected(true)}>Bật</Button>
          <Button variant="outlined" size="small" onClick={() => toggleEnableSelected(false)}>Tắt</Button>
          <Button size="small" onClick={clearSelection}>Bỏ chọn</Button>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        view === 'table' ? (
          <TableContainer component={Paper} sx={{ border: `1px solid ${grey[200]}` }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={allOnPageSelected} indeterminate={someOnPageSelected && !allOnPageSelected} onChange={selectAllOnPage} />
                  </TableCell>
                  <TableCell>Họ & tên</TableCell>
                  <TableCell>SĐT</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Chi nhánh</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell align="right">Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedCustomers.map(u => (
                  <TableRow key={u.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#1976d2', width: 36, height: 36 }}>{(u.fullName || u.username || '-').charAt(0)}</Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{u.fullName || u.username || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">{u.profile?.address ?? ''}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{u.profile?.phone ?? '-'}</TableCell>
                    <TableCell>{u.email ?? '-'}</TableCell>
                    <TableCell>{(u.profile?.branchId != null) ? (branchesMap[u.profile!.branchId] ?? u.profile!.branchId) : '-'}</TableCell>
                    <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Xem">
                        <IconButton size="small" onClick={() => setViewing({ open: true, user: u })}><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Sửa">
                        <IconButton size="small" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa">
                        <IconButton size="small" onClick={() => promptDelete(u)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Grid container spacing={2}>
            {pagedCustomers.map(u => (
              <Grid item xs={12} sm={6} md={4} key={u.id}>
                <Card sx={{ border: `1px solid ${grey[200]}`, minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Checkbox size="small" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                      <Avatar sx={{ bgcolor: '#1976d2' }}>{(u.fullName || u.username || '-').charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{u.fullName || u.username}</Typography>
                        <Typography variant="caption" color="text.secondary">{u.profile?.phone ?? ''} • {(u.profile?.branchId != null) ? (branchesMap[u.profile!.branchId] ?? u.profile!.branchId) : ''}</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" noWrap>{u.email}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{u.profile?.address}</Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="Xem"><IconButton size="small" onClick={() => setViewing({ open: true, user: u })}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Sửa"><IconButton size="small" onClick={() => openEdit(u)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Xóa"><IconButton size="small" onClick={() => promptDelete(u)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      )}

      {/* Pagination controls */}
      {!loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <IconButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} size="small">
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Button variant="outlined" size="small" disabled sx={{ mx: 1 }}>{`Trang ${page} / ${totalPages}`}</Button>
          <IconButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} size="small">
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Dialog open={editing.open} onClose={() => setEditing({ open: false, user: null })} fullWidth maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48 }}>{(editing.user?.fullName || editing.user?.username || '-').charAt(0)}</Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Chỉnh sửa thông tin khách</Typography>
              <Typography variant="body2" color="text.secondary">{editing.user?.email ?? ''}</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <TextField fullWidth size="small" label="Họ và tên" value={form.fullName ?? editing.user?.fullName ?? ''} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
                <TextField fullWidth size="small" label="Số điện thoại" value={form.phone ?? editing.user?.profile?.phone ?? ''} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                <TextField fullWidth size="small" label="Email" value={editing.user?.email ?? ''} disabled />
                <TextField fullWidth size="small" type="date" label="Ngày sinh" InputLabelProps={{ shrink: true }} value={form.birthDate ?? ''} onChange={(e) => setForm(f => ({ ...f, birthDate: e.target.value }))} />

                <FormControl fullWidth size="small">
                  <InputLabel shrink>Giới tính</InputLabel>
                  <Select value={form.gender ?? ''} onChange={(e) => setForm(f => ({ ...f, gender: e.target.value as string }))} displayEmpty>
                    <MenuItem value="">Chọn</MenuItem>
                    <MenuItem value="male">Nam</MenuItem>
                    <MenuItem value="female">Nữ</MenuItem>
                    <MenuItem value="other">Khác</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel shrink>Chi nhánh</InputLabel>
                  <Select value={form.branchId ?? editing.user?.profile?.branchId ?? ''} onChange={(e) => setForm(f => ({ ...f, branchId: e.target.value === '' ? undefined : Number(e.target.value) }))} displayEmpty>
                    <MenuItem value="">Không chọn</MenuItem>
                    {Object.entries(branchesMap).map(([id, name]) => (
                      <MenuItem key={id} value={Number(id)}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel shrink>Nhóm khách</InputLabel>
                  <Select
                    multiple
                    value={form.customerGroupIds ?? editing.user?.profile?.customerGroupIds ?? []}
                    onChange={(e) => {
                      const vals = Array.isArray(e.target.value) ? (e.target.value as (string | number)[]) : [];
                      setForm(f => ({ ...f, customerGroupIds: vals.map(v => Number(v)) }));
                    }}
                    renderValue={(selected) => (Array.isArray(selected) ? selected.map(s => customerGroupsMap[Number(s)] ?? String(s)).join(', ') : '')}
                    size="small"
                  >
                    {Object.entries(customerGroupsMap).map(([id, name]) => (
                      <MenuItem key={id} value={Number(id)}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <TextField fullWidth multiline minRows={2} size="small" label="Địa chỉ" value={form.address ?? ''} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                <TextField fullWidth size="small" label="Người liên hệ khẩn cấp" value={form.emergencyContact ?? ''} onChange={(e) => setForm(f => ({ ...f, emergencyContact: e.target.value }))} />
                <TextField fullWidth size="small" label="Tỉnh/Thành phố" value={form.province ?? ''} onChange={(e) => setForm(f => ({ ...f, province: e.target.value }))} />
                <TextField fullWidth size="small" label="Quận/Huyện" value={form.district ?? ''} onChange={(e) => setForm(f => ({ ...f, district: e.target.value }))} />
                <TextField fullWidth size="small" label="Phường/Xã" value={form.ward ?? ''} onChange={(e) => setForm(f => ({ ...f, ward: e.target.value }))} />

                <FormControl fullWidth size="small">
                  <InputLabel shrink>Quốc tịch</InputLabel>
                  <Select value={form.nationalityId ?? editing.user?.profile?.nationalityId ?? ''} onChange={(e) => setForm(f => ({ ...f, nationalityId: e.target.value === '' ? undefined : Number(e.target.value) }))} displayEmpty>
                    <MenuItem value="">Không chọn</MenuItem>
                    {Object.entries(nationalitiesMap).map(([id, name]) => (
                      <MenuItem key={id} value={Number(id)}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel shrink>Nghề nghiệp</InputLabel>
                  <Select value={form.occupationId ?? editing.user?.profile?.occupationId ?? ''} onChange={(e) => setForm(f => ({ ...f, occupationId: e.target.value === '' ? undefined : Number(e.target.value) }))} displayEmpty>
                    <MenuItem value="">Không chọn</MenuItem>
                    {Object.entries(occupationsMap).map(([id, name]) => (
                      <MenuItem key={id} value={Number(id)}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField fullWidth size="small" label="Chi tiết nguồn (sourceDetail)" value={form.sourceDetail ?? ''} onChange={(e) => setForm(f => ({ ...f, sourceDetail: e.target.value }))} />

                <FormControlLabel control={<Checkbox checked={Boolean(form.isReturning)} onChange={(e) => setForm(f => ({ ...f, isReturning: e.target.checked }))} />} label="Khách cũ / Quay lại" />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing({ open: false, user: null })}>Hủy</Button>
          <Button variant="contained" onClick={saveProfile} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm bulk delete dialog */}
      <Dialog open={confirmBulkOpen} onClose={() => { setConfirmBulkOpen(false); setPendingBulkIds([]); }}>
        <DialogTitle>Xác nhận xóa nhiều</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa <strong>{pendingBulkIds.length}</strong> khách hàng đã chọn?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmBulkOpen(false); setPendingBulkIds([]); }}>Hủy</Button>
          <Button color="error" variant="contained" onClick={confirmBulkDelete}>Xóa</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={confirmOpen} onClose={() => { setConfirmOpen(false); setPendingDeleteUser(null); }}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa khách hàng <strong>{pendingDeleteUser?.fullName ?? pendingDeleteUser?.username}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmOpen(false); setPendingDeleteUser(null); }}>Hủy</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Xóa</Button>
        </DialogActions>
      </Dialog>

      {/* View details dialog (read-only) */}
      <Dialog open={viewing.open} onClose={() => setViewing({ open: false, user: null })} fullWidth maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>{(viewing.user?.fullName || viewing.user?.username || '-').charAt(0)}</Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{viewing.user?.fullName ?? viewing.user?.username ?? '-'}</Typography>
              <Typography variant="body2" color="text.secondary">{viewing.user?.email ?? '-'}</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Stack spacing={1}>
                <Typography variant="body2"><strong>Số điện thoại:</strong> {viewing.user?.profile?.phone ?? '-'}</Typography>
                <Typography variant="body2"><strong>Ngày sinh:</strong> {viewing.user?.profile?.birthDate ?? '-'}</Typography>
                <Typography variant="body2"><strong>Giới tính:</strong> {viewing.user?.profile?.gender ?? '-'}</Typography>
                <Box>
                  <Typography variant="body2"><strong>Địa chỉ:</strong></Typography>
                  <Typography variant="body2" color="text.secondary">{viewing.user?.profile?.address ?? '-'}</Typography>
                </Box>
                <Typography variant="body2"><strong>Người liên hệ khẩn cấp:</strong> {viewing.user?.profile?.emergencyContact ?? '-'}</Typography>
                <Typography variant="body2"><strong>Tỉnh/Thành phố:</strong> {viewing.user?.profile?.province ?? '-'}</Typography>
                <Typography variant="body2"><strong>Quận/Huyện:</strong> {viewing.user?.profile?.district ?? '-'}</Typography>
                <Typography variant="body2"><strong>Phường/Xã:</strong> {viewing.user?.profile?.ward ?? '-'}</Typography>
                <Typography variant="body2"><strong>Nguồn:</strong> {viewing.user?.profile?.sourceDetail ?? '-'}</Typography>
                <Typography variant="body2"><strong>Khách cũ:</strong> {viewing.user?.profile?.isReturning ? 'Có' : 'Không'}</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="body2"><strong>Nhóm khách:</strong></Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {Array.isArray(viewing.user?.profile?.customerGroupIds) && viewing.user!.profile!.customerGroupIds.length > 0 ? (
                      viewing.user!.profile!.customerGroupIds.map(id => (
                        <Chip key={id} label={customerGroupsMap[id] ?? String(id)} size="small" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </Stack>
                </Box>

                <Typography variant="body2"><strong>Chi nhánh:</strong> {(viewing.user?.profile?.branchId != null) ? (branchesMap[viewing.user!.profile!.branchId] ?? viewing.user!.profile!.branchId) : '-'}</Typography>
                <Typography variant="body2"><strong>Quốc tịch:</strong> {(viewing.user?.profile?.nationalityId != null) ? (nationalitiesMap[viewing.user!.profile!.nationalityId] ?? viewing.user!.profile!.nationalityId) : '-'}</Typography>
                <Typography variant="body2"><strong>Nghề nghiệp:</strong> {(viewing.user?.profile?.occupationId != null) ? (occupationsMap[viewing.user!.profile!.occupationId] ?? viewing.user!.profile!.occupationId) : '-'}</Typography>
                <Typography variant="body2"><strong>Ngày tạo:</strong> {viewing.user?.createdAt ? new Date(viewing.user.createdAt).toLocaleString() : '-'}</Typography>
                <Typography variant="body2"><strong>Cập nhật:</strong> {viewing.user?.updatedAt ? new Date(viewing.user.updatedAt).toLocaleString() : '-'}</Typography>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewing({ open: false, user: null })}>Đóng</Button>
          <Button variant="outlined" onClick={() => { setViewing({ open: false, user: null }); setEditing({ open: true, user: viewing.user ?? null }); }}>Sửa</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CustomerList;
