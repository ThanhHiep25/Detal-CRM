import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { grey } from '@mui/material/colors';
import { toast, ToastContainer } from 'react-toastify';
import { UserAPI, type UserListItem } from '../../services/user';
import { DepartmentAPI, type Department } from '../../services/departments';
import { BranchAPI, type Branch } from '../../services/branches';
import 'react-toastify/dist/ReactToastify.css';
import { DentistAPI } from '../../services/dentist';

// Component Icon Hướng dẫn
const GuideIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// Style chung cho các ô input để giống với thiết kế
const inputStyles = {
  '& .MuiFilledInput-root': {
    backgroundColor: grey[100],
    borderRadius: '8px',
    '&:hover': { backgroundColor: grey[200] },
    '&.Mui-focused': { backgroundColor: 'white' },
    '&::before, &::after': { display: 'none' },
  },
};

export function PersonalProfilePage() {
  const [allBranches, setAllBranches] = useState(false);
  // Các state dùng cho API thêm nhân viên (giữ tối thiểu những trường cần thiết)
  const [uid, setUid] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [specialization, setSpecialization] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);


  // load users for UID selection
  useEffect(() => {
    let mounted = true;
    setUsersLoading(true);
    UserAPI.getUsers()
      .then(res => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) setUsers(res.data);
        else setUsers([]);
      })
      .catch(() => { if (mounted) setUsers([]); })
      .finally(() => { if (mounted) setUsersLoading(false); });
    return () => { mounted = false; };
  }, []);

  // load departments for the "Bộ phận" select
  useEffect(() => {
    let mounted = true;
    setDepartmentsLoading(true);
    DepartmentAPI.getDepartments()
      .then(res => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) setDepartments(res.data);
        else setDepartments([]);
      })
      .catch(() => { if (mounted) setDepartments([]); })
      .finally(() => { if (mounted) setDepartmentsLoading(false); });
    return () => { mounted = false; };
  }, []);

  // load branches for the "Chi nhánh" select
  useEffect(() => {
    let mounted = true;
    setBranchesLoading(true);
    BranchAPI.getBranches()
      .then(res => {
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) setBranches(res.data);
        else setBranches([]);
      })
      .catch(() => { if (mounted) setBranches([]); })
      .finally(() => { if (mounted) setBranchesLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Add / remove branch helpers
  const handleAddBranch = async () => {
    const name = window.prompt('Tên chi nhánh mới:');
    if (!name) return;
    // try API create if available, otherwise fallback to local add
    try {
  const createFn = (BranchAPI as unknown as { createBranch?: (payload: { name: string }) => Promise<unknown> }).createBranch;
      if (typeof createFn === 'function') {
        const res = await createFn({ name });
        // runtime-check response shape
        const isApiResp = (x: unknown): x is { success: boolean; message?: string; data?: unknown } =>
          typeof x === 'object' && x !== null && 'success' in (x as Record<string, unknown>);
        if (isApiResp(res) && res.success && res.data) {
          const created = res.data as Branch;
          setBranches(prev => [...prev, created]);
          setSelectedBranches(prev => [...prev, String(created.id)]);
          toast.success('Thêm chi nhánh thành công');
          return;
        } else {
          const msg = isApiResp(res) ? res.message : undefined;
          toast.warn(msg || 'Không thêm được chi nhánh trên server, thêm cục bộ');
        }
      }
    } catch (err) {
      console.error(err);
      toast.warn('Lỗi khi tạo chi nhánh trên server, thêm cục bộ');
    }
    const maxId = branches.reduce((m, b) => Math.max(m, b.id), 0);
    const newBranch: Branch = { id: maxId + 1, name, code: '', address: '' };
    setBranches(prev => [...prev, newBranch]);
    setSelectedBranches(prev => [...prev, String(newBranch.id)]);
    toast.info('Chi nhánh đã được thêm tạm thời');
  };

  const handleRemoveBranch = (idStr: string) => {
    setSelectedBranches(prev => prev.filter(s => s !== idStr));
  };

  const regex = {
    uid: /^\d{1,8}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^0\d{9}$/ // phone must start with 0 and have exactly 10 digits
  };

  const validate = (): string | null => {
  
    if (!name.trim()) return 'Tên không được để trống';
    if (!email.trim()) return 'Email không được để trống';
    if (!regex.email.test(email)) return 'Email không đúng định dạng';
    if (!phone.trim()) return 'Số điện thoại không được để trống';
    if (!regex.phone.test(phone)) return 'SĐT phải bắt đầu bằng 0 và có đúng 10 chữ số';
    if (!specialization.trim()) return 'Chuyên môn không được để trống';
    if (!bio.trim()) return 'Mô tả không được để trống';
    return null;
  };

  const handleSave = async () => {
    console.debug('handleSave called', { uid, name, email, phone, selectedDepartment, selectedBranches, allBranches });
    const err = validate();
    if (err) { console.warn('validation failed:', err); toast.error(err); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        userId: Number(uid),
        specialization: specialization.trim(),
        email: email.trim(),
        phone: phone.trim(),
        active: true,
        bio: bio.trim(),
        departmentId: selectedDepartment ? Number(selectedDepartment) : undefined,
        // branchIds: if allBranches is checked send all branch ids, otherwise send selected branch as an array or empty array
        branchIds: allBranches
          ? branches.map(b => b.id)
          : (selectedBranches.length ? selectedBranches.map(s => Number(s)) : []),
      };
    console.debug('addDentist payload:', payload);
    const res = await DentistAPI.addDentist(payload);
    console.debug('addDentist response:', res);
      if (res.success) {
        toast.success('Thêm nhân viên thành công');
        // reset nhẹ các trường đã map sang API
        setUid('');
        setName('');
        setEmail('');
        setPhone('');
        setSelectedBranches([]);
        setSelectedDepartment('');
        setAllBranches(false);
      } else {
        // log full response for debugging
        console.error('addDentist failed response:', res);
        if (res.message === `User not found: ${uid}`) {
          toast.error('UID không tồn tại trong hệ thống');
        } else if (res.message === 'Access Denied') {
          toast.error('Bạn không có quyền thực hiện hành động này');
        } else {
          toast.error(res.message || 'Thêm nhân viên thất bại');
        }
      }
    } catch {
      console.error('addDentist threw an exception - check network/console for details');
      toast.error('Lỗi hệ thống hoặc mạng. Mở console để xem chi tiết.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setUid('');
    setName('');
    setEmail('');
    setPhone('');
    setSelectedBranches([]);
    setSelectedDepartment('');
    setAllBranches(false);
  };

  return (
    <div className="bg-white rounded-xl min-h-screen p-8">
      <Paper elevation={0} className="max-w-6xl mx-auto p-6 rounded-lg ">
        <ToastContainer />
        {/* Phần tiêu đề */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <Typography variant="h5" component="h1" className="font-bold text-gray-800">Hồ sơ cá nhân</Typography>
            <Typography variant="body2" className="text-gray-500">Thông tin nhân viên - Khi thay đổi giá trị cần đăng nhập lại để áp dụng</Typography>
          </div>
          <Button variant="outlined" sx={{ textTransform: 'none' }}>Thông tin chung</Button>
        </div>

        {/* Nội dung chính (Layout bằng Tailwind) */}
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Cột trái */}
          <div className="w-full md:w-1/4 flex flex-col items-center">
            <img src='/doctor.png' className="w-40 h-40 object-cover shadow rounded-xl mb-4"/>
            <a href="#" className="flex items-center text-sm text-blue-600 hover:underline">
              <GuideIcon />
              Hướng dẫn
            </a>
          </div>

          {/* Cột phải - Form (Components của MUI) */}
          <div className="w-full md:w-3/4">
            <Grid container spacing={2}>
              {/* Giới tính */}
              <Grid item xs={12}>
                <FormControl>
                  <RadioGroup row defaultValue="male">
                    <FormControlLabel value="male" control={<Radio />} label="Nam" />
                    <FormControlLabel value="female" control={<Radio />} label="Nữ" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* Lưới input */}
              <Grid item xs={12} md={4}>
                <TextField
                  id="name"
                  fullWidth
                  label="Nhân viên"
                  placeholder="eg. tên"
                  variant="filled"
                  sx={inputStyles}
                  InputLabelProps={{ shrink: true }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="filled" sx={inputStyles}>
                  <InputLabel shrink>Mã (User)</InputLabel>
                  <Select
                    displayEmpty
                    value={uid || ''}
                    onChange={(e) => setUid(String(e.target.value))}
                  >
                    <MenuItem value=""><em>{usersLoading ? 'Đang tải...' : 'Chọn người dùng'}</em></MenuItem>
                    {users.map(u => (
                      <MenuItem key={u.id} value={String(u.id)}>
                        {u.id} - {u.username} - {u.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth 
                label="Ngày sinh" 
                type="date" 
                placeholder="eg. dd-mm-yyyy" variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  id="phone"
                  fullWidth
                  label="Điện thoại (10 ký tự số)"
                  placeholder="eg. 0936944427"
                  variant="filled"
                  sx={inputStyles}
                  InputLabelProps={{ shrink: true }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  id="email"
                  fullWidth
                  label="Email"
                  type="email"
                  placeholder="eg. email"
                  variant="filled"
                  sx={inputStyles}
                  InputLabelProps={{ shrink: true }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  id="specialization"
                  fullWidth
                  label="Chuyên môn"
                  placeholder="eg. Chuyên môn"
                  variant="filled"
                  sx={inputStyles}
                  InputLabelProps={{ shrink: true }}
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  id="bio"
                  fullWidth
                  label="Mô tả (Bio)"
                  placeholder="Viết mô tả ngắn cho nhân viên"
                  variant="filled"
                  sx={inputStyles}
                  InputLabelProps={{ shrink: true }}
                  multiline
                  minRows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="filled" sx={inputStyles}>
                  <InputLabel shrink>Bộ phận</InputLabel>
                  <Select displayEmpty value={selectedDepartment} onChange={(e) => setSelectedDepartment(String(e.target.value))}>
                    <MenuItem value=""><em>{departmentsLoading ? 'Đang tải...' : 'chọn bộ phận'}</em></MenuItem>
                    {departments.map(d => (
                      <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Phần chi nhánh */}
              <Grid item xs={12}><FormControlLabel control={<Checkbox checked={allBranches} onChange={(e) => setAllBranches(e.target.checked)}/>} label="Tất cả chi nhánh"/></Grid>
              <Grid item xs={12}>
                <FormControl fullWidth variant="filled" sx={inputStyles} disabled={allBranches}>
                  <InputLabel shrink>Chi nhánh</InputLabel>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Select
                      multiple
                      displayEmpty
                      value={selectedBranches}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedBranches(typeof v === 'string' ? v.split(',') : v as string[]);
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(selected as string[]).map(id => {
                            const b = branches.find(x => String(x.id) === id);
                            return <Chip key={id} label={b?.name ?? id} onDelete={() => handleRemoveBranch(id)} />;
                          })}
                        </Box>
                      )}
                      sx={{ minWidth: 240 }}
                    >
                      {branchesLoading ? (
                        <MenuItem value=""><em>Đang tải...</em></MenuItem>
                      ) : (
                        branches.map(b => (
                          <MenuItem key={b.id} value={String(b.id)}>
                            <Checkbox checked={selectedBranches.indexOf(String(b.id)) > -1} />
                            {b.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>

                    <Button size="small" variant="outlined" onClick={handleAddBranch} sx={{ height: 40 }}>Thêm chi nhánh</Button>
                  </Box>
                </FormControl>
              </Grid>
            </Grid>
          </div>
        </div>
        
        {/* Nút bấm */}
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
          <Button onClick={handleReset} variant="outlined" sx={{ textTransform: 'none', borderRadius: '8px' }}>Reset</Button>
          <Button variant="contained" disableElevation sx={{ textTransform: 'none', borderRadius: '8px' }} onClick={handleSave} disabled={submitting}>Lưu</Button>
        </div>
      </Paper>
    </div>
  );
}