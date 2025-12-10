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

interface Transaction {
  id: string;
  dateTime: string; // YYYY-MM-DD HH:mm
  customer: string;
  service: string;
  amount: number;
  status: 'paid' | 'refunded' | 'pending';
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
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Fake transaction lists per month (for drill-down display)
  const fakeTransactionsByMonth: Record<string, Transaction[]> = {
    '2024-01': [
      { id: 'T-2401-01', dateTime: '2024-01-03 09:12', customer: 'Nguyễn Văn A', service: 'Cạo vôi răng', amount: 200000, status: 'paid' },
      { id: 'T-2401-02', dateTime: '2024-01-05 11:30', customer: 'Trần Thị B', service: 'Trám răng', amount: 350000, status: 'paid' },
      { id: 'T-2401-03', dateTime: '2024-01-12 14:00', customer: 'Lê Thị C', service: 'Tẩy trắng', amount: 2500000, status: 'paid' },
    ],
    '2024-02': [
      { id: 'T-2402-01', dateTime: '2024-02-02 10:00', customer: 'Phạm D', service: 'Nhổ răng khôn', amount: 900000, status: 'paid' },
      { id: 'T-2402-02', dateTime: '2024-02-15 13:45', customer: 'Hoàng E', service: 'Cấy Implant', amount: 12000000, status: 'paid' },
      { id: 'T-2402-03', dateTime: '2024-02-20 09:30', customer: 'Vũ F', service: 'Trám răng', amount: 300000, status: 'refunded' },
    ],
    '2024-03': [
      { id: 'T-2403-01', dateTime: '2024-03-04 08:50', customer: 'Đỗ G', service: 'Lấy tủy', amount: 800000, status: 'paid' },
      { id: 'T-2403-02', dateTime: '2024-03-10 15:00', customer: 'Bùi H', service: 'Trám răng', amount: 350000, status: 'paid' },
    ],
    '2024-04': [
      { id: 'T-2404-01', dateTime: '2024-04-01 09:00', customer: 'Nguyễn I', service: 'Niềng răng', amount: 50000000, status: 'pending' },
      { id: 'T-2404-02', dateTime: '2024-04-11 10:30', customer: 'Lê J', service: 'Tẩy trắng', amount: 3200000, status: 'paid' },
    ],
    '2024-05': [
      { id: 'T-2405-01', dateTime: '2024-05-02 11:00', customer: 'Trần K', service: 'Cạo vôi răng', amount: 150000, status: 'paid' },
      { id: 'T-2405-02', dateTime: '2024-05-18 14:20', customer: 'Phan L', service: 'Trám răng', amount: 300000, status: 'paid' },
    ],
    '2024-06': [
      { id: 'T-2406-01', dateTime: '2024-06-05 09:30', customer: 'Hoàng M', service: 'Cấy Implant', amount: 10000000, status: 'paid' },
      { id: 'T-2406-02', dateTime: '2024-06-20 16:00', customer: 'Võ N', service: 'Bọc sứ', amount: 4500000, status: 'paid' },
    ],
  };

  const getTransactionsForMonth = (monthKey?: string) => {
    if (!monthKey) return [] as Transaction[];
    return fakeTransactionsByMonth[monthKey] || [];
  };

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

  const exportTransactionsCSV = (txs: Transaction[]) => {
    if (!txs || txs.length === 0) return;
    const headers = ['ID', 'Ngày giờ', 'Khách hàng', 'Dịch vụ', 'Số tiền', 'Trạng thái'];
    const rows = txs.map(t => [t.id, t.dateTime, t.customer, t.service, t.amount, t.status]);
    const csv = [headers, ...rows].map(r => r.map(String).map(s => '"' + s.replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${selectedItem?.date || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Chi tiết {selectedItem.date}</h3>
                <p className="text-sm text-gray-600">Tổng doanh thu: <span className="font-semibold">{selectedItem.revenue.toLocaleString()} VND</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportTransactionsCSV(getTransactionsForMonth(selectedItem.date))} className="bg-green-600 text-white px-3 py-1 rounded">Xuất CSV</button>
                <button onClick={() => setSelectedItem(null)} className="bg-gray-200 px-3 py-1 rounded">Đóng</button>
              </div>
            </div>

            {/* Transactions table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Ngày giờ</th>
                    <th className="p-2 text-left">Khách</th>
                    <th className="p-2 text-left">Dịch vụ</th>
                    <th className="p-2 text-right">Số tiền</th>
                    <th className="p-2 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {getTransactionsForMonth(selectedItem.date).map((tx) => (
                    <React.Fragment key={tx.id}>
                      <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}>
                        <td className="p-2">{tx.id}</td>
                        <td className="p-2">{tx.dateTime}</td>
                        <td className="p-2">{tx.customer}</td>
                        <td className="p-2">{tx.service}</td>
                        <td className="p-2 text-right">{tx.amount.toLocaleString()} VND</td>
                        <td className="p-2">{tx.status === 'paid' ? <span className="text-green-600 font-medium">Thanh toán</span> : tx.status === 'refunded' ? <span className="text-red-600 font-medium">Hoàn tiền</span> : <span className="text-yellow-600 font-medium">Đang chờ</span>}</td>
                      </tr>
                      {expandedTxId === tx.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="p-3 text-sm text-gray-700">
                            <div><strong>Chi tiết giao dịch:</strong></div>
                            <div>Mã: {tx.id}</div>
                            <div>Thời gian: {tx.dateTime}</div>
                            <div>Khách hàng: {tx.customer}</div>
                            <div>Dịch vụ: {tx.service}</div>
                            <div>Số tiền: {tx.amount.toLocaleString()} VND</div>
                            <div>Trạng thái: {tx.status}</div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThongKeTC;