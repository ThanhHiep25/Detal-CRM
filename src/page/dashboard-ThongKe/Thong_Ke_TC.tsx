import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import html2canvas from 'html2canvas';

interface RevenueData {
  date: string;
  revenue: number;
}

const sampleMonthlyData: RevenueData[] = [
  { date: '2024-01', revenue: 10000000 },
  { date: '2024-02', revenue: 15000000 },
  { date: '2024-03', revenue: 12500000 },
  { date: '2024-04', revenue: 20000000 },
  { date: '2024-05', revenue: 18000000 },
  { date: '2024-06', revenue: 25000000 },
];

const ThongKeTC: React.FC = () => {
  const [data, setData] = useState<RevenueData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RevenueData | null>(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(sampleMonthlyData);
      setLoading(false);
    }, 800);
  }, [selectedPeriod]);

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const prevTotal = totalRevenue * 0.85;
  const growth = prevTotal ? ((totalRevenue - prevTotal) / prevTotal) * 100 : 0;

  const handleDownloadChart = async () => {
    const chartElement = document.getElementById('revenue-chart');
    if (!chartElement) return;
    const canvas = await html2canvas(chartElement);
    const link = document.createElement('a');
    link.download = 'revenue-chart.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Bộ lọc */}
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
          className="border rounded p-2"
        >
          <option value="month">Theo Tháng</option>
          <option value="quarter">Theo Quý</option>
          <option value="year">Theo Năm</option>
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={compareMode} onChange={(e) => setCompareMode(e.target.checked)} />
          So sánh với kỳ trước
        </label>
        <button
          onClick={handleDownloadChart}
          className="bg-indigo-500 text-white px-3 py-2 rounded hover:bg-indigo-600"
        >
          Tải Biểu Đồ
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-500 text-white p-4 rounded-2xl shadow">
          <p className="text-sm">Tổng Doanh Thu</p>
          <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} VND</p>
          <p className={`text-sm ${growth >= 0 ? 'text-green-200' : 'text-red-200'}`}>
            {growth >= 0 ? '+' : ''}{growth.toFixed(2)}% so với kỳ trước
          </p>
        </div>
        <div className="bg-purple-500 text-white p-4 rounded-2xl shadow">
          <p className="text-sm">Số Giao Dịch</p>
          <p className="text-2xl font-bold">550</p>
        </div>
        <div className="bg-pink-500 text-white p-4 rounded-2xl shadow">
          <p className="text-sm">Dịch Vụ Bán Chạy</p>
          <p className="text-2xl font-bold">3</p>
        </div>
      </div>

      {/* Biểu đồ doanh thu */}
      <div id="revenue-chart" className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-lg font-bold mb-4">Biểu đồ Doanh Thu</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} onClick={(e) => setSelectedItem(e.activePayload?.[0]?.payload || null)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => value.toLocaleString() + ' VND'} />
            <Legend />
            <Bar dataKey="revenue" fill="#8884d8" name="Hiện tại" />
            {compareMode && <Bar dataKey="prevRevenue" fill="#82ca9d" name="Kỳ trước" />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Biểu đồ đường */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-lg font-bold mb-4">Xu Hướng Doanh Thu</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => value.toLocaleString() + ' VND'} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bảng chi tiết */}
      <div className="bg-white p-4 rounded-2xl shadow overflow-x-auto">
        <h2 className="text-lg font-bold mb-4">Bảng Chi Tiết</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Kỳ</th>
              <th className="p-2 text-left">Doanh Thu</th>
              <th className="p-2 text-left">Tỉ Lệ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b cursor-pointer hover:bg-gray-50" onClick={() => setSelectedItem(row)}>
                <td className="p-2">{row.date}</td>
                <td className="p-2">{row.revenue.toLocaleString()} VND</td>
                <td className="p-2">{((row.revenue / totalRevenue) * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal chi tiết drill-down */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">Chi tiết {selectedItem.date}</h3>
            <p className="mb-2">Doanh thu: {selectedItem.revenue.toLocaleString()} VND</p>
            <p className="text-sm text-gray-500">Danh sách giao dịch sẽ hiển thị ở đây...</p>
            <button
              onClick={() => setSelectedItem(null)}
              className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThongKeTC;