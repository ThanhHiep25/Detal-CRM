import React, { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Card, CardContent, Typography } from '@mui/material';
import { FaDollarSign, FaChartBar, FaCalendarCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';
import type { TooltipProps } from 'recharts';

// Định nghĩa các kiểu dữ liệu (Interfaces) rõ ràng hơn
interface ServiceData {
    name: string;
    count: number;
    totalPrice: number;
}

interface CategoryData {
    name: string;
    value: number;
}

// Dữ liệu mẫu (mock data)
const sampleServiceUsage: { [key: string]: { count: number; totalPrice: number } } = {
    "Nhổ răng khôn": { count: 120, totalPrice: 25000000 },
    "Trám răng sâu": { count: 85, totalPrice: 18000000 },
    "Tẩy trắng răng": { count: 50, totalPrice: 32000000 },
    "Niềng răng": { count: 95, totalPrice: 15500000 },
    "Cạo vôi răng": { count: 150, totalPrice: 8000000 },
};

const sampleCategoryCounts: { [key: string]: number } = {
    "Nha khoa tổng quát": 4,
    "Nha khoa thẩm mỹ": 7,
    "Chỉnh nha": 5,
    "Nha khoa trẻ em": 2,
};

const colors = ['#4A90E2', '#50E3C2', '#FF6384', '#FFCD56', '#9B59B6', '#3498DB', '#1ABC9C', '#F1C40F'];

// Component chính
const DichVuTK: React.FC = () => {
    const [serviceUsage, setServiceUsage] = useState<typeof sampleServiceUsage>({});
    const [categoryCounts, setCategoryCounts] = useState<typeof sampleCategoryCounts>({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Tháng này');

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setServiceUsage(sampleServiceUsage);
            setCategoryCounts(sampleCategoryCounts);
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [filter]);

    // Chuyển đổi dữ liệu thô sang định dạng phù hợp với biểu đồ
    const pieChartData: ServiceData[] = Object.entries(serviceUsage).map(([name, data]) => ({
        name,
        count: data.count,
        totalPrice: data.totalPrice,
    }));

    const barChartData: CategoryData[] = Object.entries(categoryCounts).map(([name, value]) => ({
        name,
        value,
    }));

    // Tính toán các chỉ số tổng quan
    const totalBookings = pieChartData.reduce((sum, data) => sum + data.count, 0);
    const totalRevenue = pieChartData.reduce((sum, data) => sum + data.totalPrice, 0);
    const totalServices = Object.keys(serviceUsage).length;

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
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 1, type: "spring", stiffness: 200 }}
                    className="relative h-24 w-24 rounded-full border-4 border-t-4 border-gray-200"
                >
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin-slow"></div>
                </motion.div>
                <div className="flex items-center text-lg font-semibold text-gray-600">
                    <span className="animate-pulse">Đang tải dữ liệu...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Thống kê Dịch vụ 📊</h1>

            {/* Header và Bộ lọc */}
            <div className="flex flex-wrap items-center mb-6 gap-2">
                <span className="text-gray-600 font-semibold text-sm mr-2">Thời gian:</span>
                {['Hôm nay', 'Tuần này', 'Tháng này', 'Năm nay'].map(period => (
                    <button
                        key={period}
                        onClick={() => setFilter(period)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${filter === period ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                            }`}
                    >
                        {period}
                    </button>
                ))}
            </div>

            {/* Metric Cards - Các chỉ số tổng quan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="shadow-lg transform transition-transform duration-300 hover:scale-[1.02]">
                    <CardContent className="flex items-center p-6">
                        <div className="bg-blue-100 text-blue-600 p-4 rounded-full mr-4 text-2xl">
                            <FaDollarSign />
                        </div>
                        <div>
                            <Typography variant="body2" className="text-gray-500">Tổng Doanh thu</Typography>
                            <Typography variant="h5" component="div" className="font-bold text-gray-800">
                                {totalRevenue.toLocaleString('vi-VN')} đ
                            </Typography>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-lg transform transition-transform duration-300 hover:scale-[1.02]">
                    <CardContent className="flex items-center p-6">
                        <div className="bg-purple-100 text-purple-600 p-4 rounded-full mr-4 text-2xl">
                            <FaCalendarCheck />
                        </div>
                        <div>
                            <Typography variant="body2" className="text-gray-500">Tổng Lượt đặt lịch</Typography>
                            <Typography variant="h5" component="div" className="font-bold text-gray-800">
                                {totalBookings.toLocaleString()}
                            </Typography>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-lg transform transition-transform duration-300 hover:scale-[1.02]">
                    <CardContent className="flex items-center p-6">
                        <div className="bg-green-100 text-green-600 p-4 rounded-full mr-4 text-2xl">
                            <FaChartBar />
                        </div>
                        <div>
                            <Typography variant="body2" className="text-gray-500">Tổng Dịch vụ hoạt động</Typography>
                            <Typography variant="h5" component="div" className="font-bold text-gray-800">
                                {totalServices.toLocaleString()}
                            </Typography>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Biểu đồ phân bố và biểu đồ cột */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <Card className="shadow-lg">
                    <CardContent>
                        <Typography variant="h6" gutterBottom className="text-gray-800 font-semibold mb-4">
                            Phân bố dịch vụ theo Lượt đặt lịch
                        </Typography>
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    dataKey="count"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={120}
                                    fill="#8884d8"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                    {pieChartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-lg">
                    <CardContent>
                        <Typography variant="h6" gutterBottom className="text-gray-800 font-semibold mb-4">
                            Số lượng dịch vụ theo Danh mục
                        </Typography>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#3B82F6" name="Số lượng" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng chi tiết dịch vụ */}
            <Card className="shadow-lg mb-8">
                <CardContent>
                    <Typography variant="h6" gutterBottom className="text-gray-800 font-semibold mb-4">
                        Bảng chi tiết
                    </Typography>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tên dịch vụ</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lượt đặt</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Doanh thu (VNĐ)</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tỉ lệ doanh thu</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pieChartData.sort((a, b) => b.totalPrice - a.totalPrice).map((data, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.count.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{data.totalPrice.toLocaleString('vi-VN')} đ</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                            {totalRevenue ? ((data.totalPrice / totalRevenue) * 100).toFixed(2) : '0.00'}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DichVuTK;