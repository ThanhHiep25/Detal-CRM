import  { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button as MUIButton, Typography, Box, CircularProgress } from '@mui/material';
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaFileCsv, FaEdit, FaTrash, FaUserAlt, FaColumns, FaSync } from "react-icons/fa";
import { DentistAPI, Dentist } from "../../services/dentist";
import { DepartmentAPI, Department } from "../../services/departments";
import { BranchAPI, Branch } from "../../services/branches";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

/* ---------------- Types ---------------- */
type Position = { positionId: number; positionName: string };
type Staff = {
  staffId: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  position?: Position;
  departmentId?: number;
  departmentName?: string;
  branchIds?: number[];
  branchNames?: string[];
  active?: boolean;
  status: "ACTIVATE" | "DEACTIVATED";
  startDate?: string;
  imageUrl?: string;
};

// Loại bỏ 'any' bằng cách định nghĩa các kiểu cụ thể
type StaffUpdatePayload = Partial<Omit<Staff, 'position'>> & {
  position?: Position | null; // Chức vụ có thể null hoặc undefined khi chỉnh sửa
};

type EditingErrors = {
  [K in keyof Staff]?: string;
};

/* ---------------- Config ---------------- */
const PAGE_SIZE = 8;
const STORAGE_COLS_KEY = "employee_visible_columns_v1";

/* ---------------- Mock data ---------------- */
// Xóa mock data, sẽ lấy từ API

/* ---------------- Helpers ---------------- */
const defaultVisibleCols = {
  staffId: true,
  name: true,
  email: true,
  phone: true,
  position: true,
  department: true,
  branches: false,
  status: true,
  address: false,
  startDate: false,
};

const downloadCSV = (rows: Array<Record<string, string | number | boolean | undefined>>, filename = "employees.csv") => {
  if (!rows || rows.length === 0) {
    toast.info("Không có dữ liệu để xuất.");
    return;
  }
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map(r =>
      keys
        .map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const validateField = (name: string, value: string) => {
  const v = String(value ?? "").trim();
  switch (name) {
    case "phone":
      if (!v) return "Vui lòng nhập số điện thoại.";
      // Cho phép 9-15 chữ số để phù hợp Add_Staff
      if (!/^\d{9,15}$/.test(v)) return "SĐT phải gồm 9-15 chữ số.";
      return "";
    case "email":
      if (!v) return "Vui lòng nhập email.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email không hợp lệ.";
      return "";
    case "address":
      // Địa chỉ là tùy chọn -> không bắt buộc
      return "";
    default:
      return "";
  }
};

/* ---------------- Component ---------------- */
export default function EmployeeList() {
  // State cho dropdown cột
  const [showColsDropdown, setShowColsDropdown] = useState(false);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const dropdown = document.getElementById('cols-dropdown');
      if (showColsDropdown && dropdown && !dropdown.contains(e.target as Node)) {
        setShowColsDropdown(false);
      }
    };
    if (showColsDropdown) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColsDropdown]);
  // data + configs
  const [employees, setEmployees] = useState<Staff[]>([]);
  // positions list removed: specialization is edited by free text input now
  const [loading, setLoading] = useState<boolean>(true);
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);
  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  // map dentistId -> userId to send in update payload
  const [dentistUserIds, setDentistUserIds] = useState<Record<number, number>>({});

  // UI states
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ACTIVATE" | "DEACTIVATED">("");
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_COLS_KEY);
      return raw ? JSON.parse(raw) : defaultVisibleCols;
    } catch {
      return defaultVisibleCols;
    }
  });

  // edit states per staffId
  const [editMode, setEditMode] = useState<Record<number, boolean>>({});
  const [editingRows, setEditingRows] = useState<Record<number, StaffUpdatePayload>>({});
  const [editingErrors, setEditingErrors] = useState<Record<number, EditingErrors>>({});

  /* ---------- Init load (replace this with API calls) ---------- */
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await DentistAPI.getDentists();
      if (res.success && Array.isArray(res.data)) {
        const uniqueSpecs = Array.from(new Set(res.data.map(d => d.specialization)));
        const positionsList = uniqueSpecs.map((spec, idx) => ({ positionId: idx + 1, positionName: spec }));

        const staffList: Staff[] = res.data.map((d: Dentist) => ({
          staffId: d.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          address: '',
          position: { positionId: positionsList.find(p => p.positionName === d.specialization)?.positionId ?? 0, positionName: d.specialization },
          departmentId: d.departmentId,
          departmentName: d.departmentName,
          branchIds: d.branchIds ?? [],
          branchNames: d.branchNames ?? [],
          active: d.active,
          status: d.active ? "ACTIVATE" : "DEACTIVATED",
          startDate: '',
          imageUrl: '',
        }));
        setEmployees(staffList);
        const idMap: Record<number, number> = {};
        for (const d of res.data) {
          idMap[d.id] = d.userId;
        }
        setDentistUserIds(idMap);
      } else {
        setEmployees([]);
        toast.error(res.message || "Không lấy được danh sách nhân viên");
      }
    } catch {
      setEmployees([]);
      toast.error("Lỗi hệ thống hoặc mạng!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // load departments & branches for edit controls
  // load departments & branches for edit controls
  useEffect(() => {
    const mounted = true;
    DepartmentAPI.getDepartments()
      .then(res => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) setDepartmentsList(res.data);
        else setDepartmentsList([]);
      })
      .catch(() => { if (mounted) setDepartmentsList([]); });
    BranchAPI.getBranches()
      .then(res => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) setBranchesList(res.data);
        else setBranchesList([]);
      })
      .catch(() => { if (mounted) setBranchesList([]); });
  }, []);

  // pending delete timers & storage for undo
  const pendingDeleteTimersRef = useRef<Record<number, number>>({});
  const pendingDeletedEmployeesRef = useRef<Record<number, Staff>>({});

  // confirm dialog generic
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; content: string; onConfirm?: () => void }>({ open: false, title: '', content: '' });

  // cleanup pending timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingDeleteTimersRef.current).forEach(tid => clearTimeout(tid));
      pendingDeleteTimersRef.current = {};
      pendingDeletedEmployeesRef.current = {};
    };
  }, []);

  /* persist cols */
  useEffect(() => {
    localStorage.setItem(STORAGE_COLS_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  /* ---------- Derived lists ---------- */
  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter ? e.status === statusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [employees, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);


  /* ---------- Pagination ---------- */
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  /* ---------- Editing handlers ---------- */
  const startEdit = (staffId: number) => {
    const emp = employees.find(e => e.staffId === staffId);
    if (!emp) return;
    setEditMode(m => ({ ...m, [staffId]: true }));
    setEditingRows(r => ({ ...r, [staffId]: { ...emp } }));
    setEditingErrors(prev => ({ ...prev, [staffId]: {} }));
  };


  // Hủy chỉnh sửa
  const cancelEdit = (staffId: number) => {
    setEditMode(m => {
      const copy = { ...m }; delete copy[staffId]; return copy;
    });
    setEditingRows(r => {
      const copy = { ...r }; delete copy[staffId]; return copy;
    });
    setEditingErrors(r => {
      const copy = { ...r }; delete copy[staffId]; return copy;
    });

  };

  // Cập nhật giá trị khi chỉnh sửa
  const onEditChange = (staffId: number, field: keyof StaffUpdatePayload, value: unknown) => {
    setEditingRows(prev => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [field]: value } }));
    setEditingErrors(prev => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [field]: "" } }));
  };


  // Validate khi blur khỏi input
  const onEditBlur = (staffId: number, field: keyof Staff) => {
    const val = (editingRows[staffId] ? editingRows[staffId][field] : employees.find(e => e.staffId === staffId)?.[field]) ?? "";
    const err = validateField(String(field), String(val));
    setEditingErrors(prev => ({ ...prev, [staffId]: { ...(prev[staffId] || {}), [field]: err } }));
  };


  // stub upload function — replace with real upload (e.g., Cloudinary) as needed
  const uploadImageStub = async (file: File): Promise<string> => {
    await new Promise(r => setTimeout(r, 600));
    return URL.createObjectURL(file);
  };


  // Lưu thay đổi
  const saveEdit = async (staffId: number) => {
    const emp = employees.find(e => e.staffId === staffId);
    if (!emp) return;
    const edits = editingRows[staffId] || {};

    // Validate tất cả các trường bắt buộc trước khi lưu
  // Chỉ validate các trường bắt buộc theo API
  const fieldsToValidate: (keyof Staff)[] = ["name", "phone", "email"];
    const errs: EditingErrors = {};
    let valid = true;
    for (const f of fieldsToValidate) {
      const val = (edits[f] ?? emp[f] ?? "") as string;
      const err = validateField(String(f), String(val));
      if (err) { errs[f] = err; valid = false; }
    }
    if (!edits.position && !emp.position) { errs.position = "Chọn chức vụ."; valid = false; }

    setEditingErrors(prev => ({ ...prev, [staffId]: errs }));
    if (!valid) { toast.error("Vui lòng sửa lỗi trước khi lưu."); return; }

    if (!window.confirm("Bạn có chắc chắn muốn lưu thay đổi?")) return;

    // Call update API
    try {
      const updated: Staff = {
        ...emp,
        ...edits,
        position: edits.position === null ? undefined : (edits.position ?? emp.position),
        active: edits.active ?? emp.active
      };

      const userId = dentistUserIds[staffId];
      if (!userId) {
        toast.error("Thiếu userId để cập nhật. Tải lại trang và thử lại.");
        return;
      }

      const payload = {
        name: updated.name,
        userId,
        specialization: updated.position?.positionName ?? "",
        email: updated.email,
        phone: updated.phone,
        active: updated.active ?? (updated.status === "ACTIVATE"),
        bio: "",
        departmentId: updated.departmentId ?? undefined,
        branchIds: updated.branchIds ?? []
      };
      const res = await DentistAPI.updateDentist(staffId, payload);
      if (res.success) {
        if ("imageFile" in edits && edits.imageFile instanceof File) {
          const file = edits.imageFile as File;
          const url = await uploadImageStub(file);
          updated.imageUrl = url;
        }
  // ensure readable names are set from lookups
  updated.departmentName = departmentsList.find(d => d.id === updated.departmentId)?.name ?? updated.departmentName;
  updated.branchNames = (updated.branchIds ?? []).map(id => branchesList.find(b => b.id === id)?.name ?? String(id));
  // sync status string with boolean active
  updated.status = updated.active ? "ACTIVATE" : "DEACTIVATED";
  setEmployees(prev => prev.map(p => p.staffId === staffId ? updated : p));
        cancelEdit(staffId);
        toast.success("Lưu thông tin nhân viên thành công!");
      } else {
        toast.error(res.message || "Cập nhật thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lưu thất bại, thử lại.");
    }
  };

  /* ---------- Activate / Deactivate / Delete (mock with state updates) ---------- */
  const toggleDeactivate = (staffId: number) => {
    const emp = employees.find(e => e.staffId === staffId);
    if (!emp) return;
    setConfirmDialog({
      open: true,
      title: emp.status === 'ACTIVATE' ? 'Ngưng làm việc' : 'Kích hoạt',
      content: emp.status === 'ACTIVATE' ? 'Ngưng làm việc nhân viên này?' : 'Kích hoạt nhân viên này?',
      onConfirm: async () => {
        setConfirmDialog(d => ({ ...d, open: false }));
        const userId = dentistUserIds[staffId];
        if (!userId) {
          toast.error("Thiếu userId để cập nhật trạng thái. Tải lại trang và thử lại.");
          return;
        }
        const newActive = emp.status === 'ACTIVATE' ? false : true;
        const payload = {
          name: emp.name,
          userId,
          specialization: emp.position?.positionName ?? "",
          email: emp.email,
          phone: emp.phone,
          active: newActive,
          bio: "",
          departmentId: emp.departmentId ?? undefined,
          branchIds: emp.branchIds ?? []
        };
        try {
          const res = await DentistAPI.updateDentist(staffId, payload);
          if (res.success) {
            setEmployees(prev => prev.map(e => e.staffId === staffId ? { ...e, active: newActive, status: newActive ? 'ACTIVATE' : 'DEACTIVATED' } : e));
            toast.success('Cập nhật trạng thái thành công!');
          } else {
            toast.error(res.message || 'Cập nhật trạng thái thất bại');
          }
        } catch (err) {
          console.error(err);
          toast.error('Lỗi hệ thống hoặc mạng');
        }
      }
    });
  };


  // Xóa nhân viên
  const deleteEmployee = async (staffId: number) => {
    const emp = employees.find(e => e.staffId === staffId);
    if (!emp) return;
    setConfirmDialog({
      open: true,
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa nhân viên ${emp.name}?`,
      onConfirm: () => {
        setConfirmDialog(d => ({ ...d, open: false }));
        // schedule delete with undo
        scheduleDelete(staffId);
      }
    });
  };

  function scheduleDelete(staffId: number) {
    const emp = employees.find(e => e.staffId === staffId);
    if (!emp) return;
    // remove from UI immediately
    setEmployees(prev => prev.filter(e => e.staffId !== staffId));
    pendingDeletedEmployeesRef.current[staffId] = emp;

    const timeoutMs = 8000;
    const tid = window.setTimeout(async () => {
      delete pendingDeleteTimersRef.current[staffId];
      try {
        const res = await DentistAPI.deleteDentist(staffId);
        delete pendingDeletedEmployeesRef.current[staffId];
        if (res.success) {
          toast.success('Xóa nhân viên thành công!');
        } else {
          // restore on failure
          const stored = pendingDeletedEmployeesRef.current[staffId];
          if (stored) setEmployees(prev => [stored, ...prev]);
          toast.error(res.message || 'Xóa thất bại');
        }
      } catch (err) {
        const stored = pendingDeletedEmployeesRef.current[staffId];
        if (stored) setEmployees(prev => [stored, ...prev]);
        delete pendingDeletedEmployeesRef.current[staffId];
        console.error(err);
        toast.error('Lỗi hệ thống khi xóa');
      }
    }, timeoutMs) as unknown as number;
    pendingDeleteTimersRef.current[staffId] = tid;

    const toastId = toast(
      () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>Đã xóa {emp.name}</span>
          <MUIButton
            variant="text"
            size="small"
            onClick={async () => {
              // cancel scheduled delete and restore
              const t = pendingDeleteTimersRef.current[staffId];
              if (t) { clearTimeout(t); delete pendingDeleteTimersRef.current[staffId]; }
              const stored = pendingDeletedEmployeesRef.current[staffId];
              if (stored) {
                setEmployees(prev => [stored, ...prev]);
                delete pendingDeletedEmployeesRef.current[staffId];
                toast.info('Hoàn tác xóa thành công');
                // attempt server recreate if API supports it
                try {
                  type DentistCreateFn = (payload: unknown) => Promise<unknown>;
                  const createFn = (DentistAPI as unknown as { createDentist?: DentistCreateFn }).createDentist;
                  if (typeof createFn === 'function') {
                    await createFn({ name: stored.name, email: stored.email, phone: stored.phone, specialization: stored.position?.positionName ?? '', departmentId: stored.departmentId, branchIds: stored.branchIds ?? [] });
                  }
                } catch (e) {
                  console.warn('Recreate after undo failed or not supported', e);
                }
              }
              toast.dismiss(toastId);
            }}
          >
            Hoàn tác
          </MUIButton>
        </Box>
      ),
      { autoClose: timeoutMs }
    );
  }

  /* ---------- Export CSV ---------- */
  const exportVisibleCSV = () => {
    const rows: Array<Record<string, string | number | boolean | undefined>> = filtered.map(e => {
      const row: Record<string, string | number | boolean | undefined> = {};
      if (visibleCols.staffId) row.staffId = e.staffId;
      if (visibleCols.name) row.name = e.name;
      if (visibleCols.email) row.email = e.email;
      if (visibleCols.phone) row.phone = e.phone;
      if (visibleCols.position) row.position = e.position?.positionName ?? "";
      if (visibleCols.department) row.department = e.departmentName ?? "";
      if (visibleCols.branches) row.branches = (e.branchNames ?? []).join(', ');
      if (visibleCols.status) row.status = e.status;
      if (visibleCols.startDate) row.startDate = e.startDate ?? "";
      if (visibleCols.address) row.address = e.address ?? "";
      return row;
    });
    downloadCSV(rows, "employees_visible.csv");
  };

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-2xl min-h-screen md:p-6 pb-16">
      <ToastContainer limit={3} position="top-right" />

      {/* Generic confirm dialog used to replace window.confirm */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.content}</Typography>
        </DialogContent>
        <DialogActions>
          <MUIButton onClick={() => setConfirmDialog(d => ({ ...d, open: false }))}>Hủy</MUIButton>
          <MUIButton variant="contained" color="error" onClick={() => { confirmDialog.onConfirm?.(); }}>{'Xác nhận'}</MUIButton>
        </DialogActions>
      </Dialog>

      <div className="max-w-8xl mx-auto space-y-4">
        <div className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản trị nhân sự</p>
            <h1 className="text-2xl font-semibold">Danh sách nhân viên <span className="text-sm font-normal opacity-90">({employees.length})</span></h1>
            <p className="text-sm opacity-85">Xem nhanh trạng thái, bộ phận và chi nhánh.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === "cards" ? "table" : "cards")}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl backdrop-blur transition flex items-center gap-2"
              title="Chuyển view"
            >
              <FaColumns /> {viewMode === "cards" ? "Chuyển bảng" : "Chuyển thẻ"}
            </button>
            <div className="relative group">
              <button className="px-3 py-2 bg-white text-indigo-700 rounded-xl flex items-center gap-2 shadow">
                <FaFileCsv /> Xuất
              </button>
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow p-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={exportVisibleCSV} className="block w-full text-left px-3 py-2 hover:bg-gray-100">Xuất CSV (view)</button>
                <button onClick={() => toast.info("Nếu có API, đây sẽ gọi export Excel server.")} className="block w-full text-left px-3 py-2 hover:bg-gray-100">Yêu cầu Excel (server)</button>
              </div>
            </div>
            <button
              onClick={() => loadEmployees()}
              disabled={loading}
              className="px-3 py-2 bg-white text-indigo-700 rounded-xl hover:bg-indigo-50 flex items-center gap-2 shadow"
              title="Tải lại danh sách"
            >
              <FaSync /> Tải lại
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên..."
              className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as "" | "ACTIVATE" | "DEACTIVATED"); setPage(1); }}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVATE">Hoạt động</option>
              <option value="DEACTIVATED">Không hoạt động</option>
            </select>

            <div className="relative">
              <button
                className="px-3 py-2 bg-slate-100 rounded-lg flex items-center gap-2 w-full justify-between"
                onClick={() => setShowColsDropdown((v) => !v)}
                type="button"
              >
                <span className="flex items-center gap-2"><FaColumns /> Cột hiển thị</span> ▾
              </button>
              {showColsDropdown && (
                <div id="cols-dropdown" className="absolute left-0 mt-2 w-56 bg-white border rounded shadow p-3 z-10">
                  {Object.keys(visibleCols).map(k => (
                    <label key={k} className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={visibleCols[k]} onChange={() => setVisibleCols(prev => ({ ...prev, [k]: !prev[k] }))} />
                      <span className="capitalize text-sm">{k}</span>
                    </label>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setVisibleCols(Object.fromEntries(Object.keys(visibleCols).map(k => [k, true])))} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">Hiện tất cả</button>
                    <button onClick={() => setVisibleCols(Object.fromEntries(Object.keys(visibleCols).map(k => [k, false])))} className="px-2 py-1 bg-gray-200 rounded text-sm">Ẩn tất cả</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end text-sm text-slate-500">Hiển thị {paginated.length} / {filtered.length} kết quả</div>
          </div>
        </div>

        {/* view */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          {viewMode === "cards" ? (
            <>
              {paginated.length === 0 ? (
                <div className="text-center text-gray-500 py-12">Không tìm thấy nhân viên.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {paginated.map(emp => {
                    const isEditing = !!editMode[emp.staffId];
                    const editingStaff = editingRows[emp.staffId];
                    const errors = editingErrors[emp.staffId];
                    return (
                      <motion.div key={emp.staffId} whileHover={{ scale: 1.01 }} className="rounded-2xl border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md border-slate-100 bg-white">
                        <div className="flex flex-col items-center">
                          {isEditing ? (
                            <>

                              <img src="/doctor.png" alt="" className="w-20 h-20 rounded-full shadow-md object-cover mb-2" />

                              <input className="w-full border rounded p-2 mb-2 text-sm" value={editingStaff?.name ?? emp.name} onChange={e => onEditChange(emp.staffId, "name", e.target.value)} onBlur={() => onEditBlur(emp.staffId, "name")} />
                              {errors?.name && <div className="text-red-500 text-xs w-full text-left">{errors.name}</div>}

                              <input className="w-full border rounded p-2 mb-2 text-sm" value={editingStaff?.email ?? emp.email} onChange={e => onEditChange(emp.staffId, "email", e.target.value)} onBlur={() => onEditBlur(emp.staffId, "email")} />
                              {errors?.email && <div className="text-red-500 text-xs w-full text-left">{errors.email}</div>}

                              <input className="w-full border rounded p-2 mb-2 text-sm" value={editingStaff?.phone ?? emp.phone} onChange={e => onEditChange(emp.staffId, "phone", e.target.value)} onBlur={() => onEditBlur(emp.staffId, "phone")} />
                              {errors?.phone && <div className="text-red-500 text-xs w-full text-left">{errors.phone}</div>}

                              <input
                                className="w-full border rounded p-2 mb-2 text-sm"
                                value={editingStaff?.position?.positionName ?? emp.position?.positionName ?? ""}
                                onChange={e => onEditChange(emp.staffId, "position", { positionId: editingStaff?.position?.positionId ?? emp.position?.positionId ?? 0, positionName: e.target.value })}
                                onBlur={() => onEditBlur(emp.staffId, "position")}
                                placeholder="Nhập chuyên môn / chức vụ"
                              />
                              {errors?.position && <div className="text-red-500 text-xs w-full text-left">{errors.position}</div>}

                              <select className="w-full border rounded p-2 mb-2 text-sm" value={String(editingStaff?.departmentId ?? emp.departmentId ?? "")} onChange={e => onEditChange(emp.staffId, "departmentId", e.target.value === "" ? undefined : Number(e.target.value))}>
                                <option value="">Chọn bộ phận</option>
                                {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                              {errors?.departmentId && <div className="text-red-500 text-xs w-full text-left">{errors.departmentId}</div>}

                              <label className="text-sm text-gray-500 mb-1">Chi nhánh:</label>
                              <div className="flex flex-wrap gap-2 w-full mb-2">
                                {(editingStaff?.branchIds ?? emp.branchIds ?? []).map(id => {
                                  const name = branchesList.find(b => b.id === id)?.name ?? String(id);
                                  return (
                                    <span key={id} className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-full text-sm">
                                      <span>{name}</span>
                                      <button type="button" className="text-red-500 font-bold" onClick={() => {
                                        const vals = (editingStaff?.branchIds ?? emp.branchIds ?? []).filter(x => x !== id);
                                        onEditChange(emp.staffId, "branchIds", vals);
                                      }}>×</button>
                                    </span>
                                  );
                                })}
                              </div>
                              <select className="w-full border rounded p-2 mb-2 text-sm" defaultValue="" onChange={e => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v)) {
                                  const vals = Array.from(new Set([...(editingStaff?.branchIds ?? emp.branchIds ?? []), v]));
                                  onEditChange(emp.staffId, "branchIds", vals);
                                }
                                (e.target as HTMLSelectElement).selectedIndex = 0;
                              }}>
                                <option value="">Thêm chi nhánh</option>
                                {branchesList.map(b => (
                                  <option key={b.id} value={b.id} disabled={(editingStaff?.branchIds ?? emp.branchIds ?? []).includes(b.id)}>{b.name}</option>
                                ))}
                              </select>
                              {errors?.branchIds && <div className="text-red-500 text-xs w-full text-left">{errors.branchIds}</div>}
                            </>
                          ) : (
                            <>
                              <img src="/doctor.png" alt="" className="w-20 h-20 rounded-full shadow-md object-cover mb-2" />
                              <h3 className="font-semibold text-slate-900">{emp.name}</h3>
                              {visibleCols.email && <div className="text-sm text-gray-500">Email: {emp.email}</div>}
                              {visibleCols.phone && <div className="text-sm text-gray-500">SĐT: {emp.phone}</div>}
                              {visibleCols.position && <div className="text-sm text-gray-500">Chức vụ: {emp.position?.positionName}</div>}
                              {emp.departmentName && <div className="text-sm text-gray-500">Bộ phận: {emp.departmentName}</div>}
                              {(emp.branchNames && emp.branchNames.length > 0) && <div className="text-sm text-gray-500">Chi nhánh: {emp.branchNames.join(', ')}</div>}
                              {visibleCols.startDate && <div className="text-sm text-gray-400">Ngày vào: {emp.startDate}</div>}
                              {visibleCols.address && <div className="text-sm text-gray-400 truncate w-full text-center">{emp.address}</div>}
                            </>
                          )}

                          <div className="mt-3 w-full flex items-center justify-between">
                            <div className={`px-2 py-1 rounded text-xs ${emp.status === "ACTIVATE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {emp.status === "ACTIVATE" ? "Đang làm việc" : "Đã nghỉ"}
                            </div>

                            <div className="flex gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={() => saveEdit(emp.staffId)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Lưu</button>
                                  <button onClick={() => cancelEdit(emp.staffId)} className="px-3 py-1 bg-gray-300 rounded text-sm">Hủy</button>
                                </>
                              ) : (
                                <>
                                  <button title="Sửa" onClick={() => startEdit(emp.staffId)} className="p-2 bg-blue-100 text-blue-700 rounded-lg"><FaEdit /></button>
                                  <button title={emp.status === "ACTIVATE" ? "Ngừng" : "Kích hoạt"} onClick={() => toggleDeactivate(emp.staffId)} className="p-2 bg-orange-100 text-orange-700 rounded-lg"><FaUserAlt /></button>
                                  <button title="Xóa" onClick={() => deleteEmployee(emp.staffId)} className="p-2 bg-red-100 text-red-700 rounded-lg"><FaTrash /></button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            // Table view
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    {visibleCols.staffId && <th className="p-2 text-left">Mã</th>}
                    {visibleCols.name && <th className="p-2 text-left">Họ & Tên</th>}
                    {visibleCols.email && <th className="p-2 text-left">Email</th>}
                    {visibleCols.phone && <th className="p-2 text-left">SĐT</th>}
                    {visibleCols.position && <th className="p-2 text-left">Chức vụ</th>}
                        {visibleCols.department && <th className="p-2 text-left">Bộ phận</th>}
                        {visibleCols.branches && <th className="p-2 text-left">Chi nhánh</th>}
                    {visibleCols.startDate && <th className="p-2 text-left">Ngày vào</th>}
                    {visibleCols.address && <th className="p-2 text-left">Địa chỉ</th>}
                    {visibleCols.status && <th className="p-2 text-left">Trạng thái</th>}
                    <th className="p-2 text-center">Xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(emp => (
                    <tr key={emp.staffId} className="border-t border-slate-100 hover:bg-slate-50">
                      {visibleCols.staffId && <td className="p-2">{emp.staffId}</td>}
                      {visibleCols.name && <td className="p-2">{emp.name}</td>}
                      {visibleCols.email && <td className="p-2">{emp.email}</td>}
                      {visibleCols.phone && <td className="p-2">{emp.phone}</td>}
                      {visibleCols.position && <td className="p-2"><span className="text-sm bg-purple-100 text-purple-600  p-2 px-4 rounded-full">{emp.position?.positionName}</span></td>}
                          {visibleCols.department && <td className="p-2">{emp.departmentName ?? ''}</td>}
                          {visibleCols.branches && <td className="p-2">{(emp.branchNames ?? []).join(', ')}</td>}
                      {visibleCols.startDate && <td className="p-2">{emp.startDate}</td>}
                      {visibleCols.address && <td className="p-2">{emp.address}</td>}
                      {visibleCols.status && <td className="p-2">{emp.status}</td>}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => startEdit(emp.staffId)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg"><FaEdit /></button>
                          <button onClick={() => toggleDeactivate(emp.staffId)} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg">{emp.status === "ACTIVATE" ? "Ngừng" : "Kích hoạt"}</button>
                          <button onClick={() => deleteEmployee(emp.staffId)} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-3">
          <button className="px-3 py-2 border rounded-lg bg-white shadow-sm" onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeftIcon className="h-4 w-4" /></button>
          <span className="px-3 py-2 bg-white rounded-lg border shadow-sm">Trang {page} / {totalPages}</span>
          <button className="px-3 py-2 border rounded-lg bg-white shadow-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRightIcon className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
