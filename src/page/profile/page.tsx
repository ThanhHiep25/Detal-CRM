'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { motion } from "framer-motion";
import { LoaderCircle, Undo2, Edit2, Trash2 } from 'lucide-react';
import { UserAPI, UserMe, UserProfile, AppointmentHistory, Service, Dentist, ApiResponse } from '@/services/user';

const ProfilePage: React.FC = () => {
    const [userMe, setUserMe] = useState<UserMe | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [appointments, setAppointments] = useState<AppointmentHistory[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [formData, setFormData] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string>('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // New states for appointment editing
    const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
    const [appointmentEditData, setAppointmentEditData] = useState<{
        scheduledTime?: string;
        notes?: string;
        serviceId?: number | null;
        dentistId?: number | null;
    } | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [dentists, setDentists] = useState<Dentist[]>([]);
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    // Sorting state for appointment history
    const [sortBy, setSortBy] = useState<'date' | 'dentist' | 'service' | null>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const sortedAppointments = useMemo(() => {
        const getDentistName = (rec: AppointmentHistory) =>
            (rec.dentistName ?? rec.dentistUsername ?? (dentists.find(d => d.id === rec.dentistId)?.name) ?? '').toLowerCase();
        const getServiceName = (rec: AppointmentHistory) =>
            (rec.serviceName ?? rec.service?.name ?? (services.find(s => s.id === rec.serviceId)?.name) ?? '').toLowerCase();

        const copy = [...appointments];
        copy.sort((a, b) => {
            if (sortBy === 'dentist') {
                const A = getDentistName(a);
                const B = getDentistName(b);
                if (A < B) return sortDir === 'asc' ? -1 : 1;
                if (A > B) return sortDir === 'asc' ? 1 : -1;
                return 0;
            }
            if (sortBy === 'service') {
                const A = getServiceName(a);
                const B = getServiceName(b);
                if (A < B) return sortDir === 'asc' ? -1 : 1;
                if (A > B) return sortDir === 'asc' ? 1 : -1;
                return 0;
            }
            // default: date
            const da = new Date(a.scheduledTime).getTime();
            const db = new Date(b.scheduledTime).getTime();
            return sortDir === 'asc' ? da - db : db - da;
        });
        return copy;
    }, [appointments, sortBy, sortDir, dentists, services]);

    // UI helpers
    const renderStatusBadge = (status?: string) => {
        const map: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            CONFIRMED: 'bg-blue-100 text-blue-800',
            COMPLETED: 'bg-green-100 text-green-800',
            CANCELLED: 'bg-red-100 text-red-800',
        };
        const cls = (status && map[status]) || 'bg-gray-100 text-gray-800';
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
                {status}
            </span>
        );
    };

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [meRes, profileRes, historyRes] = await Promise.all([
                    UserAPI.me(),
                    UserAPI.getProfile(),
                    UserAPI.getAppointmentHistory()
                ]);
                if (!meRes.success || !profileRes.success || !historyRes.success) {
                    setError('Không thể tải dữ liệu người dùng.');
                    setIsLoading(false);
                    return;
                }
                setUserMe(meRes.data);
                setProfile(profileRes.data as UserProfile);
                setFormData(profileRes.data as UserProfile);
                setAppointments(historyRes.data as AppointmentHistory[]);
            } catch (err) {
                console.error(err);
                setError('Lỗi khi tải dữ liệu người dùng.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    // Helpers to fetch services and dentists when needed
    const fetchServicesAndDentists = async () => {
        try {
            const [svcRes, dRes] = await Promise.all([UserAPI.getServices(), UserAPI.getDentists()]);
            if (svcRes.success) setServices(svcRes.data);
            if (dRes.success) setDentists(dRes.data);
        } catch (e) {
            console.error('Failed to load services or dentists', e);
        }
    };

    const openAppointmentEditor = async (record: AppointmentHistory) => {
        // allow editing only when appointment is PENDING
        if (record.status !== 'PENDING') return;
        await fetchServicesAndDentists();
        setEditingAppointmentId(record.id);
        // convert ISO to datetime-local value
        const toLocalInput = (iso?: string) => {
            if (!iso) return '';
            const d = new Date(iso);
            const tzOffset = d.getTimezoneOffset() * 60000; // offset in ms
            const local = new Date(d.getTime() - tzOffset);
            return local.toISOString().slice(0, 16);
        };
            setAppointmentEditData({
                scheduledTime: toLocalInput(record.scheduledTime),
                notes: record.notes ?? record.note ?? '',
                serviceId: record.service?.id ?? record.serviceId ?? null,
                dentistId: record.dentistId ?? null,
            });
    };

    const closeAppointmentEditor = () => {
        setEditingAppointmentId(null);
        setAppointmentEditData(null);
    };

    const handleAppointmentFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!appointmentEditData) return;
        const { name, value } = e.target;
        setAppointmentEditData({ ...appointmentEditData, [name]: value });
    };

    const saveAppointmentChanges = async (id: number) => {
        if (!appointmentEditData) return;
        setActionLoading(true);
        setError('');
        try {
            // convert datetime-local back to ISO
            const scheduledLocal = appointmentEditData.scheduledTime;
            let scheduledIso: string | undefined = undefined;
            if (scheduledLocal) {
                // scheduledLocal is like '2025-09-15T10:00'
                const localDate = new Date(scheduledLocal);
                scheduledIso = localDate.toISOString();
            }

            const payload: Record<string, unknown> = {};
            if (scheduledIso) payload.scheduledTime = scheduledIso;
            if (appointmentEditData.notes !== undefined) payload.notes = appointmentEditData.notes;
            if (appointmentEditData.serviceId) payload.service = { id: Number(appointmentEditData.serviceId) };
            // dentist is read-only in UI; do not include dentistId in update payload to avoid accidental changes

            const res = await UserAPI.updateAppointment(id, payload);
            if (res.success) {
                // refresh appointment list (use current user id to avoid extra /me call)
                const historyRes = await UserAPI.getAppointmentHistory({ userId: userMe?.id });
                if (historyRes && historyRes.success) setAppointments(historyRes.data);
                closeAppointmentEditor();
            } else {
                setError(res.message || 'Cập nhật lịch hẹn thất bại.');
            }
        } catch (err) {
            console.error(err);
            setError('Lỗi khi cập nhật lịch hẹn.');
        } finally {
            setActionLoading(false);
        }
    };

    const cancelAppointment = async (id: number, status?: string) => {
        // Only allow cancelling when status is PENDING
        if (status && status !== 'PENDING') return;
        if (!confirm('Bạn có chắc muốn hủy lịch hẹn này?')) return;
        setActionLoading(true);
        setError('');
        try {
            const res = await UserAPI.cancelAppointment(id) as ApiResponse<unknown>;
            if (res && res.success) {
                // optimistic: remove from local list to reflect deletion immediately
                setAppointments(prev => prev.filter(a => a.id !== id));
                toast.success('Hủy lịch hẹn thành công');
            } else {
                const msg = (res && res.message) || 'Hủy lịch hẹn thất bại.';
                setError(msg);
                toast.error(msg);
            }
        } catch (err) {
            console.error(err);
            setError('Lỗi khi hủy lịch hẹn.');
            toast.error('Lỗi khi hủy lịch hẹn.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        // Reset form data to original profile data
        setFormData(profile);
        setFormErrors({});
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!formData) return;
        setIsLoading(true);
        setError('');
        // client-side validation
        const ok = validateForm(formData);
        if (!ok) {
            setIsLoading(false);
            setError('Vui lòng sửa các lỗi trong biểu mẫu trước khi lưu.');
            return;
        }
        try {
            const res = await UserAPI.updateProfile(formData);
            if (res.success) {
                setProfile(res.data);
                setFormData(res.data);
                setIsEditing(false);
            } else {
                setError(res.message || 'Cập nhật thông tin thất bại.');
            }
        } catch (err) {
            console.error(err);
            setError('Lỗi khi cập nhật thông tin.');
        } finally {
            setIsLoading(false);
        }
    };

    // Validation helpers
    const phoneRegex = /^(?:\+84|0)\d{9}$/; // +84xxxxxxxxx or 0xxxxxxxxx (10 digits)
    const validateForm = (data: UserProfile) => {
        const errs: Record<string, string> = {};
        // phone (optional but if present must match VN pattern)
        if (data.phone) {
            const cleaned = String(data.phone).trim();
            if (!phoneRegex.test(cleaned)) errs.phone = 'Số điện thoại không hợp lệ. Ví dụ: 0912345678 hoặc +84912345678';
        }
        // birthDate (optional but if present must be a valid date and reasonable age)
        if (data.birthDate) {
            const d = new Date(data.birthDate);
            if (Number.isNaN(d.getTime())) {
                errs.birthDate = 'Ngày sinh không hợp lệ.';
            } else {
                const age = new Date().getFullYear() - d.getFullYear();
                if (age < 0 || age > 120) errs.birthDate = 'Ngày sinh không hợp lệ.';
            }
        }
        // address (optional but reasonable length)
        if (data.address && String(data.address).trim().length > 0 && String(data.address).trim().length < 3) {
            errs.address = 'Địa chỉ quá ngắn.';
        }
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (formData) {
            setFormData({
                ...formData,
                [e.target.name]: e.target.value,
            });
        }
    };
    

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
                <LoaderCircle className="animate-spin text-blue-500" size={68} />
            </div>
        );
    }

    if (error || !userMe || !profile) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="text-xl font-semibold text-red-500">{error || 'Không tìm thấy dữ liệu người dùng.'}</div>
            </div>
        );
    }

    // Variants cho các animation
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.2 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const tableRowVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 sm:p-6 lg:p-8">
            <motion.button
                onClick={() => window.history.back()}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className='h-12 w-12 mb-6 bg-white shadow-lg rounded-xl flex items-center justify-center hover:shadow-xl hover:bg-purple-50 transition-all duration-300 border border-purple-100'>
                <Undo2 className="text-purple-600" size={24} />
            </motion.button>
            <motion.div
                className="max-w-6xl mx-auto space-y-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Thông tin cá nhân */}
                <motion.div
                    className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8 relative border border-purple-100"
                    variants={itemVariants}
                    whileHover={{ y: -4, shadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
                >
                    <div className="absolute top-6 right-6">
                        {isEditing ? (
                            <div className="flex gap-3">
                                <motion.button 
                                    onClick={handleSave} 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 cursor-pointer text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                                    Lưu
                                </motion.button>
                                <motion.button 
                                    onClick={handleCancelEdit} 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-gradient-to-r from-gray-400 to-gray-500 cursor-pointer text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                                    Hủy
                                </motion.button>
                            </div>
                        ) : (
                            <motion.button 
                                onClick={handleEdit} 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 cursor-pointer text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                                Chỉnh sửa
                            </motion.button>
                        )}
                    </div>
                    <div className="relative w-36 h-36 flex-shrink-0 flex flex-col gap-2 items-center justify-center">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="relative"
                        >
                            <motion.img
                                src={profile.avatarUrl || userMe.avatarUrl || '/images/default-avatar.jpg'}
                                alt="Ảnh đại diện"
                                style={{ width: '144px', height: '144px', objectFit: 'cover' }}
                                className="rounded-full border-4 border-gradient-to-br from-purple-400 to-pink-400 shadow-xl ring-4 ring-purple-100"
                            />
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
                        </motion.div>
                    </div>
                    <div className="text-center md:text-left flex-grow">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                                    <input type="text" name="address" value={formData?.address || ''} onChange={handleInputChange}
                                        className="text-md sm:text-lg text-gray-700 border-2 border-gray-200 w-full p-3 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50" placeholder="Nhập địa chỉ của bạn" />
                                    {formErrors.address && <div className="text-sm text-red-600 mt-1 flex items-center gap-1">⚠ {formErrors.address}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                                    <input type="text" name="phone" value={formData?.phone || ''} onChange={handleInputChange}
                                        className="text-md sm:text-lg text-gray-700 border-2 border-gray-200 w-full p-3 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50" placeholder="Nhập số điện thoại" />
                                    {formErrors.phone && <div className="text-sm text-red-600 mt-1 flex items-center gap-1">⚠ {formErrors.phone}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                                    <input type="date" name="birthDate" value={formData?.birthDate || ''} onChange={handleInputChange}
                                        className="text-md sm:text-lg text-gray-700 border-2 border-gray-200 w-full p-3 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50" placeholder="Ngày sinh" />
                                    {formErrors.birthDate && <div className="text-sm text-red-600 mt-1 flex items-center gap-1">⚠ {formErrors.birthDate}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                                    <div className="flex items-center gap-3">
                                        <motion.button 
                                            type="button" 
                                            aria-pressed={formData?.gender === 'male'} 
                                            title="Nam" 
                                            onClick={() => formData && setFormData({ ...formData, gender: 'male' })}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${formData?.gender === 'male' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'}`}>
                                            Nam
                                        </motion.button>
                                        <motion.button 
                                            type="button" 
                                            aria-pressed={formData?.gender === 'female'} 
                                            title="Nữ" 
                                            onClick={() => formData && setFormData({ ...formData, gender: 'female' })}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${formData?.gender === 'female' ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg' : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-pink-300'}`}>
                                            Nữ
                                        </motion.button>
                                        <motion.button 
                                            type="button" 
                                            aria-pressed={formData?.gender === 'other'} 
                                            title="Khác" 
                                            onClick={() => formData && setFormData({ ...formData, gender: 'other' })}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${formData?.gender === 'other' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300'}`}>
                                            Khác
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-center md:justify-start mb-4">
                                    <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        {/* Show full name if available, else username */}
                                        {userMe.fullName || userMe.username || 'Chưa cập nhật tên'}
                                    </h2>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-md sm:text-lg text-gray-700 flex items-center gap-3">
                                        <span className="font-semibold text-purple-600 min-w-[120px]">Email</span> 
                                        <span className="bg-purple-50 px-4 py-2 rounded-lg flex-1">{userMe.email || 'Chưa cập nhật'}</span>
                                    </p>
                                    <p className="text-md sm:text-lg text-gray-700 flex items-center gap-3">
                                        <span className="font-semibold text-blue-600 min-w-[120px]">Điện thoại</span> 
                                        <span className="bg-blue-50 px-4 py-2 rounded-lg flex-1">{profile.phone || userMe.phone || 'Chưa cập nhật'}</span>
                                    </p>
                                    <p className="text-md sm:text-lg text-gray-700 flex items-center gap-3">
                                        <span className="font-semibold text-green-600 min-w-[120px]">Địa chỉ</span> 
                                        <span className="bg-green-50 px-4 py-2 rounded-lg flex-1">{profile.address || userMe.address || 'Chưa cập nhật'}</span>
                                    </p>
                                    <p className="text-md sm:text-lg text-gray-700 flex items-center gap-3">
                                        <span className="font-semibold text-pink-600 min-w-[120px]">Ngày sinh</span> 
                                        <span className="bg-pink-50 px-4 py-2 rounded-lg flex-1">{profile.birthDate || userMe.birthDate || 'Chưa cập nhật'}</span>
                                    </p>
                                </div>
                                <p className="text-md sm:text-lg text-gray-700 flex items-center gap-3 mt-3">
                                    <span className="font-semibold text-gray-700 min-w-[120px]">Giới tính</span>
                                    {(() => {
                                        const g = (profile.gender || userMe.gender || '').toLowerCase();
                                        if (g === 'male' || g === 'nam') return (<span className="bg-blue-50 px-4 py-2 rounded-lg text-blue-600 font-medium">Nam</span>);
                                        if (g === 'female' || g === 'nữ' || g === 'nu') return (<span className="bg-pink-50 px-4 py-2 rounded-lg text-pink-600 font-medium">Nữ</span>);
                                        if (g === 'other' || g === 'khác') return (<span className="bg-purple-50 px-4 py-2 rounded-lg text-purple-700 font-medium">Khác</span>);
                                        return (<span className="bg-gray-50 px-4 py-2 rounded-lg text-gray-500">Chưa cập nhật</span>);
                                    })()}
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Thông tin bổ sung */}
                <motion.div
                    className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-10 border border-purple-100"
                    variants={itemVariants}
                    whileHover={{ y: -4 }}
                >
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8 pb-4 border-b-2 border-purple-200">
                        Thông Tin Bổ Sung
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <motion.div 
                            whileHover={{ scale: 1.05, y: -4 }}
                            className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl shadow-lg border border-blue-200">
                            <p className="font-semibold text-blue-600 mb-2">Ngày tạo tài khoản</p>
                            <p className="text-xl font-bold text-gray-800">{userMe.createdAt ? new Date(userMe.createdAt).toLocaleDateString('vi-VN') : '-'}</p>
                        </motion.div>
                        <motion.div 
                            whileHover={{ scale: 1.05, y: -4 }}
                            className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl shadow-lg border border-green-200">
                            <p className="font-semibold text-green-600 mb-2">Cập nhật gần nhất</p>
                            <p className="text-xl font-bold text-gray-800">{userMe.updatedAt ? new Date(userMe.updatedAt).toLocaleDateString('vi-VN') : '-'}</p>
                        </motion.div>
                        <motion.div 
                            whileHover={{ scale: 1.05, y: -4 }}
                            className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl shadow-lg border border-purple-200">
                            <p className="font-semibold text-purple-600 mb-2">Vai trò</p>
                            <p className="text-xl font-bold text-gray-800">{userMe.role || '-'}</p>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Lịch sử điều trị / lịch sử đặt hẹn */}
                <motion.div
                    className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-10 border border-purple-100"
                    variants={itemVariants}
                    whileHover={{ y: -4 }}
                >
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8 pb-4 border-b-2 border-purple-200">
                        Lịch Sử Đặt Hẹn
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-gray-200">
                        <table className="min-w-full table-auto">
                            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Ngày hẹn</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Ghi chú</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                                        <button onClick={() => {
                                            if (sortBy === 'dentist') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                                            else { setSortBy('dentist'); setSortDir('asc'); }
                                        }} className="flex items-center gap-2 hover:text-purple-900 transition-colors">
                                            Bác sĩ
                                            {sortBy === 'dentist' && (sortDir === 'asc' ? '▲' : '▼')}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Dịch vụ</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {sortedAppointments.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                                <span className="text-3xl text-gray-400">📭</span>
                                            </div>
                                            <span className="text-lg font-medium">Không có lịch sử đặt hẹn</span>
                                        </div>
                                    </td></tr>
                                ) : sortedAppointments.map((record) => (
                                    <React.Fragment key={record.id}>
                                        <motion.tr
                                            className="hover:bg-purple-50 transition-all duration-300 border-l-4 border-transparent hover:border-purple-400"
                                            variants={tableRowVariants}
                                            whileHover={{ scale: 1.01, backgroundColor: "rgba(243, 232, 255, 0.5)" }}
                                        >
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">
                                                <div className="font-medium">{new Date(record.scheduledTime).toLocaleString('vi-VN')}</div>
                                                <div className="text-sm text-gray-500">{record.serviceName ?? record.service?.name ?? ''}</div>
                                                <div className="text-sm text-gray-400">{record.branchName ?? ''}</div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">
                                                {renderStatusBadge(record.status)}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-gray-700">
                                                {/* Truncate long notes to avoid table overflow/scroll on hover */}
                                                {(() => {
                                                    const fullNote = String(record.note ?? record.notes ?? '');
                                                    return (
                                                        <div className="max-w-[220px] truncate" title={fullNote}>
                                                            {fullNote}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">
                                                {/* Prefer explicit dentistName, then username, then local dentists cache */}
                                                <span className="font-medium">{record.dentistName ?? record.dentistUsername ?? (dentists.find(d => d.id === record.dentistId)?.name) ?? ''}</span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">
                                                {/* Show service name prefer recorded serviceName, then nested service object, then local services cache */}
                                                <span className="font-medium">{record.serviceName ?? record.service?.name ?? (services.find(s => s.id === record.serviceId)?.name) ?? ''}</span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">
                                                <div className="flex gap-3 items-center">
                                                    {record.status === 'PENDING' ? (
                                                        <motion.button 
                                                            aria-label="Chỉnh sửa" 
                                                            title="Chỉnh sửa" 
                                                            onClick={() => openAppointmentEditor(record)} 
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="p-2.5 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all duration-200 border border-blue-200">
                                                            <Edit2 className="text-blue-600" size={18} />
                                                        </motion.button>
                                                    ) : (
                                                        <button aria-label="Chỉnh sửa" title="Chỉ có thể chỉnh sửa khi trạng thái PENDING" disabled className="p-2.5 bg-gray-50 rounded-xl cursor-not-allowed border border-gray-200 opacity-50">
                                                            <Edit2 className="text-gray-400" size={18} />
                                                        </button>
                                                    )}

                                                    {record.status === 'PENDING' ? (
                                                        <motion.button 
                                                            aria-label="Hủy" 
                                                            title="Hủy" 
                                                            onClick={() => cancelAppointment(record.id, record.status)} 
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="p-2.5 bg-red-50 rounded-xl hover:bg-red-100 transition-all duration-200 border border-red-200">
                                                            <Trash2 className="text-red-600" size={18} />
                                                        </motion.button>
                                                    ) : (
                                                        <button aria-label="Hủy" title="Chỉ có thể hủy khi trạng thái PENDING" disabled className="p-2.5 bg-gray-50 rounded-xl cursor-not-allowed border border-gray-200 opacity-50">
                                                            <Trash2 className="text-gray-400" size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>

                                        {editingAppointmentId === record.id && appointmentEditData && (
                                            <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                                                <td className="px-6 py-6" colSpan={6}>
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-700 mb-2 block">Ngày & giờ</label>
                                                            <input name="scheduledTime" type="datetime-local" value={appointmentEditData.scheduledTime || ''} onChange={handleAppointmentFieldChange}
                                                                className="w-full border-2 border-purple-200 rounded-xl p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-700 mb-2 block">Dịch vụ</label>
                                                            <select name="serviceId" value={appointmentEditData.serviceId ?? ''} onChange={handleAppointmentFieldChange}
                                                                className="w-full border-2 border-purple-200 rounded-xl p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all">
                                                                <option value="">(Giữ nguyên)</option>
                                                                {services.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.name} - {s.price}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-700 mb-2 block">Nha sĩ</label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    (appointmentEditData?.dentistId != null && dentists.find(d => d.id === Number(appointmentEditData.dentistId))?.name) || record.dentistUsername || ''
                                                                }
                                                                disabled
                                                                className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-50 cursor-not-allowed"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-700 mb-2 block">Ghi chú</label>
                                                            <input name="notes" type="text" value={appointmentEditData.notes || ''} onChange={handleAppointmentFieldChange}
                                                                className="w-full border-2 border-purple-200 rounded-xl p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-6 flex gap-3 justify-end">
                                                        <motion.button 
                                                            onClick={() => saveAppointmentChanges(record.id)} 
                                                            disabled={actionLoading} 
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
                                                            {actionLoading ? 'Đang lưu...' : 'Lưu'}
                                                        </motion.button>
                                                        <motion.button 
                                                            onClick={closeAppointmentEditor} 
                                                            disabled={actionLoading} 
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all disabled:opacity-50">
                                                            Hủy
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default ProfilePage;
