import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Trash2, Ban, ChevronLeft, ChevronRight, UserPen } from "lucide-react";
import { UserAPI } from "../../services/user";
import { AuthAPI } from "../../services/auth";
import RoleAPI, { type RoleItem } from '../../services/role';
import type { ApiResponse, UserProfile } from "../../services/user";
import { FaFileCsv, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { Avatar, CircularProgress } from "@mui/material";

type AccountStatus = "ACTIVATE" | "DEACTIVATED" | "BLOCKED";

type Role = string;

type Account = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: Role;
  status: AccountStatus;
  enabled?: boolean;
  profileId?: number;
  createdAt: string; // ISO
  avatar?: string;
};

// Loại bỏ 'any' bằng cách định nghĩa các kiểu cụ thể
type EditableAccount = Omit<Account, "id" | "createdAt" | "status" | "role"> & {
  id: number;
  _file?: File;
  name: string;
  email: string;
  role?: Role;
};

type EditingErrors = {
  [K in keyof EditableAccount]?: string;
};

// ---------------- Config ----------------
const PAGE_SIZE = 12;


// ---------------- Helpers ----------------
function downloadCSV(rows: Record<string, unknown>[], filename = "export.csv") {
  if (!rows.length) {
    toast.info("Không có dữ liệu để xuất.");
    return;
  }
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Cải tiến: validateAccount nhận EditableAccount hoặc Partial<Account>
// Regex: Tên chỉ cho phép chữ cái (bao gồm tiếng Việt) và khoảng trắng
const NAME_REGEX = /^[\p{L}\s]+$/u;
// Regex: SĐT bắt đầu bằng 0 và có đúng 10 chữ số
const PHONE_REGEX = /^0\d{9}$/;

function validateAccount(a: Partial<EditableAccount>): EditingErrors {
  const errors: EditingErrors = {};
  if (!a.name || !String(a.name).trim()) {
    errors.name = "Tên không được để trống";
  } else if (!NAME_REGEX.test(String(a.name).trim())) {
    errors.name = "Tên không được chứa ký tự đặc biệt hoặc số";
  }
  if (!a.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(a.email))) errors.email = "Email không hợp lệ";
  if (a.phone && !PHONE_REGEX.test(String(a.phone))) errors.phone = "SĐT phải bắt đầu bằng 0 và có đúng 10 số";
  return errors;
}

// Upload stub (replace with real Cloudinary upload or API)
async function uploadAvatarStub(file: File): Promise<string> {
  await new Promise(r => setTimeout(r, 600));
  return URL.createObjectURL(file);
}

// ---------------- Component ----------------
export default function StaffAccountsAdmin() {
  // data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // UI
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | AccountStatus>("");
  const [roleFilter, setRoleFilter] = useState<"" | string>("");
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState<RoleItem[]>([]);

  // selection + bulk
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  // edit modal
  const [editing, setEditing] = useState<EditableAccount | null>(null);
  const [editingErrors, setEditingErrors] = useState<EditingErrors>({});
  const [passwordInput, setPasswordInput] = useState<{ newPassword: string; confirm: string }>({ newPassword: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin] = useState<boolean>(true); // toggle to demo role-based controls

  // load from API (extracted so we can re-use after updates)
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await UserAPI.getUsers();
      if (res && res.success && Array.isArray(res.data)) {
        const mapped: Account[] = (res.data as unknown[]).map((u) => {
          const uu = u as Record<string, unknown>;
          const profile = uu['profile'] as Record<string, unknown> | undefined;
          const enabled = !!uu['enabled'];
          const roleFromEntity = (uu['roleEntity'] && (uu['roleEntity'] as Record<string, unknown>)['name']) ? String((uu['roleEntity'] as Record<string, unknown>)['name']) : undefined;
          return {
            id: Number(uu['id'] ?? 0),
            name: String(uu['fullName'] ?? uu['username'] ?? uu['email'] ?? ''),
            email: String(uu['email'] ?? ''),
            phone: (profile && profile['phone']) ? String(profile['phone']) : (uu['phone'] ? String(uu['phone']) : undefined),
            address: profile && profile['address'] ? String(profile['address']) : undefined,
            role: roleFromEntity ?? String(uu['role'] ?? 'user'),
            status: enabled ? 'ACTIVATE' : 'DEACTIVATED',
            enabled,
            profileId: profile && typeof profile['id'] === 'number' ? (profile['id'] as number) : undefined,
            createdAt: String(uu['createdAt'] ?? new Date().toISOString()),
            avatar: String(uu['avatarUrl'] ?? (profile && profile['avatarUrl']) ?? '') || undefined
          } as Account;
        });
        setAccounts(mapped);
      } else {
        toast.error(res?.message || 'Không lấy được danh sách người dùng');
      }

      // load roles after accounts are available (best-effort)
      try {
        const rres = await RoleAPI.getRoles();
        if (rres && rres.success) setRoles(rres.data || []);
      } catch (err) {
        console.warn('Failed to load roles', err);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi mạng hoặc hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, []);

  // derived
  const filtered = useMemo(() => {
    return accounts.filter(a => {
      const bySearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase());
      const byStatus = statusFilter ? a.status === statusFilter : true;
      const byRole = roleFilter ? a.role === roleFilter : true;
      return bySearch && byStatus && byRole;
    });
  }, [accounts, search, statusFilter, roleFilter]);

  // derive role options: prefer roles from API, fallback to values found on accounts
  const roleOptions = useMemo(() => {
    if (roles && roles.length > 0) return roles.map(r => String(r.name));
    return Array.from(new Set(accounts.map(a => String(a.role || '')))).filter(Boolean);
  }, [roles, accounts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  // selection helpers
  const toggleSelect = (id: number) => setSelected(s => ({ ...s, [id]: !s[id] }));
  const selectAllPage = (on: boolean) => {
    const slice = pageItems.reduce<Record<number, boolean>>((acc, it) => ({ ...acc, [it.id]: on }), {});
    setSelected(prev => ({ ...prev, ...slice }));
  };

  // actions
  const openEdit = (acct: Account) => {
    setEditing({ ...acct });
    setEditingErrors({});
    setPasswordInput({ newPassword: '', confirm: '' });
    setShowPassword(false);
  };
  const closeEdit = () => { setEditing(null); setEditingErrors({}); setPasswordInput({ newPassword: '', confirm: '' }); setShowPassword(false); };



  const saveEditing = async () => {
    if (!editing || editing.id == null) return;
    const errors = validateAccount(editing);
    if (Object.keys(errors).length) { setEditingErrors(errors); toast.error("Có lỗi dữ liệu"); return; }

    try {
      // upload if has file
      const file = editing._file;
      let avatarUrl = editing.avatar;
      if (file) avatarUrl = await uploadAvatarStub(file);

      // find profileId for this user
      const acct = accounts.find(a => a.id === editing.id);
      const profileId = acct?.profileId;

      // build profile payload
      const profilePayload: Record<string, unknown> = {};
      if (typeof profileId === 'number') profilePayload.id = profileId;
      if (editing.phone) profilePayload.phone = editing.phone;
      if (editing.address) profilePayload.address = editing.address;
      if (avatarUrl) profilePayload.avatarUrl = avatarUrl;

      // user-level payload (name/email/role). Include roleEntity (id + name) when available to match backend shape.
      const userPayload: Record<string, unknown> = { fullName: editing.name, email: editing.email, role: editing.role };
      const matchedRole = roles.find(r => String(r.name) === String(editing.role));
      if (matchedRole) {
        userPayload.roleEntity = { id: matchedRole.id, name: matchedRole.name };
      }

      if (profileId) {
        const res = (await UserAPI.updateProfile(profilePayload)) as ApiResponse<UserProfile>;
          if (res && res.success) {
            const pdata = res.data as UserProfile;
            // merge profile changes locally (temporary)
            setAccounts(prev => prev.map(a => a.id === editing.id ? {
              ...a,
              name: editing.name ?? a.name,
              email: editing.email ?? a.email,
              phone: pdata.phone ?? (editing.phone ?? a.phone),
              address: pdata.address ?? (editing.address ?? a.address),
              avatar: avatarUrl ?? a.avatar
            } : a));

            // persist user-level fields
            try {
              const ures = await UserAPI.updateUser(editing.id, userPayload);
              if (ures && ures.success && ures.data) {
                const ud = ures.data as unknown as Record<string, unknown>;
                const roleName = ud.role ?? (ud.roleEntity && (ud.roleEntity as Record<string, unknown>).name) ?? editing.role;
                setAccounts(prev => prev.map(a => a.id === editing.id ? ({ ...a, role: String(roleName ?? a.role), name: String(ud.fullName ?? editing.name ?? a.name), email: String(ud.email ?? editing.email ?? a.email) }) as Account : a));
              }
            } catch (err) {
              console.warn('updateUser failed', err);
              toast.warn('Cập nhật vai trò/thuộc tính người dùng thất bại');
            }

            toast.success("Lưu thành công");
            closeEdit();
            // refresh only the updated user from server
            try {
              const fres = await UserAPI.getUserById(editing.id);
              if (fres && fres.success && fres.data) {
                const mapped = mapUserToAccount(fres.data as unknown as Record<string, unknown>);
                setAccounts(prev => prev.map(a => a.id === editing.id ? mapped : a));
              }
            } catch (err) {
              console.warn('Failed to refresh user after save', err);
            }
          } else {
            toast.error(res?.message || "Cập nhật hồ sơ thất bại");
          }
      } else {
        // no profile id -> update user resource and local fallback
        try {
          const ures = await UserAPI.updateUser(editing.id, userPayload);
          if (ures && ures.success && ures.data) {
            const ud = ures.data as unknown as Record<string, unknown>;
            const roleName = ud.role ?? (ud.roleEntity && (ud.roleEntity as Record<string, unknown>).name) ?? editing.role;
            setAccounts(prev => prev.map(a => a.id === editing.id ? ({ ...a, role: String(roleName ?? a.role), name: String(ud.fullName ?? editing.name ?? a.name), email: String(ud.email ?? editing.email ?? a.email), avatar: avatarUrl ?? a.avatar }) as Account : a));
            toast.success('Lưu thành công');
            closeEdit();
            // refresh only the updated user
            try {
              const fres = await UserAPI.getUserById(editing.id);
              if (fres && fres.success && fres.data) {
                const mapped = mapUserToAccount(fres.data as unknown as Record<string, unknown>);
                setAccounts(prev => prev.map(a => a.id === editing.id ? mapped : a));
              }
            } catch (err) {
              console.warn('Failed to refresh user after save', err);
            }
          } else {
            // fallback local update
            setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, name: editing.name ?? a.name, email: editing.email ?? a.email, phone: editing.phone ?? a.phone, address: editing.address ?? a.address, avatar: avatarUrl ?? a.avatar, role: editing.role ?? a.role } : a));
            toast.info('Cập nhật cục bộ; user chưa tồn tại hoàn chỉnh trên server.');
            closeEdit();
            // attempt to refresh the single user — harmless if server has no new data
            try {
              const fres = await UserAPI.getUserById(editing.id);
              if (fres && fres.success && fres.data) {
                const mapped = mapUserToAccount(fres.data as unknown as Record<string, unknown>);
                setAccounts(prev => prev.map(a => a.id === editing.id ? mapped : a));
              }
            } catch (err) {
              console.warn('Failed to refresh user after local update', err);
            }
          }
        } catch (err) {
          console.error(err);
          toast.error('Lưu thất bại');
        }
      }
    } catch (err) {
      console.error(err); toast.error("Lưu thất bại");
    }
  };

  const toggleStatus = async (id: number) => {
    const acct = accounts.find(a => a.id === id);
    if (!acct) return;
    // determine new enabled state
    const newEnabled = !acct.enabled;
    try {
      const res = await UserAPI.updateUserEnabled(id, newEnabled);
      if (res && res.success) {
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, enabled: newEnabled, status: newEnabled ? 'ACTIVATE' : 'DEACTIVATED' } : a));
        toast.success('Cập nhật trạng thái thành công');
      } else {
        const msg = String(res?.message ?? '');
        if (msg.includes("Column 'email' cannot be null") || msg.includes("email') cannot be null") || (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('null'))) {
          toast.error('Cập nhật thất bại: email bị null trên server. Vui lòng kiểm tra thông tin user.');
        } else {
          toast.error(res?.message || 'Cập nhật trạng thái thất bại');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi hệ thống. Không thể cập nhật trạng thái');
    }
  };

  const blockAccount = (id: number) => {
    if (!isAdmin) { toast.error("Không có quyền"); return; }
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: "BLOCKED" } : a));
    toast.success("Khóa tài khoản");
  };

  const deleteAccount = (id: number) => {
    if (!isAdmin) { toast.error("Không có quyền"); return; }
    if (!window.confirm("Xác nhận xóa tài khoản?")) return;
    setAccounts(prev => prev.filter(a => a.id !== id));
    toast.success("Đã xóa");
  };

  // reset password for a specific account via admin endpoint
  const resetPassword = async () => {
    if (!editing) return;
    const np = passwordInput.newPassword.trim();
    const cf = passwordInput.confirm.trim();
    
    // Validation checks
    if (!np) { toast.error('Vui lòng nhập mật khẩu mới'); return; }
    if (np.length < 8) { toast.error('Mật khẩu phải có ít nhất 8 ký tự'); return; }
    
    // Regex validation: at least one uppercase letter
    if (!/[A-Z]/.test(np)) {
      toast.error('Mật khẩu phải có ít nhất một chữ cái viết hoa');
      return;
    }
    
    // Regex validation: at least one number
    if (!/[0-9]/.test(np)) {
      toast.error('Mật khẩu phải có ít nhất một chữ số');
      return;
    }
    
    // Regex validation: at least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(np)) {
      toast.error('Mật khẩu phải có ít nhất một ký tự đặc biệt (!@#$%^&*...)');
      return;
    }
    
    if (np !== cf) { toast.error('Xác nhận mật khẩu không khớp'); return; }
    
    try {
      const res = await AuthAPI.adminResetPassword({ usernameOrEmail: editing.email, newPassword: np });
      if (res && res.success) {
        toast.success('Đổi mật khẩu thành công. Người dùng sẽ cần đăng nhập lại.');
        setPasswordInput({ newPassword: '', confirm: '' });
      } else {
        toast.error(res?.message || 'Đổi mật khẩu thất bại');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi hệ thống khi đổi mật khẩu');
    }
  };

  // bulk
  const bulkDeleteSelected = () => {
    const ids = Object.keys(selected).filter(k => selected[Number(k)]).map(k => Number(k));
    if (!ids.length) { toast.info("Chưa chọn bản ghi"); return; }
    if (!window.confirm(`Xóa ${ids.length} tài khoản đã chọn?`)) return;
    setAccounts(prev => prev.filter(a => !ids.includes(a.id)));
    setSelected({}); toast.success("Xóa hàng loạt thành công");
  };

  const bulkExportSelected = () => {
    const ids = Object.keys(selected).filter(k => selected[Number(k)]).map(k => Number(k));
    const rows = accounts.filter(a => ids.includes(a.id)).map(a => ({ id: a.id, name: a.name, email: a.email, role: a.role, status: a.status }));
    downloadCSV(rows, "selected_accounts.csv");
  };

  // export visible
  const exportVisible = () => {
    const rows = filtered.map(a => ({ id: a.id, name: a.name, email: a.email, role: a.role, status: a.status }));
    downloadCSV(rows, "accounts_visible.csv");
  };

  if (loading) return <div className="w-full h-[80vh] flex items-center justify-center">
    <CircularProgress />
  </div>;
  return (
    <div className="md:p-6 pb-6 bg-slate-50 rounded-2xl min-h-screen">
      <ToastContainer />
      <div className="max-w-8xl mx-auto space-y-4">
        <div className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="uppercase text-xs tracking-[0.2em] opacity-80">Quản trị người dùng</p>
            <h1 className="text-2xl font-semibold">Quản lý tài khoản <span className="text-sm font-normal opacity-90">({accounts.length})</span></h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setView(v => v === "cards" ? "table" : "cards")} className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl backdrop-blur transition">
              {view === "cards" ? "Chuyển bảng" : "Chuyển thẻ"}
            </button>
            <button onClick={exportVisible} className="px-3 py-2 bg-white text-indigo-700 rounded-xl flex items-center gap-2 shadow">
              <FaFileCsv /> Xuất danh sách
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Tìm tên hoặc email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={statusFilter} onChange={e => { setStatusFilter(e.target.value as AccountStatus | ""); setPage(1); }}>
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVATE">Hoạt động</option>
              <option value="DEACTIVATED">Ngừng</option>
              <option value="BLOCKED">Bị khóa</option>
            </select>
            <select className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={roleFilter} onChange={e => { setRoleFilter(e.target.value as string | ""); setPage(1); }}>
              <option value="">Tất cả vai trò</option>
              {roleOptions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => selectAllPage(true)} className="px-3 py-2 bg-slate-100 rounded-lg">Chọn trang</button>
              <button onClick={() => selectAllPage(false)} className="px-3 py-2 bg-slate-100 rounded-lg">Bỏ chọn</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-between items-center mt-3">
            <div className="text-sm text-slate-500">Hiển thị {pageItems.length} / {filtered.length} kết quả</div>
            <div className="flex gap-2">
              <button onClick={bulkExportSelected} className="px-3 py-2 bg-indigo-600 text-white rounded-lg shadow">Xuất chọn</button>
              <button onClick={bulkDeleteSelected} className="px-3 py-2 bg-red-500 text-white rounded-lg shadow">Xóa chọn</button>
            </div>
          </div>
        </div>

        {/* Main view */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          {view === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pageItems.map(a => (
                <div key={a.id} className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${selected[a.id] ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-100 bg-white'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center font-semibold uppercase">
                      {a.name?.[0] ?? 'U'}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">{a.name}</div>
                          <div className="text-xs text-slate-500">{a.email}</div>
                        </div>
                        <span title={a.status} className={`${a.status === 'ACTIVATE' ? 'bg-green-500' : a.status === 'BLOCKED' ? 'bg-red-500' : 'bg-yellow-500'} w-3 h-3 rounded-full animate-pulse`} />
                      </div>
                      <div className="text-xs inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                        {a.role}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                      <input type="checkbox" checked={!!selected[a.id]} onChange={() => toggleSelect(a.id)} />
                      Chọn
                    </label>
                    <div className="flex gap-2 items-center">
                      <button title="Chỉnh sửa" onClick={() => openEdit(a)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg"><UserPen className="w-4 h-4" /></button>
                      {isAdmin && <button onClick={() => blockAccount(a.id)} title="Khóa tài khoản" className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg"><Ban className="w-4 h-4" /></button>}

                      <label className="inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          aria-label={a.enabled ? 'Đang hoạt động' : 'Đã ngừng hoạt động'}
                          checked={!!a.enabled}
                          onChange={() => {
                            if (a.enabled) {
                              if (!window.confirm('Xác nhận ngừng hoạt động tài khoản này?')) return;
                            }
                            toggleStatus(a.id);
                          }}
                          className="sr-only"
                        />
                        <span className={`${a.enabled ? 'bg-green-500' : 'bg-slate-300'} w-11 h-6 rounded-full relative inline-block transition-colors`}>
                          <span className={`transform transition-transform inline-block w-5 h-5 bg-white rounded-full absolute top-0.5 ${a.enabled ? 'left-5' : 'left-0.5'}`} />
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2"><input type="checkbox" onChange={(e) => selectAllPage(e.target.checked)} /></th>
                    <th className="p-2">Mã</th>
                    <th className="p-2">Tên</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Vai trò</th>
                    <th className="p-2">Trạng thái</th>
                    <th className="p-2">Ngày tạo</th>
                    <th className="p-2">Kích hoạt</th>
                    <th className="p-2 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(a => (
                    <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-2"><input type="checkbox" checked={!!selected[a.id]} onChange={() => toggleSelect(a.id)} /></td>
                      <td className="p-2">{a.id}</td>
                      <td className="p-2 flex items-center gap-2"><Avatar src={a.name} alt={a.name} />{a.name}</td>
                      <td className="p-2">{a.email}</td>
                      <td className="p-2 text-center">{a.role}</td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-2">
                          <span title={a.status} className={`${a.status === 'ACTIVATE' ? 'bg-green-500' : a.status === 'BLOCKED' ? 'bg-red-500' : 'bg-yellow-500'} w-3 h-3 rounded-full animate-pulse`} />
                        </div>
                      </td>
                      <td className="p-2">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="p-2 text-center">
                        <label className="inline-flex items-center cursor-pointer select-none">
                          <input type="checkbox" checked={!!a.enabled} onChange={() => {
                            if (a.enabled) {
                              if (!window.confirm('Xác nhận ngừng hoạt động tài khoản này?')) return;
                            }
                            toggleStatus(a.id);
                          }} className="sr-only" />
                          <span className={`${a.enabled ? 'bg-green-500' : 'bg-slate-300'} w-10 h-5 rounded-full relative inline-block transition-colors`}>
                            <span className={`transform transition-transform inline-block w-4 h-4 bg-white rounded-full absolute top-0.5 ${a.enabled ? 'left-5' : 'left-0.5'}`} />
                          </span>
                        </label>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(a)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg"><UserPen className="w-4 h-4" /></button>
                          {isAdmin && <button onClick={() => blockAccount(a.id)} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg"><Ban className="w-4 h-4" /></button>}
                          <button onClick={() => deleteAccount(a.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
        <div className="flex items-center justify-center gap-3 mt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-2 border rounded-lg bg-white shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
          <div className="px-3 py-2 bg-white rounded-lg border shadow-sm">{page} / {totalPages}</div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-2 border rounded-lg bg-white shadow-sm"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-xl p-4 w-full max-w-md" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <h3 className="text-lg font-semibold mb-3">Chỉnh sửa tài khoản</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs">Họ & tên</label>
                  <input className={`w-full border rounded px-3 py-2 ${editingErrors.name ? 'border-red-500' : ''}`} value={editing.name ?? ''} onChange={e => setEditing(prev => ({
                    ...(prev as EditableAccount),
                    name: e.target.value
                  }))} />
                  {editingErrors.name && <div className="text-red-500 text-xs">{editingErrors.name}</div>}
                </div>
                <div>
                  <label className="text-xs">Email</label>
                  <input className={`w-full border rounded px-3 py-2 ${editingErrors.email ? 'border-red-500' : ''}`} value={editing.email ?? ''} onChange={e => setEditing(prev => ({
                    ...(prev as EditableAccount),
                    email: e.target.value
                  }))} />
                  {editingErrors.email && <div className="text-red-500 text-xs">{editingErrors.email}</div>}
                </div>
                <div>
                  <label className="text-xs">SĐT</label>
                  <input className={`w-full border rounded px-3 py-2 ${editingErrors.phone ? 'border-red-500' : ''}`} value={editing.phone ?? ''} onChange={e => setEditing(prev => ({
                    ...(prev as EditableAccount),
                    phone: e.target.value
                  }))} />
                  {editingErrors.phone && <div className="text-red-500 text-xs">{editingErrors.phone}</div>}
                </div>
                <div>
                  <label className="text-xs">Vai trò</label>
                  <select className="w-full border rounded px-2 py-2" value={editing.role ?? ''} onChange={e => setEditing(prev => ({ ...(prev as EditableAccount), role: e.target.value }))}>
                    <option value="">Chọn vai trò</option>
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="border-t pt-3 mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold">Đổi mật khẩu (ADMIN)</label>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span>Yêu cầu role ADMIN</span>
                      <button
                        type="button"
                        className="text-emerald-600 font-semibold flex items-center gap-1"
                        onClick={() => setShowPassword(v => !v)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />} {showPassword ? 'Ẩn' : 'Hiển thị'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Password requirements */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800 space-y-1">
                    <div className="font-semibold mb-1">Yêu cầu mật khẩu:</div>
                    <div className="flex items-center gap-2">
                      <span className={passwordInput.newPassword.length >= 6 ? 'text-green-600' : 'text-gray-400'}>✓</span>
                      <span>Tối thiểu 8 ký tự</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={/[A-Z]/.test(passwordInput.newPassword) ? 'text-green-600' : 'text-gray-400'}>✓</span>
                      <span>Ít nhất 1 chữ hoa (A-Z)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={/[0-9]/.test(passwordInput.newPassword) ? 'text-green-600' : 'text-gray-400'}>✓</span>
                      <span>Ít nhất 1 chữ số (0-9)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordInput.newPassword) ? 'text-green-600' : 'text-gray-400'}>✓</span>
                      <span>Ít nhất 1 ký tự đặc biệt (!@#$%...)</span>
                    </div>
                  </div>
                  
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu mới"
                    className="w-full border rounded px-3 py-2"
                    value={passwordInput.newPassword}
                    onChange={e => setPasswordInput(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full border rounded px-3 py-2"
                    value={passwordInput.confirm}
                    onChange={e => setPasswordInput(prev => ({ ...prev, confirm: e.target.value }))}
                  />
                  <div className="flex justify-end">
                    <button onClick={resetPassword} className="px-3 py-2 bg-emerald-600 text-white rounded flex items-center gap-2">
                      <FaLock /> Đổi mật khẩu
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={closeEdit} className="px-3 py-2 bg-gray-200 rounded">Hủy</button>
                  <button onClick={saveEditing} className="px-3 py-2 bg-indigo-600 text-white rounded flex items-center gap-2"><FaLock /> Lưu</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Map a raw user object returned by UserAPI.getUserById (or list) into local Account shape
function mapUserToAccount(uu: Record<string, unknown>): Account {
  const profile = uu['profile'] as Record<string, unknown> | undefined;
  const enabled = !!uu['enabled'];
  const roleFromEntity = (uu['roleEntity'] && (uu['roleEntity'] as Record<string, unknown>)['name']) ? String((uu['roleEntity'] as Record<string, unknown>)['name']) : undefined;
  return {
    id: Number(uu['id'] ?? 0),
    name: String(uu['fullName'] ?? uu['username'] ?? uu['email'] ?? ''),
    email: String(uu['email'] ?? ''),
    phone: (profile && profile['phone']) ? String(profile['phone']) : (uu['phone'] ? String(uu['phone']) : undefined),
    address: profile && profile['address'] ? String(profile['address']) : undefined,
    role: roleFromEntity ?? String(uu['role'] ?? 'user'),
    status: enabled ? 'ACTIVATE' : 'DEACTIVATED',
    enabled,
    profileId: profile && typeof profile['id'] === 'number' ? (profile['id'] as number) : undefined,
    createdAt: String(uu['createdAt'] ?? new Date().toISOString()),
    avatar: String(uu['avatarUrl'] ?? (profile && profile['avatarUrl']) ?? '') || undefined
  } as Account;
}