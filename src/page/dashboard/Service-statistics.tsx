import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Tabs,
    Tab,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Button,
    Menu,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    SelectChangeEvent,
    CircularProgress,
    Card,
    CardContent,
    Typography,
    TextField,
} from '@mui/material';

import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, ComposedChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LabelList, Line, Cell } from 'recharts';
import type { TooltipProps } from 'recharts';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { FaDollarSign, FaCalendarCheck, FaChartBar } from 'react-icons/fa';

import DashboardAPI, { type ByDentistEntry } from '../../services/dasboard';
import { ServiceAPI, type ServiceItem } from '../../services/service';
import { AppointmentAPI, type AppointmentItem } from '../../services/appointments';
import { DentistAPI, type Dentist } from '../../services/dentist';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';

// Force month labels to numeric strings ("01", "02", ...) so the
// month-selection view in the MUI pickers shows numbers instead of names.
// This overrides both long and short month names for common locales.
dayjs.extend(updateLocale);
const _numericMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
try {
    dayjs.updateLocale('en', { months: _numericMonths, monthsShort: _numericMonths });
    dayjs.updateLocale('vi', { months: _numericMonths, monthsShort: _numericMonths });
} catch {
    // ignore if locale isn't present — best-effort only
}

interface ServiceData { name: string; count: number; totalPrice: number }

const DichVuTK: React.FC = () => {
    const [tab, setTab] = useState<number>(0);
    const [rangeMode, setRangeMode] = useState<'range' | 'between'>('range');
    const [rangeType, setRangeType] = useState<'day' | 'month' | 'year'>('month');
    const today = new Date().toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState<string>(today);
    const [endDate, setEndDate] = useState<string>(today);
    const [applyingRange, setApplyingRange] = useState(false);
    const [loading, setLoading] = useState(false);
    const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);
    const [exportingXlsx, setExportingXlsx] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailType, setDetailType] = useState<'service' | 'dentist' | null>(null);
    const [detailKey, setDetailKey] = useState<string | number | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailAppointments, setDetailAppointments] = useState<AppointmentItem[]>([]);
    const [detailDentist, setDetailDentist] = useState<Dentist | null>(null);
    const [allDentists, setAllDentists] = useState<Dentist[]>([]);
    const [allAppointments, setAllAppointments] = useState<AppointmentItem[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [serviceUsage, setServiceUsage] = useState<Record<string, { count: number; totalPrice: number }>>({});
    const [dentistStats, setDentistStats] = useState<ByDentistEntry[] | null>(null);
    const [appliedStart, setAppliedStart] = useState<string | null>(null);
    const [appliedEnd, setAppliedEnd] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString());
    // View-all toggles for different sections
    const [showAllOverview, setShowAllOverview] = useState<boolean>(false);
    const [showAllServices, setShowAllServices] = useState<boolean>(false);
    const [showAllDentists, setShowAllDentists] = useState<boolean>(false);

    // Compare months feature: compare two months side-by-side
    const [compareMonthsEnabled, setCompareMonthsEnabled] = useState<boolean>(false);
    const [compareMonthA, setCompareMonthA] = useState<string>(() => {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${mm}`; // YYYY-MM
    });
    const [compareMonthB, setCompareMonthB] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${mm}`;
    });
    const [compareLoading, setCompareLoading] = useState<boolean>(false);
    const [serviceCompareData, setServiceCompareData] = useState<Array<{ name: string; a_count: number; b_count: number; a_revenue: number; b_revenue: number }>>([]);
    const [compareDialogOpen, setCompareDialogOpen] = useState<boolean>(false);

    // Load comparison data for two months (YYYY-MM)
    const loadComparisonMonths = async (monthA: string, monthB: string) => {
        setCompareLoading(true);
        try {
            const aIso = `${monthA}-01`;
            const bIso = `${monthB}-01`;
            const [resA, resB, servicesRes] = await Promise.all([
                DashboardAPI.getUsageByRange('month', aIso),
                DashboardAPI.getUsageByRange('month', bIso),
                ServiceAPI.getServices(),
            ]);
            const mapA: Record<string, number> = resA && resA.success && resA.data ? resA.data : {};
            const mapB: Record<string, number> = resB && resB.success && resB.data ? resB.data : {};
            const servicesList = servicesRes && servicesRes.success && servicesRes.data ? servicesRes.data : services;
            const priceMapLocal: Record<string, number> = Object.fromEntries((servicesList || []).map((s: ServiceItem) => [s.name, s.price || 0]));

            const names = new Set<string>([...Object.keys(mapA), ...Object.keys(mapB), ...Object.keys(priceMapLocal)]);
            const arr = Array.from(names).map(name => {
                const a_count = Number(mapA[name] || 0);
                const b_count = Number(mapB[name] || 0);
                const a_revenue = a_count * (priceMapLocal[name] || 0);
                const b_revenue = b_count * (priceMapLocal[name] || 0);
                return { name, a_count, b_count, a_revenue, b_revenue };
            }).sort((x, y) => (y.a_count + y.b_count) - (x.a_count + x.b_count));

            setServiceCompareData(arr);
        } catch (err) {
            console.warn('loadComparisonMonths failed', err);
            setServiceCompareData([]);
        } finally {
            setCompareLoading(false);
        }
    };

    // refs to chart containers so we can capture SVGs for Excel export
    const serviceChartRef = useRef<HTMLDivElement | null>(null);
    const dentistChartRef = useRef<HTMLDivElement | null>(null);

    const openExportMenu = (e: React.MouseEvent<HTMLElement>) => setExportAnchorEl(e.currentTarget);
    const closeExportMenu = () => setExportAnchorEl(null);

    // Helper to load usage map and dentist stats
    const loadUsageBetween = async (startIso: string, endIso: string) => {
        setApplyingRange(true);
        setLoading(true);
        try {
            const [usageRes, servicesRes, dentistRes] = await Promise.all([
                DashboardAPI.getUsageBetween(startIso, endIso),
                ServiceAPI.getServices(),
                DashboardAPI.getUsageByDentist(startIso, endIso),
            ]);

            const usageMap = usageRes.success && usageRes.data ? usageRes.data : {};
            const services = servicesRes.success && servicesRes.data ? servicesRes.data : [];

            const priceMap: Record<string, number> = {};
            services.forEach(s => { if (s && typeof s.name === 'string') priceMap[s.name] = s.price || 0; });

            const normalized: { [key: string]: { count: number; totalPrice: number } } = {};
            Object.entries(usageMap).forEach(([name, count]) => {
                const price = priceMap[name] ?? 0;
                normalized[name] = { count: Number(count || 0), totalPrice: Number(count || 0) * price };
            });

            setServiceUsage(Object.keys(normalized).length ? normalized : Object.fromEntries(services.map(s => [s.name, { count: 0, totalPrice: 0 }])));


            setDentistStats(dentistRes.success && dentistRes.data ? dentistRes.data : null);
        } catch {
            setServiceUsage({});
            setDentistStats(null);
        } finally {
            setApplyingRange(false);
            setLoading(false);
        }
    };

    const loadUsageByRange = async (range: 'day' | 'month' | 'year', dateYmd: string) => {
        setApplyingRange(true);
        setLoading(true);
        try {
            const usageRes = await DashboardAPI.getUsageByRange(range, dateYmd);
            const servicesRes = await ServiceAPI.getServices();

            const usageMap = usageRes.success && usageRes.data ? usageRes.data : {};
            const services = servicesRes.success && servicesRes.data ? servicesRes.data : [];

            const priceMap: Record<string, number> = {};
            services.forEach(s => { if (s && typeof s.name === 'string') priceMap[s.name] = s.price || 0; });

            const normalized: { [key: string]: { count: number; totalPrice: number } } = {};
            Object.entries(usageMap).forEach(([name, count]) => {
                const price = priceMap[name] ?? 0;
                normalized[name] = { count: Number(count || 0), totalPrice: Number(count || 0) * price };
            });

            setServiceUsage(Object.keys(normalized).length ? normalized : Object.fromEntries(services.map(s => [s.name, { count: 0, totalPrice: 0 }])));

            // getUsageByDentist not available for range shortcut — clear dentist stats
            setDentistStats(null);
        } catch {
            setServiceUsage({});

            setDentistStats(null);
        } finally {
            setApplyingRange(false);
            setLoading(false);
        }
    };

    // default to current MONTH view when user hasn't interacted
    useEffect(() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const firstOfMonth = `${yyyy}-${mm}-01`;
        // set startDate to first day of month and endDate to today
        setStartDate(firstOfMonth);
        setEndDate(now.toISOString().slice(0, 10));
        setRangeType('month');

        const defaultStartIso = new Date(firstOfMonth + 'T00:00:00').toISOString();
        const defaultEndIso = new Date(now.toISOString().slice(0, 10) + 'T23:59:59').toISOString();
        setAppliedStart(defaultStartIso);
        setAppliedEnd(defaultEndIso);

        // call usage-by-range for the current month
        (async () => {
            setApplyingRange(true);
            setLoading(true);
            try {
                const usageRes = await DashboardAPI.getUsageByRange('month', firstOfMonth);
                const servicesRes = await ServiceAPI.getServices();

                const usageMap = usageRes.success && usageRes.data ? usageRes.data : {};
                const servicesList = servicesRes.success && servicesRes.data ? servicesRes.data : [];

                const priceMapLocal: Record<string, number> = {};
                servicesList.forEach(s => { if (s && typeof s.name === 'string') priceMapLocal[s.name] = s.price || 0; });

                const normalized: { [key: string]: { count: number; totalPrice: number } } = {};
                Object.entries(usageMap).forEach(([name, count]) => {
                    const price = priceMapLocal[name] ?? 0;
                    normalized[name] = { count: Number(count || 0), totalPrice: Number(count || 0) * price };
                });

                setServiceUsage(Object.keys(normalized).length ? normalized : Object.fromEntries(servicesList.map(s => [s.name, { count: 0, totalPrice: 0 }])));

                setDentistStats(null);
            } catch {
                setServiceUsage({});

                setDentistStats(null);
            } finally {
                setApplyingRange(false);
                setLoading(false);
            }
        })();

        // update current time every minute
        const t = setInterval(() => setCurrentTime(new Date().toLocaleString()), 60_000);
        return () => clearInterval(t);
    }, []);

    // load dentists list once so we can display authoritative names/contact info
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [dsRes, apptsRes, servicesRes] = await Promise.all([DentistAPI.getDentists(), AppointmentAPI.getAll(), ServiceAPI.getServices()]);
                if (!mounted) return;
                if (dsRes && dsRes.success && Array.isArray(dsRes.data)) {
                    setAllDentists(dsRes.data || []);
                }
                if (apptsRes && apptsRes.success && Array.isArray(apptsRes.data)) {
                    setAllAppointments(apptsRes.data || []);
                }
                if (servicesRes && servicesRes.success && Array.isArray(servicesRes.data)) {
                    setServices(servicesRes.data || []);
                }
            } catch {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, []);

    const handleApply = async () => {
        if (rangeMode === 'between') {
            // construct ISO boundaries (start at 00:00, end at 23:59:59 local -> toISOString)
            const s = new Date(startDate + 'T00:00:00');
            const e = new Date(endDate + 'T23:59:59');
            await loadUsageBetween(s.toISOString(), e.toISOString());
            setAppliedStart(s.toISOString());
            setAppliedEnd(e.toISOString());
        } else {
            // rangeType: day/month/year - pick representative date
            if (rangeType === 'month') {
                // use first day of month
                const d = startDate.slice(0, 7) + '-01';
                await loadUsageByRange('month', d);
                setAppliedStart(new Date(d + 'T00:00:00').toISOString());
                setAppliedEnd(dayjs(d).endOf('month').toDate().toISOString());
            } else if (rangeType === 'year') {
                const d = startDate.slice(0, 4) + '-01-01';
                await loadUsageByRange('year', d);
                setAppliedStart(new Date(d + 'T00:00:00').toISOString());
                setAppliedEnd(dayjs(d).endOf('year').toDate().toISOString());
            } else {
                await loadUsageByRange('day', startDate);
                setAppliedStart(new Date(startDate + 'T00:00:00').toISOString());
                setAppliedEnd(new Date(startDate + 'T23:59:59').toISOString());
            }
        }
    };

    // Quickly view all months: load from a very early date up to today
    const handleShowAllMonths = async () => {
        const earliest = '2000-01-01';
        const todayStr = new Date().toISOString().slice(0, 10);
        setRangeMode('between');
        setStartDate(earliest);
        setEndDate(todayStr);
        const s = new Date(earliest + 'T00:00:00');
        const e = new Date(todayStr + 'T23:59:59');
        await loadUsageBetween(s.toISOString(), e.toISOString());
        setAppliedStart(s.toISOString());
        setAppliedEnd(e.toISOString());
    };

    const appliedStartMs = appliedStart ? new Date(appliedStart).getTime() : null;
    const appliedEndMs = appliedEnd ? new Date(appliedEnd).getTime() : null;

    const filteredAppointments = useMemo(() => {
        if (!allAppointments || !allAppointments.length) return [];
        return allAppointments.filter(a => {
            const t = a.scheduledTime ? new Date(a.scheduledTime as unknown as string).getTime() : NaN;
            if (Number.isNaN(t)) return false;
            if (appliedStartMs !== null && t < appliedStartMs) return false;
            if (appliedEndMs !== null && t > appliedEndMs) return false;
            return true;
        });
    }, [allAppointments, appliedStartMs, appliedEndMs]);

    // Only revenue from COMPLETED appointments should be counted
    const completedAppointments = useMemo(() => {
        return filteredAppointments.filter(a => (a.status ?? '').toString().toUpperCase() === 'COMPLETED');
    }, [filteredAppointments]);

    // Reset filters to the default current-month view
    const handleResetFilters = async () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const firstOfMonth = `${yyyy}-${mm}-01`;
        const todayStr = now.toISOString().slice(0, 10);

        setRangeMode('range');
        setRangeType('month');
        setStartDate(firstOfMonth);
        setEndDate(todayStr);
        setShowAllOverview(false);
        setShowAllServices(false);
        setShowAllDentists(false);

        await loadUsageByRange('month', firstOfMonth);
        setAppliedStart(new Date(firstOfMonth + 'T00:00:00').toISOString());
        setAppliedEnd(new Date(todayStr + 'T23:59:59').toISOString());
    };

    // Fetch detail appointments and dentist info when dialog opens
    useEffect(() => {
        if (!detailOpen || !detailType || detailKey == null) return;

        let mounted = true;
        (async () => {
            setDetailLoading(true);
            try {
                const appts = filteredAppointments;

                if (detailType === 'service') {
                    const key = String(detailKey).toLowerCase();
                    const filtered = appts.filter(a => {
                        const svc = (a.serviceName ?? '').toString().toLowerCase();
                        return svc.includes(key);
                    });
                    if (!mounted) return;
                    setDetailAppointments(filtered);
                    setDetailDentist(null);
                }

                if (detailType === 'dentist') {
                    const did = Number(detailKey);
                    const filtered = appts.filter(a => (a.dentistId ?? a.dentistRefId ?? a.dentistUserId) === did);
                    if (!mounted) return;
                    setDetailAppointments(filtered);

                    // load dentist info
                    const dsRes = await DentistAPI.getDentists();
                    const dentist = dsRes.success && dsRes.data ? dsRes.data.find(d => d.id === did) ?? null : null;
                    setDetailDentist(dentist);
                }
            } catch {
                setDetailAppointments([]);
                setDetailDentist(null);
            } finally {
                if (mounted) setDetailLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [detailOpen, detailType, detailKey, filteredAppointments]);

    // derive lists from API-fetched appointments & dentists for drill-down details
    // Map service name -> appointments (from API data)
    const serviceToAppointments = Object.fromEntries(
        Object.keys(serviceUsage).map(serviceName => [
            serviceName,
            filteredAppointments.filter(a => (a.serviceName ?? '').toString().toLowerCase().includes(serviceName.toLowerCase()))
        ])
    );

    // Map dentistId -> appointments (grouped from all appointments)
    const dentistToAppointments = filteredAppointments.reduce((acc: Record<number, AppointmentItem[]>, a) => {
        const did = Number(a.dentistId ?? a.dentistRefId ?? a.dentistUserId ?? -1);
        if (did > 0) {
            acc[did] = acc[did] || [];
            acc[did].push(a);
        }
        return acc;
    }, {} as Record<number, AppointmentItem[]>);

    // price map derived from fetched services
    const priceMap: Record<string, number> = Object.fromEntries((services || []).map(s => [s.name, s.price || 0]));

    // derive price for an appointment (prefer price field, fallback to service price map)
    const getAppointmentPrice = useCallback((appt: AppointmentItem) => {
        const raw = (appt as unknown as { price?: number }).price;
        if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
        const name = appt.serviceName ?? '';
        return priceMap[name] ?? 0;
    }, [priceMap]);

    // compute revenue per dentist from completed appointments only
    const dentistRevenue: Record<number, number> = completedAppointments.reduce((acc: Record<number, number>, a) => {
        const did = Number(a.dentistId ?? a.dentistRefId ?? a.dentistUserId ?? -1);
        const price = getAppointmentPrice(a);
        if (did > 0) {
            acc[did] = (acc[did] || 0) + (Number(price) || 0);
        }
        return acc;
    }, {} as Record<number, number>);

    // Selected dentist derived values for the detail dialog
    const selectedDentistId = detailKey != null ? Number(detailKey) : null;
    const selectedDentist = selectedDentistId != null ? (dentistStats || []).find(ds => ds.dentistId === selectedDentistId) : undefined;
    const selectedDentistName = selectedDentist?.dentistName ?? (selectedDentistId != null ? allDentists.find(a => a.id === selectedDentistId)?.name : undefined) ?? 'N/A';

    // Revenue per service counting only COMPLETED appointments
    const completedRevenueByService: Record<string, number> = useMemo(() => {
        const map: Record<string, number> = {};
        completedAppointments.forEach(a => {
            const name = (a.serviceName || '').toString();
            const price = getAppointmentPrice(a);
            map[name] = (map[name] || 0) + (Number(price) || 0);
        });
        return map;
    }, [completedAppointments, getAppointmentPrice]);

    // Chuyển đổi dữ liệu thô sang định dạng phù hợp với biểu đồ
    const pieChartData: ServiceData[] = Object.entries(serviceUsage).map(([name, data]) => ({
        name,
        count: data.count,
        totalPrice: completedRevenueByService[name] ?? 0,
    }));

    // Overview table data (sorted by revenue) with optional "view all"
    const sortedByRevenue = pieChartData.slice().sort((a, b) => b.totalPrice - a.totalPrice);
    const overviewTableData = showAllOverview ? sortedByRevenue : sortedByRevenue.slice(0, 10);

    // Prepare data for a horizontal bar chart (top services) with optional view-all
    const sortedServicesAll = pieChartData.slice().sort((a, b) => b.count - a.count);
    const serviceBarData: ServiceData[] = showAllServices ? sortedServicesAll : sortedServicesAll.slice(0, 10);

    // Dentist table controls
    const [dentistSearch, setDentistSearch] = useState<string>('');
    const [dentistSort, setDentistSort] = useState<'appointments' | 'revenue'>('appointments');
    const [dentistTopN, setDentistTopN] = useState<number>(0); // 0 = all, otherwise top N

    // Prepare dentist chart data (counts + revenue) and table data
    const dentistChartData = (dentistStats && dentistStats.length > 0)
        ? dentistStats.map(d => ({ name: d.dentistName, total: d.totalAppointments, revenue: typeof (d as unknown as { totalRevenue?: number }).totalRevenue === 'number' ? (d as unknown as { totalRevenue?: number }).totalRevenue : (dentistRevenue[d.dentistId] || 0) }))
        : (allDentists && allDentists.length > 0 ? allDentists.map(d => ({ name: d.name, total: (dentistToAppointments[d.id] || []).length, revenue: dentistRevenue[d.id] || 0 })) : Object.keys(dentistToAppointments).map(k => ({ name: `Nha sĩ ${k}`, total: (dentistToAppointments[Number(k)] || []).length, revenue: dentistRevenue[Number(k)] || 0 })));

    interface DentistTableEntry {
        dentistId: number;
        name: string;
        total: number;
        revenue: number;
        serviceCounts: Record<string, number>;
        phone?: string;
        email?: string;
    }

    // helper: compute service counts from appointments list
    const computeServiceCounts = (appts: AppointmentItem[] = []) => {
        return appts.reduce((acc: Record<string, number>, a) => {
            const name = (a.serviceName || 'Không rõ').toString();
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    };

    const topServicesForDentist = (dentistId: number, limit = 3) => {
        const appts = dentistToAppointments[dentistId] || [];
        const counts = computeServiceCounts(appts);
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, cnt]) => `${name} (${cnt})`);
    };

    const formatCurrency = (v: number) => (Number(v || 0)).toLocaleString('vi-VN') + ' đ';

    // Helpers to capture SVG and convert to PNG base64 for embedding into Excel

    const exportServiceDetailCSV = (filename = 'service-details.csv') => {
        if (!detailAppointments || !detailAppointments.length) return;
        const rows = [
            ['ID', 'Khách', 'Điện thoại', 'Email', 'Nha sĩ', 'Chi nhánh', 'Dịch vụ', 'Ngày', 'Giờ', 'Giá', 'Thời lượng (phút)', 'Trạng thái']
        ];
        detailAppointments.forEach(a => {
            const price = (a as unknown as { price?: number }).price ?? 0;
            rows.push([
                String(a.id ?? ''),
                String(a.customerName ?? a.customerUsername ?? ''),
                String((a as unknown as { phone?: string }).phone ?? ''),
                String(a.customerEmail ?? ''),
                String(a.dentistName ?? ''),
                String(a.branchName ?? a.branchAddress ?? ''),
                String(a.serviceName ?? ''),
                a.scheduledTime ? new Date(a.scheduledTime).toLocaleDateString() : '',
                a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString() : '',
                String(price),
                String(a.serviceDuration ?? ''),
                String(a.status ?? '')
            ]);
        });
        const csv = rows.map(r => r.map(col => '"' + String(col).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportCompareXlsx = async () => {
        if (!serviceCompareData || !serviceCompareData.length) return;
        try {
            setExportingXlsx(true);
            const mod = await import('exceljs');
            type ExcelCell = { value?: unknown; font?: unknown; alignment?: unknown; fill?: unknown; border?: unknown; numFmt?: string };
            type ExcelRow = { getCell: (n: number) => ExcelCell; eachCell?: (opts: unknown, cb: (cell: ExcelCell) => void) => void; commit?: () => void; height?: number };
            type ExcelSheet = { columns?: unknown; addRow: (row: unknown) => void; autoFilter?: unknown; lastRow?: { number: number }; getRow: (n: number) => ExcelRow; getCell: (c: string) => ExcelCell; views?: unknown; mergeCells?: (...args: unknown[]) => void };
            type ExcelWorkbook = { addWorksheet: (name: string, options?: unknown) => ExcelSheet; xlsx: { writeBuffer: () => Promise<Uint8Array | ArrayBuffer> } };
            type ExcelModule = { Workbook: new () => ExcelWorkbook };
            const ExcelJS = (mod as unknown) as ExcelModule;
            const workbook = new ExcelJS.Workbook();

            const sheet = workbook.addWorksheet('So sanh');
            const now = new Date();
            const exportedAt = now.toISOString().replace('T', ' ').slice(0, 19);
            const title = `BÁO CÁO SO SÁNH THÁNG`;
            // Title
            (sheet as unknown as ExcelSheet).mergeCells!(1, 1, 1, 7);
            const titleCell = sheet.getCell('A1') as ExcelCell;
            titleCell.value = title;
            titleCell.font = { name: 'Arial', size: 14, bold: true } as unknown;
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' } as unknown;

            sheet.getCell('A2').value = 'Đơn vị'; sheet.getCell('B2').value = 'NHAKHOA CRM';
            sheet.getCell('A3').value = 'Thời gian xuất'; sheet.getCell('B3').value = exportedAt;
            sheet.getCell('A4').value = 'Khoảng'; sheet.getCell('B4').value = `${compareMonthA} -> ${compareMonthB}`;
            sheet.getCell('A5').value = 'Mô tả'; sheet.getCell('B5').value = 'So sánh lượt và doanh thu theo dịch vụ';
            sheet.addRow([]);

            // Headers
            const headerRowNumber = 7;
            const headerRow = sheet.getRow(headerRowNumber);
            const headers = ['Dịch vụ', `Lượt ${compareMonthA}`, `Doanh thu ${compareMonthA}`, `Lượt ${compareMonthB}`, `Doanh thu ${compareMonthB}`, 'Chênh lệch lượt', 'Chênh lệch doanh thu'];
            sheet.columns = [
                { header: headers[0], key: 'service', width: 40 },
                { header: headers[1], key: 'a_count', width: 14 },
                { header: headers[2], key: 'a_revenue', width: 18 },
                { header: headers[3], key: 'b_count', width: 14 },
                { header: headers[4], key: 'b_revenue', width: 18 },
                { header: headers[5], key: 'delta_count', width: 14 },
                { header: headers[6], key: 'delta_rev', width: 18 },
            ];

            headers.forEach((h, idx) => {
                const cell = headerRow.getCell(idx + 1) as ExcelCell;
                cell.value = h;
                cell.font = { bold: true, name: 'Arial', size: 11 } as unknown;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as unknown;
                cell.alignment = { horizontal: 'center', vertical: 'middle' } as unknown;
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as unknown;
            });
            headerRow.height = 20;
            sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

            // Rows
            let rowIndex = headerRowNumber + 1;
            serviceCompareData.forEach((r, idx) => {
                const row = sheet.getRow(rowIndex);
                row.getCell(1).value = r.name;
                row.getCell(2).value = r.a_count;
                row.getCell(3).value = r.a_revenue;
                row.getCell(4).value = r.b_count;
                row.getCell(5).value = r.b_revenue;
                row.getCell(6).value = r.b_count - r.a_count;
                row.getCell(7).value = r.b_revenue - r.a_revenue;

                const isAlt = idx % 2 === 1;
                if (row.eachCell) row.eachCell({ includeEmpty: true } as unknown, (cell: ExcelCell) => {
                    if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } } as unknown;
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as unknown;
                });

                // number formats for revenue columns
                try { row.getCell(3).numFmt = '#,##0'; } catch (e) { console.warn(e); }
                try { row.getCell(5).numFmt = '#,##0'; } catch (e) { console.warn(e); }
                try { row.getCell(7).numFmt = '#,##0'; } catch (e) { console.warn(e); }

                if (row.commit) row.commit();
                rowIndex++;
            });

            const buf = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buf as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `compare-${compareMonthA}-vs-${compareMonthB}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('exportCompareXlsx error', err);
            alert('Lỗi khi xuất Excel (so sánh).');
        } finally {
            setExportingXlsx(false);
        }
    };


    const dentistTableRaw: DentistTableEntry[] = (dentistStats && dentistStats.length > 0)
        ? dentistStats.map(d => ({
            dentistId: d.dentistId,
            name: d.dentistName,
            total: d.totalAppointments,
            revenue: (typeof (d as unknown as { totalRevenue?: number }).totalRevenue === 'number'
                ? (d as unknown as { totalRevenue?: number }).totalRevenue
                : (dentistRevenue[d.dentistId] || 0)) as number,
            serviceCounts: (d.serviceCounts || {}) as Record<string, number>,
            phone: allDentists.find(a => a.id === d.dentistId)?.phone,
            email: allDentists.find(a => a.id === d.dentistId)?.email,
        }))
        : (allDentists && allDentists.length > 0 ? allDentists.map(d => ({
            dentistId: d.id,
            name: d.name,
            total: (dentistToAppointments[d.id] || []).length,
            revenue: dentistRevenue[d.id] || 0,
            serviceCounts: computeServiceCounts(dentistToAppointments[d.id] || []),
            phone: d.phone,
            email: d.email
        })) : []);

    let dentistTableFiltered = dentistTableRaw
        .filter(d => d.name.toLowerCase().includes(dentistSearch.trim().toLowerCase()))
        .sort((a, b) =>
            dentistSort === 'appointments'
                ? b.total - a.total
                : (b.revenue ?? 0) - (a.revenue ?? 0)
        );
    if (!showAllDentists && dentistTopN > 0) {
        dentistTableFiltered = dentistTableFiltered.slice(0, dentistTopN);
    }

    // Export: By Dentist with Charts
    const exportByDentistXlsx = async () => {
        try {
            setExportingXlsx(true);
            const mod = await import('exceljs');
            type ExcelCell = { value?: unknown; font?: unknown; alignment?: unknown; fill?: unknown; border?: unknown };
            type ExcelRow = { getCell: (n: number) => ExcelCell; eachCell?: (opts: unknown, cb: (cell: ExcelCell) => void) => void; commit?: () => void; height?: number };
            type ExcelSheet = { columns?: unknown; addRow: (row: unknown) => void; autoFilter?: unknown; lastRow?: { number: number }; getRow: (n: number) => ExcelRow; getCell: (c: string) => ExcelCell; views?: unknown; mergeCells?: (...args: unknown[]) => void; addChart?: (chart: unknown) => void };
            type ExcelWorkbook = { addWorksheet: (name: string, options?: unknown) => ExcelSheet; xlsx: { writeBuffer: () => Promise<Uint8Array | ArrayBuffer> } };
            const ExcelJS = (mod as unknown) as { Workbook: new () => ExcelWorkbook; BarChart: new () => unknown; PieChart: new () => unknown };
            const workbook = new ExcelJS.Workbook();

            const now = new Date();
            const exportedAt = now.toISOString().replace('T', ' ').slice(0, 19);

            // ========== SHEET 1: BIỂU ĐỒ & TỔNG HỢP ==========
            const summarySheet = workbook.addWorksheet('📊 Biểu Đồ', { pageSetup: { paperSize: 9, orientation: 'landscape' } });

            // Title
            (summarySheet as unknown as ExcelSheet).mergeCells!(1, 1, 1, 6);
            const titleCell = summarySheet.getCell('A1') as unknown as { value?: unknown; font?: unknown; alignment?: unknown; fill?: unknown };
            titleCell.value = 'PHÂN TÍCH NHA SĨ - BIỂU ĐỒ THỐNG KÊ';
            titleCell.font = { bold: true, name: 'Arial', size: 14, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            summarySheet.getRow(1).height = 25;

            summarySheet.getCell('A2').value = 'Thời gian báo cáo:';
            summarySheet.getCell('B2').value = `${startDate} đến ${endDate}`;
            summarySheet.getCell('A3').value = 'Ngày xuất:';
            summarySheet.getCell('B3').value = exportedAt;

            // Prepare data for charts
            const chartData = dentistTableRaw.map(d => ({
                name: d.name,
                total: d.total,
                revenue: d.revenue || 0,
            }));

            // Create summary table for chart data (rows 5-N)
            const dataStartRow = 5;
            ((summarySheet as unknown as { getCell: (row: number, col: number) => unknown }).getCell(dataStartRow, 1) as unknown as { value: unknown }).value = 'Nha Sĩ';
            ((summarySheet as unknown as { getCell: (row: number, col: number) => unknown }).getCell(dataStartRow, 2) as unknown as { value: unknown }).value = 'Số Lượt';
            ((summarySheet as unknown as { getCell: (row: number, col: number) => unknown }).getCell(dataStartRow, 3) as unknown as { value: unknown }).value = 'Doanh Thu (VNĐ)';
            [1, 2, 3].forEach(i => {
                const cell = (summarySheet as unknown as { getCell: (row: number, col: number) => unknown }).getCell(dataStartRow, i) as unknown as { font?: unknown; fill?: unknown };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
            });

            chartData.forEach((d, idx) => {
                const row = dataStartRow + idx + 1;
                ((summarySheet as unknown as { getCell: (row: number, col: number) => unknown }).getCell(row, 1) as unknown as { value: unknown }).value = d.name;
                ((summarySheet as unknown as { getCell: (row: number, col: number) => unknown }).getCell(row, 2) as unknown as { value: unknown }).value = d.total;
                ((summarySheet as unknown as { getCell: (row: number, col: number) => unknown }).getCell(row, 3) as unknown as { value: unknown }).value = d.revenue;
                const cCell = (summarySheet as unknown as { getCell: (row: number, col: number) => unknown }).getCell(row, 3) as unknown as { numFmt?: string };
                cCell.numFmt = '#,##0';
            });

            // Add Bar Chart for Appointments
            try {
                const barChart = new ExcelJS.BarChart() as unknown as { type?: string; style?: number; title?: string; x_axis?: { title?: string }; y_axis?: { title?: string }; addSeries?: (s: unknown) => void; setcategories?: (c: string) => void; anchor?: string; width?: unknown };
                barChart.type = 'bar';
                barChart.style = 10;
                barChart.title = 'Số Lượt Hẹn Theo Nha Sĩ';
                if (barChart.x_axis) barChart.x_axis.title = 'Nha Sĩ';
                if (barChart.y_axis) barChart.y_axis.title = 'Số Lượt';
                barChart.addSeries?.({
                    name: 'Số Lượt',
                    ref: `'📊 Biểu Đồ'!$B$${dataStartRow}:$B$${dataStartRow + chartData.length}`,
                });
                barChart.setcategories?.(`'📊 Biểu Đồ'!$A$${dataStartRow + 1}:$A$${dataStartRow + chartData.length}`);
                summarySheet.addChart?.(barChart);
                barChart.anchor = `A${dataStartRow + chartData.length + 3}`;
                barChart.width = { width: 15, height: 10 };
            } catch (e) {
                console.warn('BarChart not available', e);
            }

            // Add Pie Chart for Revenue Distribution
            try {
                const pieChart = new ExcelJS.PieChart() as unknown as { title?: string; addSeries?: (s: unknown) => void; setcategories?: (c: string) => void; anchor?: string; width?: unknown };
                pieChart.title = 'Phân Bổ Doanh Thu';
                pieChart.addSeries?.({
                    name: 'Doanh Thu',
                    ref: `'📊 Biểu Đồ'!$C$${dataStartRow}:$C$${dataStartRow + chartData.length}`,
                });
                pieChart.setcategories?.(`'📊 Biểu Đồ'!$A$${dataStartRow + 1}:$A$${dataStartRow + chartData.length}`);
                summarySheet.addChart?.(pieChart);
                pieChart.anchor = `F${dataStartRow + chartData.length + 3}`;
                pieChart.width = { width: 15, height: 10 };
            } catch (e) {
                console.warn('PieChart not available', e);
            }

            summarySheet.columns = [{ width: 30 }, { width: 14 }, { width: 18 }];

            // ========== SHEET 2: CHI TIẾT NHA SĨ ==========
            const sheet = workbook.addWorksheet('👨‍⚕️ Chi Tiết');
            const cols = [
                { key: 'id', header: 'ID', width: 12 },
                { key: 'name', header: 'Nha si', width: 32 },
                { key: 'phone', header: 'Điện thoại', width: 18 },
                { key: 'email', header: 'Email', width: 28 },
                { key: 'total', header: 'Số lượt', width: 12 },
                { key: 'revenue', header: 'Doanh thu (đ)', width: 18 },
                { key: 'top', header: 'Dịch vụ thực hiện (top)', width: 48 },
            ];
            sheet.columns = cols;

            const reportTitle = 'BÁO CÁO: NHA SĨ - THỐNG KÊ DỊCH VỤ';
            const lastCol = cols.length;
            (sheet as unknown as ExcelSheet).mergeCells!(1, 1, 1, lastCol);
            const titleCell2 = sheet.getCell('A1') as ExcelCell;
            titleCell2.value = reportTitle;
            titleCell2.font = { name: 'Arial', size: 14, bold: true } as unknown;
            titleCell2.alignment = { horizontal: 'center', vertical: 'middle' } as unknown;

            sheet.getCell('A2').value = 'Đơn vị'; sheet.getCell('B2').value = 'NHAKHOA CRM';
            sheet.getCell('A3').value = 'Thời gian xuất'; sheet.getCell('B3').value = exportedAt;
            sheet.getCell('A4').value = 'Khoảng'; sheet.getCell('B4').value = `${startDate} -> ${endDate}`;
            sheet.addRow([]);

            const headerRowNumber = 8;
            const headerRow = sheet.getRow(headerRowNumber);
            cols.forEach((c, idx) => {
                const cell = headerRow.getCell(idx + 1) as ExcelCell;
                const headerLabel = (c as { header?: string }).header || '';
                cell.value = headerLabel;
                cell.font = { bold: true, name: 'Arial', size: 11 } as unknown;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } } as unknown;
                cell.alignment = { horizontal: 'center', vertical: 'middle' } as unknown;
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as unknown;
            });
            headerRow.height = 20;
            sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

            let rowIndex = headerRowNumber + 1;
            dentistTableRaw.forEach((d, idx) => {
                const top = d.serviceCounts && Object.keys(d.serviceCounts).length ? Object.entries(d.serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(s => `${s[0]} (${s[1]})`).join('; ') : '';
                const row = sheet.getRow(rowIndex);
                row.getCell(1).value = d.dentistId;
                row.getCell(2).value = d.name;
                row.getCell(3).value = d.phone || '';
                row.getCell(4).value = d.email || '';
                row.getCell(5).value = d.total;
                row.getCell(6).value = d.revenue || 0;
                row.getCell(7).value = top;
                const isAlt = idx % 2 === 1;
                if (row.eachCell) row.eachCell({ includeEmpty: true } as unknown, (cell: ExcelCell) => {
                    if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } } as unknown;
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as unknown;
                });
                if (row.commit) row.commit();
                rowIndex++;
            });

            sheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber, column: lastCol } };

            const buf = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buf as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bao_Cao_Nha_Si_${(new Date()).toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('exportByDentistXlsx error', err);
            alert('Lỗi khi xuất Excel (nha sĩ).');
        } finally {
            setExportingXlsx(false);
        }
    };

    // Export: Full report (Overview + Services + Dentists) - BÁOS CÁO DOANH NGHIỆP
    const exportFullStatsXlsx = async () => {
        try {
            setExportingXlsx(true);
            const mod = await import('exceljs');
            type ExcelSheet = { columns?: unknown; addRow: (row: unknown) => void; autoFilter?: unknown; lastRow?: { number: number }; mergeCells?: (...args: unknown[]) => void; getRow?: (n: number) => unknown };
            type ExcelWorkbook = { addWorksheet: (name: string, options?: unknown) => ExcelSheet; xlsx: { writeBuffer: () => Promise<Uint8Array | ArrayBuffer> } };
            type ExcelModule = { Workbook: new () => ExcelWorkbook };
            const ExcelJS = (mod as unknown) as ExcelModule;
            const workbook = new ExcelJS.Workbook();

            const now = new Date();
            const exportedAt = now.toISOString().replace('T', ' ').slice(0, 19);

            // ========== SHEET 1: BÁO CÁO TỔNG HỢP ==========
            const summary = (workbook as unknown as { addWorksheet: (name: string, opts: unknown) => unknown }).addWorksheet('📊 Báo Cáo Tổng Hợp', { pageSetup: { paperSize: 9, orientation: 'portrait' } }) as unknown as ExcelSheet;

            // Header
            (summary as unknown as ExcelSheet).mergeCells!(1, 1, 1, 5);
            const titleCell = (summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(1, 1) as unknown as { value?: unknown; font?: unknown; alignment?: unknown; fill?: unknown };
            titleCell.value = 'BÁO CÁO THỐNG KÊ DOANH SỐ DỊCH VỤ';
            titleCell.font = { bold: true, name: 'Arial', size: 16, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            ((summary as unknown as { getRow: (n: number) => unknown }).getRow(1) as unknown as { height?: number }).height = 30;

            ((summary as unknown as { getRow: (n: number) => unknown }).getRow(2) as unknown as { height?: number }).height = 3;

            // Company info
            const infoStartRow = 3;
            (summary as unknown as ExcelSheet).mergeCells!(infoStartRow, 1, infoStartRow, 2);
            ((summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(infoStartRow, 1) as unknown as { value: unknown }).value = 'Tên Công Ty:';
            (summary as unknown as ExcelSheet).mergeCells!(infoStartRow, 3, infoStartRow, 5);
            ((summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(infoStartRow, 3) as unknown as { value: unknown }).value = 'NHA KHOA CRM - QUẢN LÝ BỆNH NHÂN';
            ((summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(infoStartRow+1, 1) as unknown as { value: unknown }).value = 'Thời gian báo cáo:';
            (summary as unknown as ExcelSheet).mergeCells!(infoStartRow+1, 3, infoStartRow+1, 5);
            ((summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(infoStartRow+1, 3) as unknown as { value: unknown }).value = `${startDate} đến ${endDate}`;
            ((summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(infoStartRow+2, 1) as unknown as { value: unknown }).value = 'Ngày xuất báo cáo:';
            (summary as unknown as ExcelSheet).mergeCells!(infoStartRow+2, 3, infoStartRow+2, 5);
            ((summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(infoStartRow+2, 3) as unknown as { value: unknown }).value = exportedAt;

            // KPI Summary
            const kpiRow = infoStartRow + 4;
            (summary as unknown as { getRow: (n: number) => { height?: number } }).getRow(kpiRow).height = 20;
            const kpiHeaders = ['CHỈ TIÊU', 'GIÁ TRỊ', 'GHI CHÚ'];
            kpiHeaders.forEach((h, i) => {
                const cell = (summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(kpiRow, i + 1) as unknown as { value?: unknown; font?: unknown; fill?: unknown; alignment?: unknown; border?: unknown };
                cell.value = h;
                cell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            const kpis = [
                { name: 'Tổng số lượt hẹn', value: filteredAppointments.length, note: 'Tất cả trạng thái' },
                { name: 'Tổng lượt COMPLETED', value: completedAppointments.length, note: 'Đã hoàn thành' },
                { name: 'Tổng doanh thu (VNĐ)', value: totalRevenue, note: 'Chỉ từ COMPLETED' },
                { name: 'Trung bình doanh thu/lượt', value: completedAppointments.length > 0 ? Math.round(totalRevenue / completedAppointments.length) : 0, note: 'VNĐ' },
                { name: 'Số dịch vụ sử dụng', value: totalServices, note: '' },
                { name: 'Số nha sĩ tham gia', value: dentistTableRaw.length, note: '' },
            ];

            kpis.forEach((kpi, idx) => {
                const row = kpiRow + idx + 1;
                const nameCell = (summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(row, 1) as unknown as { value?: unknown; font?: unknown; border?: unknown };
                nameCell.value = kpi.name;
                nameCell.font = { name: 'Arial', size: 10 };
                nameCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                const valCell = (summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(row, 2) as unknown as { value?: unknown; numFmt?: string; font?: unknown; border?: unknown };
                valCell.value = kpi.value;
                valCell.numFmt = '#,##0';
                valCell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF1F4E78' } };
                valCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                const noteCell = (summary as unknown as { getCell: (row: number, col: number) => unknown }).getCell(row, 3) as unknown as { value?: unknown; font?: unknown; border?: unknown };
                noteCell.value = kpi.note;
                noteCell.font = { name: 'Arial', size: 9, italic: true };
                noteCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            summary.columns = [{ width: 35 }, { width: 18 }, { width: 25 }];

            // ========== SHEET 2: CHI TIẾT DỊCH VỤ ==========
            const svcSheet = (workbook as unknown as { addWorksheet: (name: string, opts: unknown) => unknown }).addWorksheet('🏥 Dịch Vụ', { pageSetup: { paperSize: 9, orientation: 'landscape' } }) as unknown as ExcelSheet;
            svcSheet.columns = [
                { header: 'STT', key: 'stt', width: 6 },
                { header: 'Tên Dịch Vụ', key: 'service', width: 35 },
                { header: 'Lượt Đặt', key: 'count', width: 12 },
                { header: 'Lượt Hoàn Thành', key: 'completed', width: 14 },
                { header: 'Đơn Giá (VNĐ)', key: 'unit', width: 15 },
                { header: 'Doanh Thu (VNĐ)', key: 'revenue', width: 16 },
                { header: 'Tỉ Lệ %', key: 'percent', width: 10 },
            ];

            const totalRev = totalRevenue || 0;
            let sttIndex = 1;
            const serviceEntries = Object.entries(serviceUsage).sort((a, b) => (completedRevenueByService[b[0]] ?? 0) - (completedRevenueByService[a[0]] ?? 0));
            
            serviceEntries.forEach(([name, data]) => {
                const completedCount = completedAppointments.filter(a => a.serviceName === name).length;
                const unit = priceMap[name] ?? (data.count ? Math.round(data.totalPrice / data.count) : 0);
                const revenue = completedRevenueByService[name] ?? 0;
                const percent = totalRev ? Number(((revenue / totalRev) * 100).toFixed(2)) : 0;
                svcSheet.addRow({ 
                    stt: sttIndex++,
                    service: name, 
                    count: data.count,
                    completed: completedCount,
                    unit, 
                    revenue, 
                    percent 
                });
            });

            // Format Service sheet header
            const svcHeaderRow = (svcSheet as unknown as { getRow: (n: number) => unknown }).getRow(1) as unknown as { eachCell?: (cb: (cell: unknown) => void) => void; height?: number };
            if (svcHeaderRow?.eachCell) {
                svcHeaderRow.eachCell((cell: unknown) => {
                    const c = cell as { font?: unknown; fill?: unknown; alignment?: unknown; border?: unknown };
                    c.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FFFFFFFF' } };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
                    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                svcHeaderRow.height = 20;
            }

            // Totals row
            const totalSvcRow = (svcSheet.addRow({ 
                stt: '', 
                service: 'TỔNG CỘNG', 
                count: totalBookings,
                completed: completedAppointments.length,
                unit: '', 
                revenue: totalRev, 
                percent: 100 
            }) as unknown as { eachCell?: (cb: (cell: unknown) => void) => void });
            if (totalSvcRow?.eachCell) {
                totalSvcRow.eachCell((cell: unknown) => {
                    const c = cell as { font?: unknown; fill?: unknown; border?: unknown };
                    c.font = { bold: true, name: 'Arial', size: 11 };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } };
                    c.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
                });
            }

            // Format numbers in service sheet
            for (let i = 2; i <= (svcSheet as unknown as { rowCount?: number }).rowCount!; i++) {
                const row = (svcSheet as unknown as { getRow: (n: number) => unknown }).getRow(i) as unknown as { getCell: (col: number) => unknown };
                ([4, 5, 6] as const).forEach(col => {
                    const cell = row.getCell(col) as unknown as { numFmt?: string };
                    cell.numFmt = '#,##0';
                });
            }

            // ========== SHEET 3: CHI TIẾT NHA SĨ ==========
            const dSheet = (workbook as unknown as { addWorksheet: (name: string, opts: unknown) => unknown }).addWorksheet('👨‍⚕️ Nha Sĩ', { pageSetup: { paperSize: 9, orientation: 'landscape' } }) as unknown as ExcelSheet;
            dSheet.columns = [
                { header: 'STT', key: 'stt', width: 6 },
                { header: 'ID', key: 'id', width: 8 },
                { header: 'Tên Nha Sĩ', key: 'name', width: 28 },
                { header: 'Điện Thoại', key: 'phone', width: 14 },
                { header: 'Số Lượt', key: 'total', width: 12 },
                { header: 'Hoàn Thành', key: 'completed', width: 12 },
                { header: 'Tỉ Lệ Hoàn Thành %', key: 'completion', width: 16 },
                { header: 'Doanh Thu (VNĐ)', key: 'revenue', width: 16 },
                { header: 'Doanh Thu Trung Bình', key: 'avg_revenue', width: 16 },
            ];

            let dSttIndex = 1;
            const sortedDentists = [...dentistTableRaw].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));
            
            sortedDentists.forEach(d => {
                const completedCount = completedAppointments.filter(a => (a.dentistId ?? a.dentistRefId ?? a.dentistUserId) === d.dentistId).length;
                const completionRate = d.total > 0 ? ((completedCount / d.total) * 100) : 0;
                const avgRevenue = completedCount > 0 ? Math.round((d.revenue ?? 0) / completedCount) : 0;
                dSheet.addRow({ 
                    stt: dSttIndex++,
                    id: d.dentistId, 
                    name: d.name, 
                    phone: d.phone || '', 
                    total: d.total,
                    completed: completedCount,
                    completion: completionRate,
                    revenue: d.revenue || 0,
                    avg_revenue: avgRevenue,
                });
            });

            // Format Dentist sheet header
            const dHeaderRow = (dSheet as unknown as { getRow: (n: number) => unknown }).getRow(1) as unknown as { eachCell?: (cb: (cell: unknown) => void) => void; height?: number };
            if (dHeaderRow?.eachCell) {
                dHeaderRow.eachCell((cell: unknown) => {
                    const c = cell as { font?: unknown; fill?: unknown; alignment?: unknown; border?: unknown };
                    c.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FFFFFFFF' } };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
                    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                dHeaderRow.height = 20;
            }

            // Totals row
            const totalDentistCompleted = completedAppointments.length;
            const totalDentistRow = (dSheet.addRow({ 
                stt: '', 
                id: '', 
                name: 'TỔNG CỘNG', 
                phone: '', 
                total: sortedDentists.reduce((s, d) => s + d.total, 0),
                completed: totalDentistCompleted,
                completion: sortedDentists.reduce((s, d) => s + d.total, 0) > 0 ? ((totalDentistCompleted / sortedDentists.reduce((s, d) => s + d.total, 0)) * 100) : 0,
                revenue: sortedDentists.reduce((s, d) => s + (d.revenue || 0), 0),
                avg_revenue: totalDentistCompleted > 0 ? Math.round(sortedDentists.reduce((s, d) => s + (d.revenue || 0), 0) / totalDentistCompleted) : 0,
            }) as unknown as { eachCell?: (cb: (cell: unknown) => void) => void });
            if (totalDentistRow?.eachCell) {
                totalDentistRow.eachCell((cell: unknown) => {
                    const c = cell as { font?: unknown; fill?: unknown; border?: unknown };
                    c.font = { bold: true, name: 'Arial', size: 11 };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2DCDB' } };
                    c.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
                });
            }

            // Format numbers in dentist sheet
            for (let i = 2; i <= (dSheet as unknown as { rowCount?: number }).rowCount!; i++) {
                const row = (dSheet as unknown as { getRow: (n: number) => unknown }).getRow(i) as unknown as { getCell: (col: number) => unknown };
                ([7, 8, 9] as const).forEach(col => {
                    const cell = row.getCell(col) as unknown as { numFmt?: string };
                    cell.numFmt = '#,##0.00';
                });
            }

            // ========== SHEET 4: CHI TIẾT LỊCH HẸN ==========
            const appointmentSheet = (workbook as unknown as { addWorksheet: (name: string, opts: unknown) => unknown }).addWorksheet('📅 Lịch Hẹn', { pageSetup: { paperSize: 9, orientation: 'landscape' } }) as unknown as ExcelSheet;
            appointmentSheet.columns = [
                { header: 'STT', key: 'stt', width: 6 },
                { header: 'ID Lịch', key: 'id', width: 10 },
                { header: 'Khách Hàng', key: 'customer', width: 20 },
                { header: 'Điện Thoại', key: 'phone', width: 14 },
                { header: 'Dịch Vụ', key: 'service', width: 22 },
                { header: 'Nha Sĩ', key: 'dentist', width: 18 },
                { header: 'Ngày Hẹn', key: 'date', width: 12 },
                { header: 'Giờ', key: 'time', width: 8 },
                { header: 'Giá (VNĐ)', key: 'price', width: 12 },
                { header: 'Trạng Thái', key: 'status', width: 12 },
            ];

            let aSttIndex = 1;
            const sortedAppointments = [...filteredAppointments].sort((a, b) => 
                (new Date(b.scheduledTime as unknown as string).getTime()) - (new Date(a.scheduledTime as unknown as string).getTime())
            );

            sortedAppointments.forEach(a => {
                const price = getAppointmentPrice(a);
                appointmentSheet.addRow({
                    stt: aSttIndex++,
                    id: a.id ?? '',
                    customer: a.customerName ?? a.customerUsername ?? '',
                    phone: (a as unknown as { phone?: string }).phone ?? '',
                    service: a.serviceName ?? '',
                    dentist: a.dentistName ?? '',
                    date: a.scheduledTime ? new Date(a.scheduledTime).toLocaleDateString('vi-VN') : '',
                    time: a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
                    price,
                    status: a.status ?? ''
                });
            });

            // Format Appointment sheet header
            const aHeaderRow = (appointmentSheet as unknown as { getRow: (n: number) => unknown }).getRow(1) as unknown as { eachCell?: (cb: (cell: unknown) => void) => void; height?: number };
            if (aHeaderRow?.eachCell) {
                aHeaderRow.eachCell((cell: unknown) => {
                    const c = cell as { font?: unknown; fill?: unknown; alignment?: unknown; border?: unknown };
                    c.font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FFFFFFFF' } };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
                    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                aHeaderRow.height = 20;
            }

            // Format numbers and colors in appointment sheet
            for (let i = 2; i <= (appointmentSheet as unknown as { rowCount?: number }).rowCount!; i++) {
                const row = (appointmentSheet as unknown as { getRow: (n: number) => unknown }).getRow(i) as unknown as { getCell: (col: number) => unknown };
                const priceCell = row.getCell(9) as unknown as { numFmt?: string };
                priceCell.numFmt = '#,##0';
                
                const statusCell = row.getCell(10) as unknown as { fill?: unknown };
                const status = (row.getCell(10) as unknown as { value?: unknown }).value as string;
                if (status?.toString().toUpperCase() === 'COMPLETED') {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
                } else {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                }
            }

            const buf = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buf as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `BaoCao_ThongKe_DichVu_${now.toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('exportFullStatsXlsx error', err);
            alert('Lỗi khi xuất Excel (toàn bộ).');
        } finally {
            setExportingXlsx(false);
        }
    };

    // fallback list used in the simpler table when dentistStats isn't available
    const dentistFallback = (allDentists && allDentists.length > 0 ? allDentists : []) as Dentist[];

    // Tính toán các chỉ số tổng quan
    const totalBookings = pieChartData.reduce((sum, data) => sum + data.count, 0);
    const totalRevenue = pieChartData.reduce((sum, data) => sum + data.totalPrice, 0);
    const totalServices = Object.keys(serviceUsage).length;

    // Color palette for services
    const colorPalette = [
        '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
        '#43e97b', '#38f9d7', '#fa709a', '#fee140', '#30b0fe',
        '#a8edea', '#fed6e3', '#ff9a56', '#ff6b9d', '#c44569',
        '#1dd1a1', '#10ac84', '#ee5a6f', '#f368e0', '#ff6348'
    ];

    // Custom Tooltip cho PieChart để hiển thị chi tiết hơn


    const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as ServiceData;
            return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-md">
                    <p className="font-bold text-lg mb-1">{data.name}</p>
                    <p className="text-sm">Lượt đặt: <span className="font-semibold text-blue-600">{data.count.toLocaleString()}</span></p>
                    <p className="text-sm">Doanh thu: <span className="font-semibold text-green-600">{data.totalPrice.toLocaleString('vi-VN')} đ</span></p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-y-4">
                <motion.div
                    initial={{ scale: 0 }}
                    transition={{ duration: 1, type: "spring", stiffness: 200 }}
                    className="relative h-24 w-24 rounded-full border-4 border-t-4 border-gray-200"
                >
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin-slow"></div>
                </motion.div>
                <div className="flex items-center text-lg font-semibold text-gray-600">
                    <CircularProgress />
                </div>
            </div>
        );
    }

    return (
        <>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div className="min-h-screen bg-gradient-to-br  rounded-xl from-gray-50 to-gray-100">
                    {/* Modern Header Section */}
                    <div className="bg-gradient-to-r from-indigo-600 rounded-xl via-purple-600 to-pink-600 text-white px-4 sm:px-8 py-8 shadow-lg">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                    <h1 className="text-4xl sm:text-5xl font-bold mb-2">📊 Thống Kê Dịch Vụ</h1>
                                    <p className="text-purple-100 text-sm sm:text-base">Phân tích chi tiết lượt đặt lịch, doanh thu và hiệu suất nhân viên</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-purple-100 text-sm mb-1">Thời điểm cập nhật:</p>
                                    <p className="text-white font-semibold">{currentTime}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8 max-w-8xl mx-auto">
                        {/* Range controls - Modern Card Style */}
                        <Card className="shadow-lg mb-6 border-0">
                            <CardContent className="p-6">
                                <Typography variant="h6" className="font-bold mb-4 text-gray-800">Bộ lọc thời gian</Typography>
                                <Box className="flex flex-col sm:flex-row items-start sm:items-center mt-10 gap-3">
                                    <FormControl size="small" className="w-full sm:w-auto">
                                        <InputLabel id="range-mode-label">Chế độ</InputLabel>
                                        <Select
                                            labelId="range-mode-label"
                                            value={rangeMode}
                                            label="Chế độ"
                                            onChange={(e: SelectChangeEvent) => setRangeMode(e.target.value as 'between' | 'range')}
                                        >
                                            <MenuItem value="range">Theo chuẩn</MenuItem>
                                            <MenuItem value="between">Theo khoảng thời gian</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {rangeMode === 'between' ? (
                                        <div className="flex md:items-center md:flex-row flex-col gap-2">
                                            <div className="w-full sm:w-auto">
                                                <DatePicker
                                                    label="Từ ngày"
                                                    value={startDate ? dayjs(startDate) : null}
                                                    format="YYYY-MM-DD"
                                                    onChange={(v) => { const d = v as unknown as Dayjs | null; setStartDate(d ? d.format('YYYY-MM-DD') : ''); }}
                                                    slotProps={{ textField: { size: 'small' } }}
                                                />
                                            </div>
                                            <span className="hidden sm:inline">-</span>
                                            <div className="w-full sm:w-auto">
                                                <DatePicker
                                                    label="Đến ngày"
                                                    value={endDate ? dayjs(endDate) : null}
                                                    format="YYYY-MM-DD"
                                                    onChange={(v) => { const d = v as unknown as Dayjs | null; setEndDate(d ? d.format('YYYY-MM-DD') : ''); }}
                                                    slotProps={{ textField: { size: 'small' } }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <FormControl size="small" className="w-full sm:w-auto">
                                                <InputLabel id="range-type-label">Loại</InputLabel>
                                                <Select
                                                    labelId="range-type-label"
                                                    value={rangeType}
                                                    label="Loại"
                                                    onChange={(e: SelectChangeEvent) => setRangeType(e.target.value as 'day' | 'month' | 'year')}
                                                >
                                                    <MenuItem value="day">Ngày</MenuItem>
                                                    <MenuItem value="month">Tháng</MenuItem>
                                                    <MenuItem value="year">Năm</MenuItem>
                                                </Select>
                                            </FormControl>
                                            <div className="w-full sm:w-auto">
                                                <DatePicker
                                                    label={rangeType === 'month' ? 'Chọn tháng' : rangeType === 'year' ? 'Chọn năm' : 'Chọn ngày'}
                                                    views={rangeType === 'month' ? ['year', 'month'] : rangeType === 'year' ? ['year'] : undefined}
                                                    openTo={rangeType === 'month' ? 'month' : rangeType === 'year' ? 'year' : 'day'}
                                                    value={startDate ? dayjs(startDate) : null}
                                                    format={rangeType === 'month' ? 'YYYY-MM' : rangeType === 'year' ? 'YYYY' : 'YYYY-MM-DD'}
                                                    onChange={(v) => {
                                                        const d = v as unknown as Dayjs | null;
                                                        if (!d) { setStartDate(''); return; }
                                                        if (rangeType === 'month') setStartDate(`${d.format('YYYY-MM')}-01`);
                                                        else if (rangeType === 'year') setStartDate(`${d.format('YYYY')}-01-01`);
                                                        else setStartDate(d.format('YYYY-MM-DD'));
                                                    }}
                                                    slotProps={{ textField: { size: 'small' } }}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <Button variant="contained" onClick={handleApply} disabled={applyingRange} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textTransform: 'none', fontWeight: 600 }}>
                                        {applyingRange ? 'Áp dụng...' : 'Áp dụng'}
                                    </Button>
                                    <Button variant="outlined" onClick={handleResetFilters} disabled={applyingRange} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                        Đặt lại bộ lọc
                                    </Button>
                                    <Button variant="outlined" onClick={handleShowAllMonths} disabled={applyingRange} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                        Hiển thị tất cả các tháng
                                    </Button>
                                    <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={openExportMenu} disabled={exportingXlsx}>
                                        {exportingXlsx ? 'Đang xuất...' : 'Xuất Excel'}
                                    </Button>
                                    <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={closeExportMenu}>
                                        <MenuItem onClick={() => { closeExportMenu(); exportFullStatsXlsx(); }}>Xuất: Toàn bộ thống kê</MenuItem>
                                        <MenuItem onClick={() => { closeExportMenu(); exportByDentistXlsx(); }}>Xuất: Theo nha sĩ</MenuItem>
                                    </Menu>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Compare section */}
                        <Card className="shadow-lg mb-6 border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="checkbox" checked={compareMonthsEnabled} onChange={(e) => setCompareMonthsEnabled(e.target.checked)} className="w-4 h-4" />
                                        <span className="font-semibold text-gray-700">So sánh hai tháng</span>
                                    </label>
                                </div>
                                {compareMonthsEnabled && (
                                    <div className="flex md:items-center md:flex-row flex-col gap-3">
                                        <DatePicker
                                            label="Tháng A"
                                            views={['year', 'month']}
                                            openTo="month"
                                            value={compareMonthA ? dayjs(compareMonthA + '-01') : null}
                                            format="YYYY-MM"
                                            onChange={(v) => { const d = v as unknown as Dayjs | null; setCompareMonthA(d ? d.format('YYYY-MM') : ''); }}
                                            slotProps={{ textField: { size: 'small' } }}
                                        />
                                        <span className="text-gray-600 font-bold">vs</span>
                                        <DatePicker
                                            label="Tháng B"
                                            views={['year', 'month']}
                                            openTo="month"
                                            value={compareMonthB ? dayjs(compareMonthB + '-01') : null}
                                            format="YYYY-MM"
                                            onChange={(v) => { const d = v as unknown as Dayjs | null; setCompareMonthB(d ? d.format('YYYY-MM') : ''); }}
                                            slotProps={{ textField: { size: 'small' } }}
                                        />
                                        <Button size="small" variant="contained" onClick={async () => { await loadComparisonMonths(compareMonthA, compareMonthB); }} disabled={compareLoading} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{compareLoading ? 'Đang...' : 'So sánh'}</Button>
                                        <Button size="small" variant="text" onClick={() => { setCompareMonthsEnabled(false); setServiceCompareData([]); }}>Hủy</Button>
                                        {serviceCompareData && serviceCompareData.length > 0 && (
                                            <Button size="small" color="primary" variant="contained" onClick={() => setCompareDialogOpen(true)}>Xem chi tiết</Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>



                        {/* Enhanced Metric Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* Card 1: Total Revenue */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                                <Card className="h-full shadow-lg border-l-4 border-blue-600 hover:shadow-xl transition-shadow duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                                                <FaDollarSign className="text-2xl" />
                                            </div>
                                            <span className="text-green-600 text-sm font-semibold">↑ 12.5%</span>
                                        </div>
                                        <Typography variant="body2" className="text-gray-500 mb-1">Tổng Doanh Thu</Typography>
                                        <Typography variant="h5" className="font-bold text-gray-900 mb-2">
                                            {totalRevenue.toLocaleString('vi-VN')} đ
                                        </Typography>
                                        <Typography variant="caption" className="text-gray-400">Từ tất cả dịch vụ</Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Card 2: Total Bookings */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <Card className="h-full shadow-lg border-l-4 border-purple-600 hover:shadow-xl transition-shadow duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
                                                <FaCalendarCheck className="text-2xl" />
                                            </div>
                                            <span className="text-green-600 text-sm font-semibold">↑ 8.3%</span>
                                        </div>
                                        <Typography variant="body2" className="text-gray-500 mb-1">Tổng Lượt Đặt</Typography>
                                        <Typography variant="h5" className="font-bold text-gray-900 mb-2">
                                            {totalBookings.toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" className="text-gray-400">Lịch hẹn trong kỳ</Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Card 3: Active Services */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <Card className="h-full shadow-lg border-l-4 border-green-600 hover:shadow-xl transition-shadow duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                                                <FaChartBar className="text-2xl" />
                                            </div>
                                            <span className="text-blue-600 text-sm font-semibold">= 0%</span>
                                        </div>
                                        <Typography variant="body2" className="text-gray-500 mb-1">Dịch Vụ Hoạt Động</Typography>
                                        <Typography variant="h5" className="font-bold text-gray-900 mb-2">
                                            {totalServices.toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" className="text-gray-400">Trong hệ thống</Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Card 4: Avg Revenue Per Service */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <Card className="h-full shadow-lg border-l-4 border-pink-600 hover:shadow-xl transition-shadow duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="bg-pink-100 text-pink-600 p-3 rounded-lg">
                                                <FaDollarSign className="text-2xl" />
                                            </div>
                                            <span className="text-yellow-600 text-sm font-semibold">↓ 3.2%</span>
                                        </div>
                                        <Typography variant="body2" className="text-gray-500 mb-1">Trung Bình/Dịch Vụ</Typography>
                                        <Typography variant="h5" className="font-bold text-gray-900 mb-2">
                                            {totalServices ? (totalRevenue / totalServices).toLocaleString('vi-VN') : 0} đ
                                        </Typography>
                                        <Typography variant="caption" className="text-gray-400">Doanh thu trung bình</Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Comparison chart (if enabled) */}
                        {compareMonthsEnabled && serviceCompareData && serviceCompareData.length > 0 && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8">
                                <Card className="shadow-lg">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <Typography variant="h6" className="font-bold text-gray-800">So Sánh Hai Tháng</Typography>
                                            <Typography variant="body2" className="text-gray-500">{compareMonthA} ↔ {compareMonthB}</Typography>
                                        </div>
                                        <div style={{ width: '100%', height: 380 }}>
                                            <ResponsiveContainer width="100%" height={380}>
                                                <BarChart data={serviceCompareData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                                                    <YAxis tick={{ fontSize: 12 }} />
                                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                                    <Legend />
                                                    <Bar dataKey="a_count" name={`Lượt ${compareMonthA}`} fill="#667eea" radius={[8, 8, 0, 0]} />
                                                    <Bar dataKey="b_count" name={`Lượt ${compareMonthB}`} fill="#764ba2" radius={[8, 8, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                        <div className="mb-8">
                            <Card className="shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <Typography variant="h6" className="font-bold text-gray-800">Phân Bố Dịch Vụ Theo Lượt Đặt Lịch</Typography>
                                        <Chip label={`${serviceBarData.length} dịch vụ`} color="primary" size="small" />
                                    </div>
                                    <div ref={serviceChartRef} style={{ width: '100%', height: 380 }}>
                                        <ResponsiveContainer width="100%" height={380}>
                                            <BarChart
                                                data={serviceBarData}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                                <Bar dataKey="count" name="Lượt đặt" radius={[8, 8, 0, 0]}>
                                                    {serviceBarData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={colorPalette[index % colorPalette.length]} />
                                                    ))}
                                                    <LabelList dataKey="count" position="top" formatter={(val: number) => val.toLocaleString()} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Color legend */}
                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                        <Typography variant="body2" className="font-semibold text-gray-700 mb-3">Chú thích màu sắc:</Typography>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {serviceBarData.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div 
                                                        className="w-4 h-4 rounded" 
                                                        style={{ backgroundColor: colorPalette[idx % colorPalette.length] }}
                                                    ></div>
                                                    <span className="text-xs text-gray-600 truncate">{item.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Tabs for different views */}
                        <div className="mb-6">
                            <Box sx={{ borderBottom: '2px solid #f0f0f0', mb: 3 }}>
                                <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="views" sx={{
                                    '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', height: 3 },
                                    '& .MuiTab-root': { fontWeight: 600, fontSize: '1rem', textTransform: 'none', color: '#9ca3af', '&.Mui-selected': { color: '#667eea' } }
                                }}>
                                    <Tab label=" Tổng Quan" />
                                    <Tab label=" Theo Dịch Vụ" />
                                    <Tab label=" Theo Nha Sĩ" />
                                </Tabs>
                            </Box>
                        </div>

                        {/* Bảng chi tiết dịch vụ / dịch vụ theo nha sĩ */}
                        <Card className="shadow-lg mb-8 border-0" >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <Typography variant="h6" className="font-bold text-gray-800">
                                        {tab === 0 ? ' Bảng Chi Tiết Toàn Bộ' : tab === 1 ? ' Chi Tiết Theo Dịch Vụ' : ' Chi Tiết Theo Nha Sĩ'}
                                    </Typography>
                                    {tab === 1 && (
                                        <Button size="small" variant="outlined" onClick={() => setShowAllServices(s => !s)} sx={{ textTransform: 'none' }}>
                                            {showAllServices ? ' Rút Gọn' : ' Xem Tất Cả'}
                                        </Button>
                                    )}
                                </div>

                                <div className="overflow-x-auto">
                                    {tab === 0 && (
                                        <>
                                            <div className="flex justify-end mb-2">
                                                <Button size="small" variant="text" onClick={() => setShowAllOverview(s => !s)}>{showAllOverview ? 'Rút gọn' : 'Xem tất cả'}</Button>
                                            </div>
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tên dịch vụ</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lượt đặt</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Đơn giá (VNĐ)</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Doanh thu (VNĐ)</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tỉ lệ doanh thu</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {overviewTableData.map((data, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer" onClick={() => { setDetailType('service'); setDetailKey(data.name); setDetailOpen(true); }}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.count.toLocaleString()}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{(priceMap[data.name] ?? (data.count ? Math.round(data.totalPrice / Math.max(data.count, 1)) : 0)).toLocaleString('vi-VN')} đ</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{(completedRevenueByService[data.name] ?? 0).toLocaleString('vi-VN')} đ</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                                                {totalRevenue ? (((completedRevenueByService[data.name] ?? 0) / totalRevenue) * 100).toFixed(2) : '0.00'}%
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </>
                                    )}

                                    {tab === 1 && (
                                        <div>
                                            {!showAllServices ? (
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tên dịch vụ</th>
                                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lượt đặt</th>
                                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Đơn giá (VNĐ)</th>
                                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Danh sách khách</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {Object.keys(serviceToAppointments).map((svc, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer" onClick={() => { setDetailType('service'); setDetailKey(svc); setDetailOpen(true); }}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{svc}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(serviceToAppointments[svc] || []).length}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(priceMap[svc] || 0).toLocaleString('vi-VN')} đ</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(serviceToAppointments[svc] || []).map((a: AppointmentItem) => a.customerName).slice(0, 3).join(', ')}{(serviceToAppointments[svc] || []).length > 3 ? '...' : ''}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="space-y-6">
                                                    {Object.entries(serviceToAppointments).map(([svc, appts]) => (
                                                        <div key={svc} className="bg-white rounded shadow-sm p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="font-semibold">{svc} • <span className="text-sm text-gray-600">{appts.length} lịch</span></div>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                    <thead className="bg-gray-50">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left">ID</th>
                                                                            <th className="px-3 py-2 text-left">Khách</th>
                                                                            <th className="px-3 py-2 text-left">Điện thoại</th>
                                                                            <th className="px-3 py-2 text-left">Nha sĩ</th>
                                                                            <th className="px-3 py-2 text-left">Chi nhánh</th>
                                                                            <th className="px-3 py-2 text-left">Ngày</th>
                                                                            <th className="px-3 py-2 text-left">Giờ</th>

                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white divide-y divide-gray-100">
                                                                        {appts.map((a, i) => (
                                                                            <tr key={i} className="hover:bg-gray-50">
                                                                                <td className="px-3 py-2">{a.id ?? '-'}</td>
                                                                                <td className="px-3 py-2">{a.customerName || a.customerUsername || '-'}</td>
                                                                                <td className="px-3 py-2">{(a as unknown as { phone?: string }).phone || '-'}</td>
                                                                                <td className="px-3 py-2">{a.dentistName || (a.dentistId ? allDentists.find(d => d.id === Number(a.dentistId))?.name : '-') || '-'}</td>
                                                                                <td className="px-3 py-2">{a.branchName || a.branchAddress || '-'}</td>
                                                                                <td className="px-3 py-2">{a.scheduledTime ? new Date(a.scheduledTime).toLocaleDateString() : '-'}</td>
                                                                                <td className="px-3 py-2">{a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString() : '-'}</td>

                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {tab === 2 && (
                                        (dentistStats && dentistStats.length > 0) ? (
                                            <div>
                                                <Card className="shadow-lg mb-4">
                                                    <CardContent>
                                                        <Typography variant="h6" className="mb-2">Thống kê theo nha sĩ</Typography>
                                                        <div ref={dentistChartRef}>
                                                            <ResponsiveContainer width="100%" height={280}>
                                                                <ComposedChart data={dentistChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                                                    <XAxis dataKey="name" />
                                                                    <YAxis yAxisId="left" />
                                                                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => Number(v).toLocaleString('vi-VN')} />
                                                                    <Tooltip />
                                                                    <Legend />
                                                                    <Bar yAxisId="left" dataKey="total" fill="#3B82F6" name="Số lượt" />
                                                                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" name="Doanh thu" />
                                                                </ComposedChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <div className="mb-4 flex flex-wrap items-center gap-3">
                                                    <TextField size="small" placeholder="Tìm nha sĩ" value={dentistSearch} onChange={(e) => setDentistSearch(e.target.value)} />
                                                    <FormControl size="small">
                                                        <InputLabel id="dentist-sort-label">Sắp xếp</InputLabel>
                                                        <Select labelId="dentist-sort-label" value={dentistSort} label="Sắp xếp" onChange={(e: SelectChangeEvent) => setDentistSort(e.target.value as 'appointments' | 'revenue')}>
                                                            <MenuItem value="appointments">Số lượt (giảm dần)</MenuItem>
                                                            <MenuItem value="revenue">Doanh thu (giảm dần)</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                    <FormControl size="small">
                                                        <InputLabel id="dentist-topn-label">Top</InputLabel>
                                                        <Select labelId="dentist-topn-label" value={String(dentistTopN)} label="Top" onChange={(e: SelectChangeEvent) => setDentistTopN(Number(e.target.value))}>
                                                            <MenuItem value={0}>Tất cả</MenuItem>
                                                            <MenuItem value={5}>Top 5</MenuItem>
                                                            <MenuItem value={10}>Top 10</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                    <Button size="small" variant="text" onClick={() => setShowAllDentists(s => !s)}>{showAllDentists ? 'Rút gọn' : 'Xem tất cả'}</Button>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    {!showAllDentists ? (
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nha sĩ</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Số lượt</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Điện thoại</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dịch vụ thực hiện (top)</th>

                                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Hành động</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {dentistTableFiltered.map((d) => (
                                                                    <tr key={d.dentistId} className="hover:bg-gray-50 transition-colors duration-150">
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.name}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.total}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.phone || '-'}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.email || '-'}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.serviceCounts && Object.keys(d.serviceCounts).length ? Object.entries(d.serviceCounts as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 3).map(s => `${s[0]} (${s[1]})`).join(', ') : ''}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                                            <Button size="small" variant="outlined" onClick={() => { setDetailType('dentist'); setDetailKey(d.dentistId); setDetailOpen(true); }}>Xem</Button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="space-y-6">
                                                            {dentistTableFiltered.map((d) => (
                                                                <div key={d.dentistId} className="bg-white rounded shadow-sm p-4">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <div className="font-semibold">{d.name} • <span className="text-sm text-gray-600">{d.total} lịch</span></div>
                                                                        <div className="text-sm text-gray-600">Doanh thu: {formatCurrency(d.revenue || 0)}</div>
                                                                    </div>
                                                                    <div className="overflow-x-auto">
                                                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                            <thead className="bg-gray-50">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left">ID</th>
                                                                                    <th className="px-3 py-2 text-left">Khách</th>
                                                                                    <th className="px-3 py-2 text-left">Điện thoại</th>
                                                                                    <th className="px-3 py-2 text-left">Dịch vụ</th>
                                                                                    <th className="px-3 py-2 text-left">Chi nhánh</th>
                                                                                    <th className="px-3 py-2 text-left">Ngày</th>
                                                                                    <th className="px-3 py-2 text-left">Giờ</th>

                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="bg-white divide-y divide-gray-100">
                                                                                {(dentistToAppointments[d.dentistId] || []).map((a, i) => (
                                                                                    <tr key={i} className="hover:bg-gray-50">
                                                                                        <td className="px-3 py-2">{a.id ?? '-'}</td>
                                                                                        <td className="px-3 py-2">{a.customerName || a.customerUsername || '-'}</td>
                                                                                        <td className="px-3 py-2">{(a as unknown as { phone?: string }).phone || '-'}</td>
                                                                                        <td className="px-3 py-2">{a.serviceName || '-'}</td>
                                                                                        <td className="px-3 py-2">{a.branchName || a.branchAddress || '-'}</td>
                                                                                        <td className="px-3 py-2">{a.scheduledTime ? new Date(a.scheduledTime).toLocaleDateString() : '-'}</td>
                                                                                        <td className="px-3 py-2">{a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString() : '-'}</td>

                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nha sĩ</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Số lượt</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Điện thoại</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dịch vụ thực hiện</th>

                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {dentistFallback.map((d) => (
                                                        <tr key={d.id} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer" onClick={() => { setDetailType('dentist'); setDetailKey(d.id); setDetailOpen(true); }}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(dentistToAppointments[d.id] || []).length}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(d.phone as string) || '-'}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(d.email as string) || '-'}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{topServicesForDentist(d.id, 3).join(', ')}{(Object.keys(computeServiceCounts(dentistToAppointments[d.id] || [])).length > 3) ? '...' : ''}</td>

                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </LocalizationProvider>
            {/* Detail dialog for service or dentist */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="lg">
                <DialogTitle>
                    {detailType === 'service' ? `Chi tiết dịch vụ: ${detailKey}` : detailType === 'dentist' ? `Chi tiết nha sĩ: ${selectedDentistName}` : ''}
                </DialogTitle>
                <DialogContent>
                    {detailType === 'service' && detailKey ? (
                        detailLoading ? (
                            <Typography>Đang tải...</Typography>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <Typography variant="subtitle1" className="font-semibold">{`Dịch vụ: ${detailKey}`}</Typography>
                                        <Typography variant="body2" className="text-gray-600">Số lượt: {detailAppointments.length} • Doanh thu: {formatCurrency(detailAppointments.reduce((s, a) => s + getAppointmentPrice(a), 0))}</Typography>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="small" variant="outlined" onClick={() => exportServiceDetailCSV(`service-${String(detailKey).replace(/\s+/g, '_')}.csv`)}>Xuất CSV</Button>
                                        <Button size="small" variant="text" onClick={() => setDetailOpen(false)}>Đóng</Button>
                                    </div>
                                </div>

                                {detailAppointments && detailAppointments.length > 0 ? (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>ID</TableCell>
                                                <TableCell>Khách</TableCell>
                                                <TableCell>Điện thoại</TableCell>
                                                <TableCell>Email</TableCell>
                                                <TableCell>Nha sĩ</TableCell>
                                                <TableCell>Chi nhánh</TableCell>
                                                <TableCell>Ngày</TableCell>
                                                <TableCell>Giờ</TableCell>
                                                <TableCell align="right">Giá</TableCell>
                                                <TableCell>Thời lượng</TableCell>
                                                <TableCell>Trạng thái</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {detailAppointments.map((a, i) => {
                                                const price = getAppointmentPrice(a);
                                                return (
                                                    <TableRow key={i} hover>
                                                        <TableCell>{a.id ?? i}</TableCell>
                                                        <TableCell>{a.customerName || a.customerUsername || '-'}</TableCell>
                                                        <TableCell>{(a as unknown as { phone?: string }).phone || '-'}</TableCell>
                                                        <TableCell>{a.customerEmail || '-'}</TableCell>
                                                        <TableCell>{a.dentistName || (a.dentistId ? allDentists.find(d => d.id === Number(a.dentistId))?.name : '-') || '-'}</TableCell>
                                                        <TableCell>{a.branchName || a.branchAddress || '-'}</TableCell>
                                                        <TableCell>{a.scheduledTime ? new Date(a.scheduledTime).toLocaleDateString() : '-'}</TableCell>
                                                        <TableCell>{a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString() : '-'}</TableCell>
                                                        <TableCell align="right">{formatCurrency(price)}</TableCell>
                                                        <TableCell>{(a.serviceDuration || 0).toLocaleString()} phút</TableCell>
                                                        <TableCell><Chip label={a.status || '-'} size="small" color={a.status === 'CANCELLED' ? 'error' : a.status === 'COMPLETED' ? 'success' : 'default'} /></TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <Typography>Không có lịch nào.</Typography>
                                )}
                            </>
                        )
                    ) : null}

                    {detailType === 'dentist' && detailKey && (
                        detailLoading ? (
                            <Typography>Đang tải...</Typography>
                        ) : detailAppointments && detailAppointments.length > 0 ? (
                            <>
                                <div className="mb-4">
                                    <Typography variant="subtitle1" className="font-semibold">{detailDentist?.name ?? selectedDentistName}</Typography>
                                    <Typography variant="body2" className="text-gray-600">Số lượt: {detailAppointments.length}</Typography>
                                    {detailDentist && <Typography variant="body2" className="text-gray-600">Điện thoại: {detailDentist.phone} • Email: {detailDentist.email}</Typography>}
                                </div>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>ID</TableCell>
                                            <TableCell>Khách</TableCell>
                                            <TableCell>Điện thoại</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Dịch vụ</TableCell>
                                            <TableCell>Ngày</TableCell>
                                            <TableCell>Giờ</TableCell>
                                            <TableCell align="right">Giá</TableCell>
                                            <TableCell>Trạng thái</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {detailAppointments.map((a, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{a.id}</TableCell>
                                                <TableCell>{a.customerName || a.customerUsername || '-'}</TableCell>
                                                <TableCell>{(a as unknown as { phone?: string }).phone || '-'}</TableCell>
                                                <TableCell>{a.customerEmail || '-'}</TableCell>
                                                <TableCell>{a.serviceName || '-'}</TableCell>
                                                <TableCell>{a.scheduledTime ? new Date(a.scheduledTime).toLocaleDateString() : '-'}</TableCell>
                                                <TableCell>{a.scheduledTime ? new Date(a.scheduledTime).toLocaleTimeString() : '-'}</TableCell>
                                                <TableCell align="right">{formatCurrency(getAppointmentPrice(a))}</TableCell>
                                                <TableCell><Chip label={a.status || '-'} size="small" color={a.status === 'CANCELLED' ? 'error' : a.status === 'COMPLETED' ? 'success' : 'default'} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </>
                        ) : (
                            <Typography>Không có lịch nào.</Typography>
                        )
                    )}
                </DialogContent>
            </Dialog>

            {/* Compare detail dialog */}
            <Dialog open={compareDialogOpen} onClose={() => setCompareDialogOpen(false)} fullWidth maxWidth="lg">
                <DialogTitle>{`So sánh tháng: ${compareMonthA} vs ${compareMonthB}`}</DialogTitle>
                <DialogContent>
                    {serviceCompareData && serviceCompareData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Dịch vụ</TableCell>
                                        <TableCell align="right">Lượt {compareMonthA}</TableCell>
                                        <TableCell align="right">Doanh thu {compareMonthA}</TableCell>
                                        <TableCell align="right">Lượt {compareMonthB}</TableCell>
                                        <TableCell align="right">Doanh thu {compareMonthB}</TableCell>
                                        <TableCell align="right">Chênh lệch lượt</TableCell>
                                        <TableCell align="right">Chênh lệch doanh thu</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {serviceCompareData.map((r, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{r.name}</TableCell>
                                            <TableCell align="right">{r.a_count.toLocaleString()}</TableCell>
                                            <TableCell align="right">{r.a_revenue.toLocaleString('vi-VN')} đ</TableCell>
                                            <TableCell align="right">{r.b_count.toLocaleString()}</TableCell>
                                            <TableCell align="right">{r.b_revenue.toLocaleString('vi-VN')} đ</TableCell>
                                            <TableCell align="right">{(r.b_count - r.a_count).toLocaleString()}</TableCell>
                                            <TableCell align="right">{(r.b_revenue - r.a_revenue).toLocaleString('vi-VN')} đ</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <Typography>Không có dữ liệu so sánh.</Typography>
                    )}
                </DialogContent>
                <div className="flex items-center justify-end gap-2 p-4">
                    <Button size="small" variant="outlined" onClick={() => exportCompareXlsx()}>Xuất Excel</Button>
                    <Button size="small" variant="text" onClick={() => setCompareDialogOpen(false)}>Đóng</Button>
                </div>
            </Dialog>
        </>
    );
};

export default DichVuTK;