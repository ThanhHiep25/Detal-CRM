import { Box, Button, TextField, InputAdornment, Tooltip } from "@mui/material";
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton } from "@mui/material";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { ServiceAPI, type ServiceItem } from "../../services/service";
import { ServiceModal } from "./ServiceModal";

const nfVND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

// columns will be defined inside component to access handlers

interface ServiceDataTableProps {
  onAddService: () => void;
  reloadKey?: number;
  /** optional category filter id (string). when provided and not 'all', rows will be filtered by category */
  categoryFilter?: string;
  isAdmin?: boolean;
}

export function ServiceDataTable({ onAddService, reloadKey, categoryFilter, isAdmin = false }: ServiceDataTableProps) {
  const [rows, setRows] = React.useState<ServiceItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [search, setSearch] = React.useState<string>("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceItem | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    ServiceAPI.getServices()
      .then(res => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) {
          setRows(res.data);
        } else {
          setRows([]);
          // optional: toast here if desired
        }
      })
      .catch(() => {
        if (mounted) setRows([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [reloadKey]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let temp = rows;
    // apply category filter if provided and not 'all'
    if (categoryFilter && categoryFilter !== 'all') {
      temp = temp.filter(r => {
        // support several possible shapes without using `any`
        const rowObj = r as unknown as Record<string, unknown>;
        let cat: unknown = null;
        if ('categoryId' in rowObj) cat = rowObj['categoryId'];
        else if (rowObj['category'] && typeof rowObj['category'] === 'object') {
          const catObj = rowObj['category'] as Record<string, unknown>;
          if ('id' in catObj) cat = catObj['id'];
          else cat = rowObj['category'];
        } else {
          cat = rowObj['category'];
        }
        if (cat == null) return false;
        return String(cat) === String(categoryFilter);
      });
    }
    if (!q) return temp;
    return temp.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  }, [rows, search, categoryFilter]);

  const handleDelete = React.useCallback(async (id: number) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa dịch vụ này?')) return;
    setDeletingId(id);
    try {
      const res = await ServiceAPI.deleteService(id);
      if (res.success) {
        setRows(prev => prev.filter(r => r.id !== id));
        toast.success('Đã xóa dịch vụ');
      } else {
        const msg = (res.message || '').toString();
        const friendly = (() => {
          const lower = msg.toLowerCase();
          if (
            lower.includes('foreign key constraint') ||
            lower.includes('cannot delete or update a parent row') ||
            lower.includes('constraint fails') ||
            (lower.includes('appointments') && lower.includes('service'))
          ) {
            return 'Không thể xóa dịch vụ vì đang được sử dụng trong lịch hẹn hoặc dữ liệu liên quan. Vui lòng xóa/cập nhật dữ liệu liên quan trước.';
          }
          return msg || 'Xóa thất bại';
        })();
        toast.error(friendly);
      }
    } catch {
      toast.error('Lỗi hệ thống hoặc mạng');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const columns = React.useMemo((): GridColDef[] => [
    { field: 'id', headerName: '#', width: 80 },
    { field: 'name', headerName: 'Dịch vụ', flex: 1, minWidth: 180 },
    {
      field: 'price',
      headerName: 'Đơn giá',
      width: 160,
      renderCell: (params) => {
        const v = typeof params.row.price === 'number' ? params.row.price : Number(params.row.price ?? 0);
        return <span>{nfVND.format(isNaN(v) ? 0 : v)}</span>;
      }
    },
    { field: 'durationMinutes', headerName: 'Thời lượng (phút)', width: 160 },
    { field: 'description', headerName: 'Mô tả', flex: 1, minWidth: 220 },
    {
      field: 'actions', headerName: 'Xử lý', width: 120, sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title={isAdmin ? "Sửa" : "Bạn không có quyền sửa dịch vụ"}>
            <span>
              <IconButton
                size="small"
                aria-label="edit"
                onClick={() => { setEditing(params.row as ServiceItem); setEditOpen(true); }}
                disabled={!isAdmin}
              >
                <EditIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={isAdmin ? "Xóa" : "Bạn không có quyền xóa dịch vụ "}>
            <span>
              <IconButton
                size="small"
                aria-label="delete"
                onClick={() => handleDelete(params.row.id as number)}
                disabled={deletingId === params.row.id || !isAdmin}
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )
    }
  ], [deletingId, handleDelete, isAdmin]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar và Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'white', borderRadius: 1, mb: 2 }}>
            <TextField
              variant="outlined"
              size="small"
              placeholder="eg. nhập tên/mô tả để tìm kiếm"
              sx={{ flex: 1 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            />
            {/* Giữ chỗ bộ lọc trạng thái nếu cần trong tương lai */}
            {/* <FormControl size="small">
              <Select defaultValue="all" displayEmpty>
                <MenuItem value="all">Tất cả</MenuItem>
              </Select>
            </FormControl> */}
             <Tooltip title={isAdmin ? "Thêm dịch vụ mới" : "Bạn không có quyền thêm dịch vụ"}>
              <span>
                <Button variant="contained" disableElevation onClick={onAddService} disabled={!isAdmin}>Thêm mới</Button>
              </span>
            </Tooltip>
            <Button variant="contained" disableElevation onClick={() => setSearch("")}>Clear</Button>
        </Box>
        {/* Bảng dữ liệu */}
        <Box sx={{ flex: 1, bgcolor: 'white', borderRadius: 1 }}>
      <ToastContainer position="top-right" limit={3} />
      <DataGrid
                rows={filtered}
                columns={columns}
                checkboxSelection
                rowHeight={60}
                loading={loading}
        getRowId={(r) => r.id}
        slots={{}}
            />
      {editing && (
        <ServiceModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initialData={editing}
          onSaved={(updated) => {
            setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
            setEditOpen(false);
          }}
        />
      )}
        </Box>
    </Box>
  );
}