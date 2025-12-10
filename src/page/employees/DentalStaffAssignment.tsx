import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import { DentistAPI } from '@/services/dentist';
import { DentistAssignmentsAPI, DentistAssignment } from '@/services/dentistAssignments';
import { BranchAPI, Branch } from '@/services/branches';
import { ServiceAPI, ServiceItem } from '@/services/service';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import { CircularProgress } from '@mui/material';

interface Staff {
  id: number;
  name: string;
  specialty: string;
  active: boolean;
}

// Use canonical ServiceItem from services module

interface Assignment {
  id: number;
  staffId: number;
  serviceId: number;
  date: string; // ISO date (fallback)
  scheduleJson?: string | null;
  weekStart?: string | null;
  branchId?: number | null;
}

const mockStaff: Staff[] = [
  { id: 1, name: 'BS Nguyễn Văn A', specialty: 'Nha chu', active: true },
  { id: 2, name: 'BS Trần Thị B', specialty: 'Niềng răng', active: true },
  { id: 3, name: 'BS Lê Văn C', specialty: 'Cấy ghép', active: false },
];

// helper: format a Date as local YYYY-MM-DD (no UTC shift)
const formatDateLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const mockServices: ServiceItem[] = [
  { id: 1, name: 'Cạo vôi răng', price: 0, description: '', durationMinutes: 30 },
  { id: 2, name: 'Niềng răng', price: 0, description: '', durationMinutes: 60 },
  { id: 3, name: 'Trồng implant', price: 0, description: '', durationMinutes: 120 },
];

const mockAssignments: Assignment[] = [
  { id: 1, staffId: 1, serviceId: 1, date: '2025-09-12' },
  { id: 2, staffId: 2, serviceId: 2, date: '2025-09-13' },
];

const DentalStaffAssignment: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [editingDateObj, setEditingDateObj] = useState<Date | null>(null);

  // keep the Date object in sync when selectedDate (YYYY-MM-DD) changes
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) setSelectedDateObj(d);
      else setSelectedDateObj(null);
    } else {
      setSelectedDateObj(null);
    }
  }, [selectedDate]);
  const [filterStaff, setFilterStaff] = useState<string>('');
  const [filterService, setFilterService] = useState<string>('');
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [viewing, setViewing] = useState<Assignment | null>(null);
  // sync editing.date -> editingDateObj when modal opens/changes
  useEffect(() => {
    if (editing && editing.date) {
      const d = new Date(editing.date);
      if (!isNaN(d.getTime())) setEditingDateObj(d);
      else setEditingDateObj(null);
    } else {
      setEditingDateObj(null);
    }
  }, [editing]);
  // schedule editor state: map weekday -> shifts
  const [scheduleEditor, setScheduleEditor] = useState<Record<string, Array<{ start: string; end: string }>>>(() => ({}));
  const [scheduleErrors, setScheduleErrors] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [schedulePopoverAnchor, setSchedulePopoverAnchor] = useState<HTMLElement | null>(null);
  const [schedulePopoverAssignment, setSchedulePopoverAssignment] = useState<Assignment | null>(null);
  // pending deletes stored until undo window expires
  const pendingDeletedRef = React.useRef<Record<number, Assignment>>({});
  const pendingTimersRef = React.useRef<Record<number, number>>({});
  const toastIdMapRef = React.useRef<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(false);

  const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  const VN_WEEKDAY: Record<string, string> = {
    MONDAY: 'Thứ 2',
    TUESDAY: 'Thứ 3',
    WEDNESDAY: 'Thứ 4',
    THURSDAY: 'Thứ 5',
    FRIDAY: 'Thứ 6',
    SATURDAY: 'Thứ 7',
    SUNDAY: 'Chủ Nhật',
  };

  function computeWeekStartFromDate(dateStr?: string) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const mondayIndex = (day + 6) % 7; // Monday=0
    d.setDate(d.getDate() - mondayIndex);
    return formatDateLocal(d); // stay in local time, avoid UTC shift
  }

  function renderScheduleDetailed(json?: string | null, fallbackDate?: string) {
    if (json) {
      try {
        // normalize into a map for easy lookup and preserve WEEKDAYS order
        const arr = JSON.parse(json) as Array<{ day: string; shifts: Array<{ start: string; end: string }> }>;
        if (!Array.isArray(arr) || arr.length === 0) return <div>{fallbackDate || '-'}</div>;
        const map: Record<string, Array<{ start: string; end: string }>> = {};
        for (const it of arr) map[it.day] = it.shifts || [];
        // If a fallbackDate looks like a weekStart (YYYY-MM-DD), compute actual dates for each weekday
        const baseIso = fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate) ? fallbackDate : null;
        const baseDate = baseIso ? new Date(baseIso + 'T00:00:00') : null;
        const weekdayIndexMap: Record<string, number> = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4, SATURDAY: 5, SUNDAY: 6 };

        return (
          <div className="space-y-2">
            {WEEKDAYS.map(day => {
              const shifts = map[day] || [];
              // compute human-friendly date label (e.g. "01/09/2025") when baseDate present
              let dateLabel = '';
              let highlight = false;
              if (baseDate) {
                const offset = weekdayIndexMap[day] ?? 0;
                const d = new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000);
                try {
                  dateLabel = d.toLocaleDateString('vi-VN');
                } catch {
                  dateLabel = d.toISOString().slice(0, 10);
                }
                // highlight the weekday that corresponds to the weekStart anchor (offset 0)
                highlight = offset === 0;
              }

              return (
                <div key={day} className="flex gap-3 items-start">
                  <div className="w-48 text-sm">
                    <span className={`font-medium ${highlight ? 'text-indigo-700' : 'text-gray-800'}`}>{VN_WEEKDAY[day] ?? day}{dateLabel ? ` (${dateLabel})` : ''}:</span>
                  </div>
                  <div className="flex-1">
                    {shifts.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {shifts.map((s, i) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded px-2 py-1 shadow-sm">
                            <div>
                              <div className="text-sm font-medium">{s.start} - {s.end}</div>
                              <div className="text-xs text-gray-500">{computeDurationLabel(s.start, s.end)}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Tooltip title="Sao chép ca này" placement="top"><IconButton size="small" onClick={() => { const text = `${VN_WEEKDAY[day] ?? day}${dateLabel ? ` (${dateLabel})` : ''}: ${s.start} - ${s.end}`; navigator.clipboard?.writeText(text).then(() => toast.success('Đã sao chép ca')); }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Không có ca</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      } catch {
        return <div>{fallbackDate || '-'}</div>;
      }
    }
    // no schedule JSON: show fallback date or placeholder
    return <div>{fallbackDate || '-'}</div>;
  }

  function parseScheduleJson(json?: string | null) {
    if (!json) return {} as Record<string, Array<{ start: string; end: string }>>;
    try {
      const arr = JSON.parse(json) as Array<{ day: string; shifts: Array<{ start: string; end: string }> }>;
      const out: Record<string, Array<{ start: string; end: string }>> = {};
      for (const item of arr) {
        out[item.day] = item.shifts || [];
      }
      return out;
    } catch {
      return {} as Record<string, Array<{ start: string; end: string }>>;
    }
  }

  function serializeSchedule(schedule: Record<string, Array<{ start: string; end: string }>>) {
    const arr: Array<{ day: string; shifts: Array<{ start: string; end: string }> }> = [];
    for (const day of WEEKDAYS) {
      const shifts = schedule[day];
      if (Array.isArray(shifts) && shifts.length > 0) {
        arr.push({ day, shifts: shifts.map(s => ({ start: s.start, end: s.end })) });
      }
    }
    if (arr.length === 0) return null;
    return JSON.stringify(arr);
  }

  useEffect(() => {
    // load dentists and assignments from API; fall back to mocks on failure
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const [dentRes, assignRes, svcRes] = await Promise.all([DentistAPI.getDentists(), DentistAssignmentsAPI.getAssignments(), ServiceAPI.getServices()]);
        if (!mounted) return;

        if (dentRes.success && Array.isArray(dentRes.data) && dentRes.data.length > 0) {
          const s = dentRes.data.map(d => ({ id: d.id, name: d.name, specialty: d.specialization, active: d.active } as Staff));
          setStaff(s);
        } else {
          setStaff(mockStaff);
        }

        // services: use ServiceAPI if available, else fallback to mockServices
        setServicesLoading(true);
        try {
          if (svcRes && svcRes.success && Array.isArray(svcRes.data)) {
            setServices(svcRes.data as ServiceItem[]);
          } else {
            setServices(mockServices);
          }
        } catch {
          setServices(mockServices);
        } finally {
          setServicesLoading(false);
        }

        // load branches too
        try {
          const bRes = await BranchAPI.getBranches();
          if (bRes && bRes.success && Array.isArray(bRes.data)) setBranches(bRes.data);
        } catch {
          setBranches([]);
        } finally {
          setLoading(false);
        }

        if (assignRes.success && Array.isArray(assignRes.data)) {
          const mapped: Assignment[] = assignRes.data.map((a: DentistAssignment) => ({
            id: a.id,
            staffId: a.dentistId ?? 0,
            serviceId: a.serviceId ?? 0,
            // try to infer a date from createdAt; otherwise empty
            date: a.createdAt ? a.createdAt.slice(0, 10) : '',
            scheduleJson: a.scheduleJson ?? null,
            weekStart: a.weekStart ?? (a.createdAt ? a.createdAt.slice(0, 10) : null),
            branchId: a.branchId ?? null
          }));
          setAssignments(mapped);
        } else {
          // convert mockAssignments to include empty scheduleJson
          const mappedMocks = mockAssignments.map(m => ({ ...m, scheduleJson: null, branchId: null, weekStart: m.date }));
          setAssignments(mappedMocks);
        }
      } catch (err) {
        console.warn('Failed to load remote data, falling back to mocks', err);
        setStaff(mockStaff);
        setServices(mockServices);
        setAssignments(mockAssignments);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const addAssignment = () => {
    if (!editing?.staffId || !editing?.serviceId || !editing?.date) {
      toast.error('Vui lòng chọn đầy đủ thông tin');
      return;
    }
    // validate scheduleEditor
    const serialized = serializeSchedule(scheduleEditor);
    if (!serialized) {
      setScheduleErrors('Vui lòng cấu hình ít nhất một ca hợp lệ');
      return;
    }
    setScheduleErrors(null);

    const payload = {
      dentistId: editing.staffId,
      serviceId: editing.serviceId || null,
      branchId: editing.branchId || null,
      scheduleJson: serialized,
      notes: '',
      weekStart: computeWeekStartFromDate(editing.date) // include weekStart for API
    };

    (async () => {
      try {
        const res = await DentistAssignmentsAPI.createAssignment(payload);
        if (res.success && res.data) {
          const created = res.data;
          setAssignments(prev => [...prev, { id: created.id, staffId: created.dentistId ?? editing.staffId, serviceId: created.serviceId ?? editing.serviceId, date: editing.date, scheduleJson: created.scheduleJson ?? serialized, weekStart: created.weekStart ?? computeWeekStartFromDate(editing.date), branchId: created.branchId ?? editing.branchId ?? null }]);
          toast.success('Đã phân công thành công');
        } else {
          // fallback to local-only
          setAssignments(prev => [...prev, { ...editing, id: Date.now(), scheduleJson: serialized, weekStart: computeWeekStartFromDate(editing.date), branchId: editing.branchId ?? null }]);
          toast.warn(res.message || 'Tạo phân công thất bại trên server; đã lưu local');
        }
      } catch (err) {
        console.error('Create assignment failed', err);
        setAssignments(prev => [...prev, { ...editing, id: Date.now(), scheduleJson: serialized, weekStart: computeWeekStartFromDate(editing.date), branchId: editing.branchId ?? null }]);
        toast.error('Lỗi khi tạo phân công, đã lưu local');
      } finally {
        setEditing(null);
        setScheduleEditor({});
      }
    })();
  };



  const updateAssignment = (id: number) => {
    if (!editing) return;
    const serialized = serializeSchedule(scheduleEditor);
    if (!serialized) { setScheduleErrors('Vui lòng cấu hình ít nhất một ca hợp lệ'); return; }
    const payload = {
      dentistId: editing.staffId,
      serviceId: editing.serviceId || null,
      branchId: editing.branchId || null,
      scheduleJson: serialized,
      weekStart: computeWeekStartFromDate(editing.date),
      notes: ''
    };
    (async () => {
      try {
        const res = await DentistAssignmentsAPI.updateAssignment(id, payload);
        if (res.success && res.data) {
          const created = res.data;
          setAssignments(prev => prev.map(a => a.id === id ? { id, staffId: created.dentistId ?? editing.staffId, serviceId: created.serviceId ?? editing.serviceId, date: editing.date, scheduleJson: created.scheduleJson ?? serialized, weekStart: created.weekStart ?? computeWeekStartFromDate(editing.date), branchId: created.branchId ?? editing.branchId ?? null } : a));
          toast.success('Cập nhật phân công thành công');
        } else {
          setAssignments(prev => prev.map(a => a.id === id ? { ...editing, id, scheduleJson: serialized, weekStart: computeWeekStartFromDate(editing.date), branchId: editing.branchId ?? null } : a));
          toast.warn(res.message || 'Cập nhật trên server thất bại, giữ thay đổi local');
        }
      } catch (err) {
        console.error('Update assignment failed', err);
        setAssignments(prev => prev.map(a => a.id === id ? { ...editing, id, weekStart: computeWeekStartFromDate(editing?.date) } : a));
        toast.error('Lỗi khi cập nhật phân công trên server');
      } finally {
        setEditing(null);
      }
    })();
  };

  // Confirm delete handlers
  const handleConfirmClose = () => {
    setConfirmDeleteId(null);
    setConfirmOpen(false);
  };

  // schedule server delete with undo window
  const performDelete = async (id: number) => {
    // clear any timer record
    const t = pendingTimersRef.current[id];
    if (t) {
      clearTimeout(t);
      delete pendingTimersRef.current[id];
    }
    const deleted = pendingDeletedRef.current[id];
    delete pendingDeletedRef.current[id];
    try {
      const res = await DentistAssignmentsAPI.deleteAssignment(id);
      if (res.success) {
        toast.info('Xóa phân công đã được thực hiện trên server');
      } else {
        // server failed; re-add locally as fallback
        if (deleted) setAssignments(prev => [deleted, ...prev]);
        toast.warn(res.message || 'Xóa trên server thất bại, đã phục hồi local');
      }
    } catch (err) {
      console.error('Delete assignment failed', err);
      if (deleted) setAssignments(prev => [deleted, ...prev]);
      toast.error('Lỗi khi xóa phân công trên server, đã phục hồi trên client');
    } finally {
      // dismiss related toast if still present
      const tId = toastIdMapRef.current[id];
      if (tId) {
        toast.dismiss(tId);
        delete toastIdMapRef.current[id];
      }
    }
  };

  const scheduleServerDelete = (id: number) => {
    // schedule actual server delete after 8s
    const timer = window.setTimeout(() => {
      // if still pending, perform
      if (pendingDeletedRef.current[id]) performDelete(id);
    }, 8000);
    pendingTimersRef.current[id] = timer as unknown as number;
  };

  const undoDelete = (id: number) => {
    // cancel timer and restore
    const timer = pendingTimersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete pendingTimersRef.current[id];
    }
    const deleted = pendingDeletedRef.current[id];
    if (deleted) {
      setAssignments(prev => [deleted, ...prev]);
      delete pendingDeletedRef.current[id];
      // dismiss toast
      const tId = toastIdMapRef.current[id];
      if (tId) {
        toast.dismiss(tId);
        delete toastIdMapRef.current[id];
      }
      toast.success('Đã hoàn tác xóa');
    }
  };

  const handleConfirmDelete = () => {
    const id = confirmDeleteId;
    handleConfirmClose();
    if (id == null) return;
    const target = assignments.find(a => a.id === id);
    if (!target) return;
    // optimistic remove
    pendingDeletedRef.current[id] = target;
    setAssignments(prev => prev.filter(a => a.id !== id));

    // show undo toast with MUI Button matching EmployeesList style
    const tId = toast(() => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <span>Đã xóa phân công</span>
        <Button variant="text" size="small" onClick={() => undoDelete(id)}>Hoàn tác</Button>
      </Box>
    ), {
      autoClose: 8000,
      closeOnClick: false,
      pauseOnHover: true,
      onClose: () => {
        // if still pending, perform delete now
        if (pendingDeletedRef.current[id]) {
          // clear scheduled timer if exists
          const timer = pendingTimersRef.current[id];
          if (timer) {
            clearTimeout(timer);
            delete pendingTimersRef.current[id];
          }
          performDelete(id);
        }
      }
    });
    toastIdMapRef.current[id] = tId as number;
    // schedule server delete as fallback if toast not closed by user
    scheduleServerDelete(id);
  };

  function weekdayFromDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      const map = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      return map[d.getDay()];
    } catch {
      return 'MONDAY';
    }
  }

  function validateSchedule(schedule: Record<string, Array<{ start: string; end: string }>>) {
    for (const day of WEEKDAYS) {
      const shifts = schedule[day];
      if (!shifts) continue;
      // check start < end and format HH:MM
      for (let i = 0; i < shifts.length; i++) {
        const a = shifts[i];
        if (!/^[0-2]\d:[0-5]\d$/.test(a.start) || !/^[0-2]\d:[0-5]\d$/.test(a.end)) return `Ca không đúng định dạng ở ${day}`;
        if (a.start >= a.end) return `Ca bắt đầu phải trước kết thúc ở ${day}`;
      }
      // check overlaps
      const sorted = [...shifts].sort((x, y) => x.start.localeCompare(y.start));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < sorted[i - 1].end) return `Các ca trùng nhau ở ${day}`;
      }
    }
    return null;
  }

  function computeDurationLabel(start: string, end: string) {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startMin = sh * 60 + (sm || 0);
      const endMin = eh * 60 + (em || 0);
      const adjustedEndMin = endMin < startMin ? endMin + 24 * 60 : endMin; // cross-midnight
      const diff = adjustedEndMin - startMin;
      if (diff <= 0) return '';
      if (diff < 60) return `${diff} phút`;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
    } catch {
      return '';
    }
  }

  // Produce a compact, human-friendly schedule summary, collapsing consecutive days with identical shifts
  function summarizeScheduleCompact(json?: string | null, fallbackDate?: string) {
    if (!json) return <span className="text-sm text-gray-600">{fallbackDate || '-'}</span>;
    try {
      const arr = JSON.parse(json) as Array<{ day: string; shifts: Array<{ start: string; end: string }> }>;
      if (!Array.isArray(arr) || arr.length === 0) return <span className="text-sm text-gray-600">{fallbackDate || '-'}</span>;
      // map day -> shifts string
      const dayMap: Record<string, string> = {};
      for (const it of arr) {
        const s = (it.shifts || []).map(x => `${x.start}-${x.end}`).join(',');
        dayMap[it.day] = s || '-';
      }
      // build array over WEEKDAYS preserving order
      const entries = WEEKDAYS.map(d => ({ day: d, shifts: dayMap[d] ?? '-' }));
      // group consecutive days with same shifts
      const groups: Array<{ from: string; to: string; shifts: string }> = [];
      let cur = null as null | { from: string; to: string; shifts: string };
      for (const e of entries) {
        if (!cur) {
          cur = { from: e.day, to: e.day, shifts: e.shifts };
        } else if (cur.shifts === e.shifts) {
          cur.to = e.day;
        } else {
          groups.push(cur);
          cur = { from: e.day, to: e.day, shifts: e.shifts };
        }
      }
      if (cur) groups.push(cur);

      return (
        <div className="flex flex-col text-sm">
          {groups.map((g, i) => {
            const fromLabel = VN_WEEKDAY[g.from] ?? g.from;
            const toLabel = g.from === g.to ? '' : ` - ${VN_WEEKDAY[g.to] ?? g.to}`;
            const shiftsLabel = g.shifts === '-' ? 'Không có ca' : g.shifts;
            return (
              <div key={i} className="text-sm text-gray-700">
                <span className="font-medium">{fromLabel}{toLabel}:</span> <span className="ml-1">{shiftsLabel}</span>
              </div>
            );
          })}
        </div>
      );
    } catch {
      return <span className="text-sm text-gray-600">{fallbackDate || '-'}</span>;
    }
  }

  function getInitials(name?: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async function copyScheduleToClipboard(scheduleJson?: string | null) {
    if (!scheduleJson) {
      toast.info('Không có lịch để sao chép');
      return;
    }
    try {
      await navigator.clipboard.writeText(scheduleJson);
      toast.success('Lịch (JSON) đã được sao chép');
    } catch (err) {
      console.error('Copy failed', err);
      toast.error('Không thể sao chép vào clipboard');
    }
  }

  // Render schedule text into a canvas and return PNG Blob
  function scheduleToPngBlob(scheduleJson?: string | null, title = 'Lịch làm việc'): Promise<Blob | null> {
    try {
      const lines: string[] = [];
      if (!scheduleJson) {
        lines.push('Không có lịch');
      } else {
        const arr = JSON.parse(scheduleJson) as Array<{ day: string; shifts: Array<{ start: string; end: string }> }>;
        for (const item of arr) {
          const label = VN_WEEKDAY[item.day] ?? item.day;
          lines.push(label + ':');
          if ((item.shifts || []).length === 0) {
            lines.push('  - Không có ca');
          } else {
            for (const s of item.shifts || []) {
              lines.push(`  • ${s.start} - ${s.end}`);
            }
          }
        }
      }

      const padding = 20;
      const fontSize = 14;
      const lineHeight = Math.round(fontSize * 1.6);
      const titleHeight = Math.round(fontSize * 1.8) + 8;
      const width = 420;
      const height = padding * 2 + titleHeight + lines.length * lineHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return Promise.resolve(null);

      // background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // title
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${fontSize + 2}px Arial`;
      ctx.fillText(title, padding, padding + titleHeight - 8);

      // body
      ctx.fillStyle = '#111827';
      ctx.font = `${fontSize}px Arial`;
      let y = padding + titleHeight + 4;
      for (const line of lines) {
        ctx.fillText(line, padding, y);
        y += lineHeight;
      }

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      });
    } catch (err) {
      console.error('scheduleToPngBlob error', err);
      return Promise.resolve(null);
    }
  }

  async function copyScheduleImage(scheduleJson?: string | null) {
    try {
      const blob = await scheduleToPngBlob(scheduleJson, 'Lịch làm việc');
      if (!blob) { toast.error('Không thể tạo ảnh'); return; }
      // write image to clipboard
      // ClipboardItem may not be available in some older browsers; try and fallback to error
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.success('Ảnh lịch đã được sao chép vào clipboard');
    } catch (err) {
      console.error('copyScheduleImage failed', err);
      toast.error('Không thể sao chép ảnh');
    }
  }

  async function downloadScheduleImage(scheduleJson?: string | null, filename?: string) {
    try {
      const blob = await scheduleToPngBlob(scheduleJson, 'Lịch làm việc');
      if (!blob) { toast.error('Không thể tạo ảnh'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `lich-${(new Date()).toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Ảnh lịch đã được tải xuống');
    } catch (err) {
      console.error('downloadScheduleImage failed', err);
      toast.error('Không thể tải ảnh');
    }
  }

  function beginEdit(a: Assignment) {
    // prefer weekStart as the date shown in the editor so the date picker and schedule
    // defaults reflect the anchored week when editing an assignment
    const anchor = a.weekStart ?? a.date ?? '';
    setEditing({ ...a, date: anchor });
    // initialize schedule editor from a.scheduleJson or default based on anchor
    const parsed = parseScheduleJson(a.scheduleJson ?? null);
    if (Object.keys(parsed).length === 0 && anchor) {
      const day = weekdayFromDate(anchor);
      setScheduleEditor({ [day]: [{ start: '08:00', end: '17:00' }] });
    } else {
      setScheduleEditor(parsed);
    }
    setScheduleErrors(null);
  }

  const filteredAssignments = assignments.filter(a => {
    const matchDate = selectedDate ? a.date === selectedDate : true;
    const matchStaff = filterStaff ? a.staffId === Number(filterStaff) : true;
    const matchService = filterService ? a.serviceId === Number(filterService) : true;
    return matchDate && matchStaff && matchService;
  });


  if (loading) {
    return (
      <div className="w-full h-[80vh] flex items-center justify-center">

        <CircularProgress />

      </div>
    )
  }


  return (
    <div className="bg-slate-50 rounded-2xl min-h-screen md:p-6 pb-16">
      <ToastContainer />
      <div className="max-w-8xl mx-auto space-y-4">
        <div className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="uppercase text-xs tracking-[0.2em] opacity-80">Lịch phân công</p>
            <h1 className="text-2xl font-semibold">Bảng phân công nhân viên nha khoa</h1>
            <p className="text-sm opacity-85">Theo dõi lịch, chi nhánh và dịch vụ của bác sĩ.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const defaultDate = selectedDate || '';
                setEditing({ id: 0, staffId: 0, serviceId: 0, date: defaultDate, branchId: 0 });
                if (defaultDate) {
                  const day = weekdayFromDate(defaultDate);
                  setScheduleEditor({ [day]: [{ start: '08:00', end: '17:00' }] });
                } else {
                  setScheduleEditor({});
                }
              }}
              className="px-4 py-2 bg-white text-indigo-700 rounded-xl shadow"
            >
              + Thêm phân công
            </button>
          </div>
        </div>

        {/* Bộ lọc */}
        <Paper className="p-4 rounded-2xl shadow-sm border border-slate-100 bg-white">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <div>
              <label className="text-xs font-semibold text-slate-500">Ngày</label>
              <button type="button" onClick={(e) => setPickerAnchor(e.currentTarget as HTMLElement)} className="border p-2 rounded-lg bg-white w-full text-left mt-1">
                <span className="font-medium text-slate-800">{selectedDate || 'Chọn ngày'}</span>
              </button>
              <Popover
                open={Boolean(pickerAnchor)}
                anchorEl={pickerAnchor}
                onClose={() => setPickerAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <div className="p-2 bg-white">
                  <StaticDatePicker
                    displayStaticWrapperAs="desktop"
                    orientation="portrait"
                    value={selectedDateObj}
                    onChange={(newVal) => {
                      setSelectedDateObj(newVal ? (newVal instanceof Date ? newVal : newVal.toDate()) : null);
                      if (newVal) {
                        const d = newVal instanceof Date ? newVal : newVal.toDate();
                        setSelectedDate(formatDateLocal(d));
                      }
                      else setSelectedDate('');
                      setPickerAnchor(null);
                    }}
                  />
                </div>
              </Popover>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Nhân viên</label>
              <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="border p-2 rounded-lg w-full mt-1 focus:ring-2 focus:ring-indigo-200 focus:outline-none">
                <option value="">Tất cả nhân viên</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Dịch vụ</label>
              <select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="border p-2 rounded-lg w-full mt-1 focus:ring-2 focus:ring-indigo-200 focus:outline-none">
                <option value="">Tất cả dịch vụ</option>
                {servicesLoading ? <option disabled>Đang tải...</option> : services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex items-end justify-end text-sm text-slate-500">
              Hiển thị {filteredAssignments.length} / {assignments.length} phân công
            </div>
          </div>
        </Paper>

        {/* Bảng phân công */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-3 text-left">Ngày</th>
                <th className="p-3 text-left">Nhân viên</th>
                <th className="p-3 text-left">Chuyên môn</th>
                <th className="p-3 text-left">Chi nhánh</th>
                <th className="p-3 text-left">Dịch vụ</th>
                <th className="p-3 text-left">Thời lượng</th>
                <th className="p-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map(a => {
                const staffInfo = staff.find(s => s.id === a.staffId);
                const serviceInfo = services.find(s => s.id === a.serviceId);
                const branchInfo = branches.find(b => b.id === a.branchId);
                return (
                  <tr key={a.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 align-top">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { setSchedulePopoverAnchor(e.currentTarget as HTMLElement); setSchedulePopoverAssignment(a); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSchedulePopoverAnchor(e.currentTarget as HTMLElement); setSchedulePopoverAssignment(a); } }}
                        className="cursor-pointer"
                        aria-label="Xem chi tiết lịch"
                      >
                        {summarizeScheduleCompact(a.scheduleJson, a.weekStart ?? a.date)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-semibold`}>{getInitials(staffInfo?.name)}</div>
                        <div>
                          <div className="font-medium">{staffInfo?.name ?? '-'}</div>
                          <div className="text-xs text-gray-500">{staffInfo?.specialty ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{staffInfo?.specialty}</td>
                    <td className="p-3"><span className="inline-block px-2 py-1 bg-gray-100 rounded text-sm">{branchInfo?.name ?? (a.branchId ? String(a.branchId) : '-')}</span></td>
                    <td className="p-3">
                      <div className="font-medium">{serviceInfo?.name ?? '-'}</div>
                      <div className="mt-1">
                        {serviceInfo ? <span className="text-xs text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded">{serviceInfo.durationMinutes} phút</span> : (servicesLoading ? 'Đang tải...' : '-')}
                      </div>
                    </td>
                    <td className="p-3">{serviceInfo ? `${serviceInfo.durationMinutes} phút` : (servicesLoading ? 'Đang tải...' : '-')}</td>
                    <td className="p-3 flex gap-1 items-center justify-center">
                      <Tooltip title="Xem" placement="top">
                        <IconButton size="small" onClick={() => setViewing(a)}>
                          <VisibilityIcon fontSize="small" color="action" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sửa" placement="top">
                        <IconButton size="small" onClick={() => beginEdit(a)}>
                          <EditIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa" placement="top">
                        <IconButton size="small" onClick={() => { setConfirmDeleteId(a.id); setConfirmOpen(true); }}>
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Delete confirmation dialog */}
        <Dialog open={confirmOpen} onClose={handleConfirmClose}>
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogContent>
            Bạn có chắc muốn xóa phân công này?
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmClose} color="inherit">Hủy</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">Xóa</Button>
          </DialogActions>
        </Dialog>

        </div>

      {/* Popover for schedule details from table */}
      <Popover
        open={Boolean(schedulePopoverAnchor)}
        anchorEl={schedulePopoverAnchor}
        onClose={() => { setSchedulePopoverAnchor(null); setSchedulePopoverAssignment(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box className="p-3 max-w-[320px]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="font-medium text-sm">{schedulePopoverAssignment ? staff.find(s => s.id === schedulePopoverAssignment.staffId)?.name : ''}</div>
              <div className="text-xs text-gray-500">{(schedulePopoverAssignment?.weekStart ?? schedulePopoverAssignment?.date) || ''}</div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip title="Sao chép JSON"><IconButton size="small" onClick={() => { if (schedulePopoverAssignment) copyScheduleToClipboard(schedulePopoverAssignment.scheduleJson); }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Sao chép ảnh"><IconButton size="small" onClick={() => { if (schedulePopoverAssignment) copyScheduleImage(schedulePopoverAssignment.scheduleJson); }}><span style={{ fontSize: 14 }}>🖼️</span></IconButton></Tooltip>
              <Tooltip title="Tải ảnh"><IconButton size="small" onClick={() => { if (schedulePopoverAssignment) downloadScheduleImage(schedulePopoverAssignment.scheduleJson, `lich-${((schedulePopoverAssignment?.weekStart ?? schedulePopoverAssignment?.date) || (new Date()).toISOString().slice(0, 10))}.png`); }}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
            </div>
          </div>
          <div className="text-sm text-gray-700">{renderScheduleDetailed(schedulePopoverAssignment?.scheduleJson ?? null, schedulePopoverAssignment?.weekStart ?? schedulePopoverAssignment?.date)}</div>
        </Box>
      </Popover>

      {/* Modal thêm/sửa phân công */}
      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white p-6 rounded-xl shadow-xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-auto" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <h2 className="text-xl font-bold mb-4">{editing.id ? 'Chỉnh sửa' : 'Thêm'} phân công</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: form controls + schedule editor (compact) */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Nhân viên</label>
                    <select value={editing.staffId} onChange={(e) => setEditing({ ...editing, staffId: Number(e.target.value) })} className="border p-2 rounded w-full mt-1">
                      <option value={0}>Chọn nhân viên</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Dịch vụ</label>
                    <select value={editing.serviceId} onChange={(e) => setEditing({ ...editing, serviceId: Number(e.target.value) })} className="border p-2 rounded w-full mt-1">
                      <option value={0}>Chọn dịch vụ</option>
                      {servicesLoading ? <option value={0} disabled>Đang tải...</option> : services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Chi nhánh</label>
                    <select value={editing.branchId ?? 0} onChange={(e) => setEditing({ ...editing, branchId: Number(e.target.value) })} className="border p-2 rounded w-full mt-1">
                      <option value={0}>Không chọn chi nhánh</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  {/* Inline compact schedule editor (left column) */}
                  <div className="border p-3 rounded mt-2">
                    <div className="text-sm font-medium mb-2">Lịch làm việc (nhanh)</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {WEEKDAYS.map(day => (
                        <button key={day} type="button" onClick={() => {
                          setScheduleEditor(prev => ({ ...prev, [day]: prev[day] ? prev[day] : [{ start: '08:00', end: '17:00' }] }));
                        }} className={`px-2 py-1 rounded text-sm ${scheduleEditor[day] ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>{VN_WEEKDAY[day] ?? day.slice(0, 3)}</button>
                      ))}
                    </div>
                    {WEEKDAYS.map(day => (
                      scheduleEditor[day] ? (
                        <div key={day} className="mb-2">
                          <div className="font-semibold mb-1 text-sm">{VN_WEEKDAY[day] ?? day}</div>
                          {(scheduleEditor[day] || []).map((sh, idx) => (
                            <div key={idx} className="flex gap-2 items-center mb-1">
                              <input type="time" value={sh.start} onChange={(e) => {
                                const v = e.target.value;
                                setScheduleEditor(prev => ({ ...prev, [day]: prev[day].map((s, i) => i === idx ? { ...s, start: v } : s) }));
                              }} className="border p-1 rounded" />
                              <span>-</span>
                              <input type="time" value={sh.end} onChange={(e) => {
                                const v = e.target.value;
                                setScheduleEditor(prev => ({ ...prev, [day]: prev[day].map((s, i) => i === idx ? { ...s, end: v } : s) }));
                              }} className="border p-1 rounded" />
                              <button type="button" onClick={() => setScheduleEditor(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }))} className="text-red-500">×</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => setScheduleEditor(prev => ({ ...prev, [day]: [...(prev[day] || []), { start: '08:00', end: '17:00' }] }))} className="px-2 py-1 bg-gray-200 rounded text-sm">Thêm ca</button>
                        </div>
                      ) : null
                    ))}
                    {scheduleErrors && <div className="text-red-500 text-sm mt-2">{scheduleErrors}</div>}
                  </div>
                </div>

                {/* Right: date picker and quick actions */}
                <div className="space-y-3">
                  <div className="border p-3 rounded">
                    <div className="text-sm font-medium mb-2">Chọn ngày</div>
                    <StaticDatePicker
                      displayStaticWrapperAs="desktop"
                      orientation="portrait"
                      value={editingDateObj}
                      onChange={(newVal) => {
                        const dateObj = newVal instanceof Date ? newVal : (newVal ? newVal.toDate() : null);
                        setEditingDateObj(dateObj);
                        if (dateObj) {
                          const iso = formatDateLocal(dateObj);
                          setEditing(prev => prev ? ({ ...prev, date: iso }) : prev);
                        } else {
                          setEditing(prev => prev ? ({ ...prev, date: '' }) : prev);
                        }
                      }}
                    />
                  </div>

                  <div className="border p-3 rounded">
                    <div className="text-sm font-medium mb-2">Ngày đã chọn</div>
                    <div className="mb-3">{editing?.date || 'Chưa chọn'}</div>
                    <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => {
                      // Apply a default shift for the selected date's weekday
                      if (!editing?.date) { toast.info('Vui lòng chọn ngày trước'); return; }
                      const wd = weekdayFromDate(editing.date);
                      setScheduleEditor(prev => ({ ...prev, [wd]: [{ start: '08:00', end: '17:00' }] }));
                      toast.success('Đã áp dụng ca mặc định cho ngày đã chọn');
                    }}>Áp dụng ca mặc định</button>
                  </div>

                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setEditing(null); setScheduleEditor({}); }} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                <button onClick={() => {
                  // validate schedule: ensure for each day start < end and no overlaps
                  const invalid = validateSchedule(scheduleEditor);
                  if (invalid) { setScheduleErrors(invalid); return; }
                  if (editing && editing.id) updateAssignment(editing.id); else addAssignment();
                }} className="px-4 py-2 bg-indigo-500 text-white rounded">Lưu</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal xem chi tiết (read-only) */}
      <AnimatePresence>
        {viewing && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white p-6 rounded-xl shadow-xl max-w-4xl max-h-[80vh] overflow-auto" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <Avatar sx={{ bgcolor: '#e0e7ff', color: '#3730a3' }}>{getInitials(staff.find(s => s.id === viewing.staffId)?.name)}</Avatar>
                  <div>
                    <div className="text-lg font-semibold">{staff.find(s => s.id === viewing.staffId)?.name ?? '-'}</div>
                    <div className="text-xs text-gray-500">{staff.find(s => s.id === viewing.staffId)?.specialty ?? ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton size="small" onClick={() => { if (viewing) { beginEdit(viewing); setViewing(null); } }} aria-label="Sửa phân công">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <Button onClick={() => setViewing(null)} size="small" variant="outlined">Đóng</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className=" md:space-y-10 space-y-4 ">
                  <div className="flex items-center gap-2">
                    <Chip label={services.find(s => s.id === viewing.serviceId)?.name ?? '-'} size="small" />
                    {services.find(s => s.id === viewing.serviceId) ? <span className="text-sm text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded">{services.find(s => s.id === viewing.serviceId)!.durationMinutes} phút</span> : null}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CalendarTodayIcon fontSize="small" />
                    <div>{viewing.weekStart ? new Date(viewing.weekStart).toLocaleDateString('vi-VN') : (viewing.date ? new Date(viewing.date).toLocaleDateString('vi-VN') : 'Chưa chọn ngày')}</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-medium">Chi nhánh</div>
                    <div className="mt-1 text-sm">{branches.find(b => b.id === viewing.branchId)?.name ?? (viewing.branchId ? String(viewing.branchId) : 'Không chọn chi nhánh')}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Lịch làm việc</div>
                  <div className="border rounded p-3 max-h-[40vh] overflow-auto bg-gray-50
                        overflow-x-hidden
                        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full
                        hover:scrollbar-thumb-gray-400
                        hover:scrollbar-track-gray-200
                        ">
                    <div className="mb-2 text-xs text-gray-500 flex items-center justify-end gap-2">
                      <button type="button" onClick={() => copyScheduleToClipboard(viewing.scheduleJson)} className="text-xs text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"><ContentCopyIcon fontSize="small" /> Sao chép JSON</button>
                      <button type="button" onClick={() => copyScheduleImage(viewing.scheduleJson)} className="text-xs text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">🖼️ Sao chép ảnh</button>
                      <button type="button" onClick={() => downloadScheduleImage(viewing.scheduleJson, `lich-${((viewing?.weekStart ?? viewing?.date) || (new Date()).toISOString().slice(0, 10))}.png`)} className="text-xs text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"><DownloadIcon fontSize="small" /> Tải ảnh</button>
                    </div>
                    <div className="text-sm text-gray-700">{renderScheduleDetailed(viewing.scheduleJson, viewing.weekStart ?? viewing.date)}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DentalStaffAssignment;
