import { useState, useEffect } from 'react';
import {
    Box, Grid, Paper, Typography, TextField, FormControlLabel, Checkbox, Button,
    RadioGroup, Radio, FormControl, InputLabel, Select, MenuItem, ToggleButton, ToggleButtonGroup, Stack, Chip
} from "@mui/material";

import { grey } from '@mui/material/colors';
import { customerSources, Referrer } from '@/data/data';
import { UserAPI } from '@/services/user';
import type { ApiResponse } from '@/services/user';
import { BranchAPI } from '@/services/branches';
import type { Branch } from '@/services/branches';
import { getOccupations, getNationalities, getCustomerGroups } from '@/services/lookups';
import { toast, ToastContainer } from 'react-toastify';
import { ReferrerSearchSection } from '@/components/customer/ReferrerSearchSection';
import { AppointmentScheduler } from '@/components/customer/AppointmentScheduler';
import { AppointmentAPI } from '@/services/appointments';
import type { CreateAppointmentPayload } from '@/services/appointments';


const inputStyles = { '& .MuiFilledInput-root': { border: '1px solid transparent', borderRadius: '8px', backgroundColor: grey[100], '&:hover': { backgroundColor: grey[200] }, '&.Mui-focused': { backgroundColor: 'white', borderColor: 'primary.main' }, '&::before, &::after': { display: 'none' } }, '& .MuiInputLabel-root': { '&.Mui-focused': { color: 'primary.main' } } };

export function CustomerFormPage() {
    const [showScheduler, setShowScheduler] = useState(false);
    const [customerSource, setCustomerSource] = useState('');
    const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    // inline validation errors
    const [fullNameError, setFullNameError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<string>('');
    const [sourceDetail, setSourceDetail] = useState('');
    const [address, setAddress] = useState('');
    const [isReturning, setIsReturning] = useState(false);
    const [province, setProvince] = useState('');
    const [district, setDistrict] = useState('');
    const [ward, setWard] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    const [saving, setSaving] = useState(false);
    const [occupations, setOccupations] = useState<{ id: number; name: string }[]>([]);
    const [nationalities, setNationalities] = useState<{ id: number; name: string }[]>([]);
    const [customerGroups, setCustomerGroups] = useState<{ id: number; name: string }[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    const [occupationId, setOccupationId] = useState<number | ''>('');
    const [nationalityId, setNationalityId] = useState<number | ''>('');
    const [customerGroupIds, setCustomerGroupIds] = useState<number[]>([]);
    const [branchId, setBranchId] = useState<number | ''>('');

    const handleReferrerSelect = (referrer: Referrer | null) => {
        setSelectedReferrer(referrer);
    };

    const [schedulerPayload, setSchedulerPayload] = useState<Record<string, unknown> | null>(null);

    // validation helpers
    // phone must start with 0 and contain only digits (exactly 10 digits)
    const phoneRegex = /^0\d{9}$/;
    // name: only letters and spaces (use Unicode property, fallback used in validateName)
    const nameRegexUnicodeSafe = (() => { try { return new RegExp('^[\\p{L}\\s]+$','u'); } catch { return null; } })();
    const isAtLeastAge = (dateStr: string, age: number) => {
        if (!dateStr) return false;
        const bd = new Date(dateStr);
        if (Number.isNaN(bd.getTime())) return false;
        const today = new Date();
        let years = today.getFullYear() - bd.getFullYear();
        const m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) years--;
        return years >= age;
    };

    // fetch lookups on mount
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [occ, nat, grp] = await Promise.all([
                    getOccupations(),
                    getNationalities(),
                    getCustomerGroups(),
                ]);
                // fetch branches separately (BranchAPI returns { success, message, data })
                const branchesRes = await BranchAPI.getBranches();
                if (!mounted) return;
                setOccupations(occ || []);
                setNationalities(nat || []);
                setCustomerGroups(grp || []);
                if (!branchesRes || !branchesRes.success) {
                    // notify user that branches couldn't be loaded
                    toast.warn(branchesRes?.message || 'Không tải được danh sách chi nhánh');
                    setBranches(Array.isArray(branchesRes?.data) ? branchesRes.data : []);
                } else {
                    setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
                }
            } catch (e) {
                // notify user about lookup load failure
                console.warn('Failed to load lookups', e);
                toast.error('Lỗi khi tải dữ liệu phụ trợ');
            }
        })();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="p-4 bg-white rounded-xl">
            <ToastContainer />
            <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
                Hồ sơ khách hàng
            </Typography>

            <Paper elevation={0} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6">Thông tin cá nhân</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <ToggleButtonGroup value="general" exclusive>
                            <ToggleButton value="general" sx={{ textTransform: 'none' }}>Thông tin chung</ToggleButton>   
                        </ToggleButtonGroup>
                    </Stack>
                </Stack>
                
                <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                        <Stack spacing={2}>
                            <Box sx={{ width: '100%', height: 160, bgcolor: grey[200], borderRadius: 2 }} />
                            <Button variant="text" size="small">Hướng dẫn</Button>
                            <TextField fullWidth label="Nguồn khách hàng" value={customerSource} onChange={(e) => setCustomerSource(e.target.value)} select variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }}>
                                {customerSources.map((option) => (<MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>))}
                            </TextField>
                                    <TextField fullWidth label="Nguồn chi tiết" value={sourceDetail} onChange={(e) => setSourceDetail(e.target.value)} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }}/>
                                    <TextField fullWidth label="Địa chỉ" value={address} onChange={(e) => setAddress(e.target.value)} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }}/>
                                    <FormControlLabel control={<Checkbox checked={isReturning} onChange={(e) => setIsReturning(e.target.checked)} />} label="Khách cũ / Quay lại" />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={9}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}><FormControl><RadioGroup row value={gender} onChange={(e) => setGender(e.target.value)}><FormControlLabel value="male" control={<Radio />} label="Nam" /><FormControlLabel value="female" control={<Radio />} label="Nữ" /><FormControlLabel value="other" control={<Radio />} label="Khác" /></RadioGroup></FormControl></Grid>
                            <Grid item xs={12} md={4}><FormControlLabel control={<Checkbox checked={showScheduler} onChange={(e) => setShowScheduler(e.target.checked)}/>} label="Tạo lịch hẹn"/></Grid>
                            <Grid item xs={12} md={4}><TextField type="date" fullWidth label="Ngày sinh" placeholder="yyyy-mm-dd" variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></Grid>
                            <Grid item xs={12} md={4}><TextField
                                fullWidth
                                label="Họ và tên"
                                variant="filled"
                                sx={inputStyles}
                                InputLabelProps={{ shrink: true }}
                                value={fullName}
                                onChange={(e) => { setFullName(e.target.value); if (fullNameError) setFullNameError(null); }}
                                onBlur={() => {
                                    // validate name: no special characters
                                    const val = fullName.trim();
                                    if (!val) { setFullNameError('Vui lòng nhập họ và tên'); return; }
                                    try {
                                        if (nameRegexUnicodeSafe) {
                                            if (!nameRegexUnicodeSafe.test(val)) setFullNameError('Tên không được chứa ký tự đặc biệt và số ');
                                            else setFullNameError(null);
                                        } else {
                                            const fallback = /^[A-Za-z\s.-]+$/;
                                            if (!fallback.test(val)) setFullNameError('Tên không được chứa ký tự đặc biệt');
                                            else setFullNameError(null);
                                        }
                                    } catch {
                                        setFullNameError(null);
                                    }
                                }}
                                error={!!fullNameError}
                                helperText={fullNameError || ''}
                            /></Grid>
                            <Grid item xs={12} md={4}><TextField
                                fullWidth
                                label="Số điện thoại"
                                required
                                variant="filled"
                                sx={inputStyles}
                                InputLabelProps={{ shrink: true }}
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(null); }}
                                onBlur={() => {
                                    const val = phone.trim();
                                    if (!val) { setPhoneError(null); return; }
                                    if (!phoneRegex.test(val)) setPhoneError('Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số');
                                    else setPhoneError(null);
                                }}
                                error={!!phoneError}
                                helperText={phoneError || ''}
                            /></Grid>
                            <Grid item xs={12} md={4}><TextField
                                fullWidth
                                label="Email"
                                variant="filled"
                                sx={inputStyles}
                                InputLabelProps={{ shrink: true }}
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
                                onBlur={() => {
                                    const val = email.trim();
                                    if (!val) { setEmailError(null); return; }
                                    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(val)) setEmailError('Email phải không hợp lệ');
                                    else setEmailError(null);
                                }}
                                error={!!emailError}
                                helperText={emailError || ''}
                            /></Grid>
                            <Grid item xs={12} md={4}><TextField fullWidth label="Người liên hệ khẩn cấp" variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} /></Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth variant="filled" sx={inputStyles}>
                                    <InputLabel shrink>Chi nhánh</InputLabel>
                                    <Select
                                        displayEmpty
                                        value={branchId}
                                        onChange={(e) => setBranchId(e.target.value as number | '')}
                                    >
                                        <MenuItem value=""><em>chọn chi nhánh</em></MenuItem>
                                        {branches.map(b => (
                                            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth variant="filled" sx={inputStyles}>
                                    <InputLabel shrink>Nhóm khách hàng</InputLabel>
                                    <Select
                                        multiple
                                        displayEmpty
                                        value={customerGroupIds}
                                        onChange={(e) => {
                                            const val = e.target.value as unknown;
                                            if (Array.isArray(val)) setCustomerGroupIds(val.map(v => Number(v)));
                                            else setCustomerGroupIds(String(val).split(',').map(s => Number(s)).filter(n => !isNaN(n)));
                                        }}
                                        renderValue={(selected) => {
                                            if (!Array.isArray(selected) || selected.length === 0) return <em>chọn nhóm</em>;
                                            const ids = selected as number[];
                                            return (
                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {ids.map(id => {
                                                        const name = customerGroups.find(g => g.id === id)?.name || String(id);
                                                        return <Chip key={id} label={name} size="small" />;
                                                    })}
                                                </Box>
                                            );
                                        }}
                                    >
                                        {customerGroups.map(g => (
                                            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth variant="filled" sx={inputStyles}>
                                    <InputLabel shrink>Quốc tịch</InputLabel>
                                    <Select value={nationalityId} displayEmpty onChange={(e) => setNationalityId(e.target.value as number)}>
                                        <MenuItem value=""><em>chọn quốc tịch</em></MenuItem>
                                        {nationalities.map(n => <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth variant="filled" sx={inputStyles}>
                                    <InputLabel shrink>Nghề nghiệp</InputLabel>
                                    <Select value={occupationId} displayEmpty onChange={(e) => setOccupationId(e.target.value as number | '')}>
                                        <MenuItem value=""><em>chọn nghề nghiệp</em></MenuItem>
                                        {occupations.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}><TextField fullWidth label="Tỉnh/Thành phố" value={province} onChange={(e) => setProvince(e.target.value)} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} md={4}><TextField fullWidth label="Quận huyện" value={district} onChange={(e) => setDistrict(e.target.value)} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} md={4}><TextField fullWidth label="Phường xã" value={ward} onChange={(e) => setWard(e.target.value)} variant="filled" sx={inputStyles} InputLabelProps={{ shrink: true }} /></Grid>
                        </Grid>
                    </Grid>
                </Grid>

                {customerSource === 'referral' && (
                    <>
                        <TextField
                            fullWidth
                            label="Người giới thiệu đã chọn"
                            value={selectedReferrer ? `${selectedReferrer.name} - ${selectedReferrer.code}` : 'Chưa chọn'}
                            variant="filled"
                            sx={{ ...inputStyles, mt: 3, bgcolor: grey[200] }}
                            InputLabelProps={{ shrink: true }}
                            disabled
                        />
                        <ReferrerSearchSection onReferrerSelect={handleReferrerSelect} />
                    </>
                )}

                {showScheduler && <AppointmentScheduler onChange={(p) => setSchedulerPayload(p ? p as Record<string, unknown> : null)} />}

                <Box sx={{ mt: 3, borderTop: `1px solid ${grey[200]}`, pt: 2 }}>
                    <FormControlLabel control={<Checkbox defaultChecked />} label="Quý khách đồng ý cho Chúng tôi sử dụng Số điện thoại, Email liên lạc để phục vụ việc điều trị, nhắc hẹn kiểm tra định kỳ và thông báo các ưu đãi." sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button variant="outlined" sx={{ textTransform: 'none', borderRadius: '8px' }}>Đóng</Button>
                        <Button variant="contained" disableElevation sx={{ textTransform: 'none', borderRadius: '8px' }} disabled={saving} onClick={async () => {
                            // minimal validation
                            if (!fullName.trim()) { toast.error('Vui lòng nhập họ và tên'); return; }
                            // validate name (no special chars)
                            try {
                                if (nameRegexUnicodeSafe) {
                                    if (!nameRegexUnicodeSafe.test(fullName.trim())) { toast.error('Tên không được chứa ký tự đặc biệt'); return; }
                                } else {
                                    const fallback = /^[A-Za-z\s.-]+$/;
                                    if (!fallback.test(fullName.trim())) { toast.error('Tên không được chứa ký tự đặc biệt'); return; }
                                }
                            } catch {
                                // ignore and continue
                            }

                            if (!phone.trim() && !email.trim()) { toast.error('Vui lòng nhập số điện thoại hoặc email'); return; }
                            // phone format: must start with 0 and contain only digits (we require exactly 10 digits)
                            if (phone.trim() && !phoneRegex.test(phone.trim())) {
                                toast.error('Số điện thoại không hợp lệ — phải bắt đầu bằng 0 và có 10 chữ số');
                                return;
                            }
                            // email must be @gmail.com when provided
                            if (email.trim() && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(email.trim())) {
                                toast.error('Email phải không hợp lệ');
                                return;
                            }
                            // birthdate: if provided, customer must be at least 18 years old
                            if (birthDate && !isAtLeastAge(birthDate, 18)) {
                                toast.error('Khách hàng phải đủ 18 tuổi');
                                return;
                            }
                            const payload: Record<string, unknown> = {
                                // authentication/profile fields (some can be omitted)
                                username: fullName.trim(),
                                role: 'CUSTOMER',
                                enabled: true,
                                emailVerified: Boolean(email.trim()),
                                password: "N123456!",

                                // basic contact/profile
                                fullName: fullName.trim(),
                                phone: phone.trim() || undefined,
                                email: email.trim() || undefined,
                                birthDate: birthDate || undefined,
                                gender: gender || undefined,
                                address: address || undefined,
                                emergencyContact: emergencyContact || undefined,

                                // source/branch/group lookups
                                sourceId: customerSource ? Number(customerSource) : undefined,
                                sourceDetail: sourceDetail || undefined,
                                branchId: (typeof branchId === 'number') ? branchId : undefined,
                                nationalityId: nationalityId || undefined,
                                occupationId: occupationId || undefined,
                                customerGroupIds: customerGroupIds.length ? customerGroupIds : undefined,

                                // location
                                province: province || undefined,
                                district: district || undefined,
                                ward: ward || undefined,

                                // other optional fields
                                isReturning: isReturning ? true : undefined,
                                referrerId: selectedReferrer ? selectedReferrer.id : undefined,
                            };
                            try {
                                setSaving(true);
                                const res = await UserAPI.createUserFull(payload) as ApiResponse;
                                if (res && res.success) {
                                    toast.success('Tạo khách hàng thành công');
                                    setFullName('');
                                    setPhone('');
                                    setEmail('');
                                    setBirthDate('');
                                    setGender('');
                                    setSourceDetail('');
                                    setAddress('');
                                    setIsReturning(false);
                                    setProvince('');
                                    setDistrict('');
                                    setWard('');
                                    setEmergencyContact('');
                                    setSelectedReferrer(null);
                                    setCustomerSource('');
                                    setOccupationId('');
                                    setNationalityId('');
                                    setCustomerGroupIds([]);
                                    setBranchId('');
                                    

                                    // if scheduler is shown and we have scheduler payload, create appointment
                                    if (showScheduler && schedulerPayload) {
                                        // extract created customer id from response (prefer res.data.id)
                                        const createdData = (res as ApiResponse & { data?: unknown })?.data;
                                        let customerId: number | undefined;
                                        if (createdData == null) {
                                            customerId = undefined;
                                        } else if (typeof createdData === 'number') {
                                            // some APIs return the id directly as number
                                            customerId = Number(createdData);
                                        } else if (typeof createdData === 'object') {
                                            // prefer explicit `id` field (matches your example response)
                                            const obj = createdData as Record<string, unknown>;
                                            if (obj['id'] != null) customerId = Number(obj['id'] as unknown as number);
                                            else if (obj['userId'] != null) customerId = Number(obj['userId'] as unknown as number);
                                            else if (obj['customerId'] != null) customerId = Number(obj['customerId'] as unknown as number);
                                            else customerId = undefined;
                                        }
                                        if (customerId && customerId > 0) {
                                            const dentistRef = Number(schedulerPayload['dentistRefId']);
                                            const assistant = Number(schedulerPayload['assistantId']);
                                            const service = Number(schedulerPayload['serviceId']);
                                            const scheduledTime = schedulerPayload['scheduledTime'] ? String(schedulerPayload['scheduledTime']) : undefined;
                                            if (!Number.isFinite(dentistRef) || !Number.isFinite(service) || !scheduledTime) {
                                                toast.warn('Dữ liệu lịch hẹn không hợp lệ — bỏ qua tạo lịch');
                                            } else {
                                                const apptPayload: CreateAppointmentPayload = {
                                                    customerId,
                                                    dentistRefId: dentistRef,
                                                    assistantId: Number.isFinite(assistant) ? assistant : undefined,
                                                    serviceId: service,
                                                    estimatedMinutes: schedulerPayload['estimatedMinutes'] ? Number(schedulerPayload['estimatedMinutes']) : 30,
                                                    scheduledTime: scheduledTime,
                                                    notes: schedulerPayload['notes'] ? String(schedulerPayload['notes']) : undefined,
                                                    branchId: (typeof branchId === 'number') ? branchId : undefined,
                                                };
                                                try {
                                                    const apptRes = await AppointmentAPI.create(apptPayload);
                                                    if (apptRes && apptRes.success) {
                                                        toast.success('Tạo lịch hẹn thành công');
                                                    } else {
                                                        toast.error(apptRes?.message || 'Tạo lịch hẹn thất bại');
                                                    }
                                                } catch (aErr) {
                                                    toast.error((aErr as Error)?.message || 'Lỗi khi tạo lịch hẹn');
                                                }
                                            }
                                        } else {
                                            toast.warn('Không xác định được ID khách hàng đã tạo để tạo lịch');
                                        }
                                    }
                                } else {
                                    toast.error(res?.message || 'Tạo khách hàng thất bại');
                                }
                            } catch (err) {
                                toast.error((err as Error)?.message || 'Lỗi khi tạo khách hàng');
                            } finally {
                                setSaving(false);
                            }
                        }}>Lưu</Button>
                    </Box>
                </Box>
            </Paper>
        </div>
    );
}