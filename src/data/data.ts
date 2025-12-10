export const serviceCategories = [
  { id: 'all', name: 'Tất cả dịch vụ', count: 180 },
  { id: '006', name: 'CHỈNH NHA', count: 13 },
  { id: '0029', name: 'Cấy ghép Implant (Không đỏ)', count: 9 },
  { id: '0031', name: 'THẨM MỸ', count: 8 },
  { id: '0039', name: 'TIỂU PHẪU', count: 14 },
  { id: '0042', name: 'TỔNG QUÁT - tháo lắp', count: 9 },
];

export const services = [
  { id: 'DV00018', categoryId: '0031', name: 'Tẩy Trắng Pola', priceMin: 2500000, priceMax: 3500000, unit: 'Hàm', status: 'Hoạt động' },
  { id: 'DV00019', categoryId: '0031', name: 'Tẩy Trắng Zoom 2', priceMin: 4500000, priceMax: 5500000, unit: 'Hàm', status: 'Hoạt động' },
  { id: 'DV00020', categoryId: '0031', name: 'Thuốc tẩy trắng tại nhà', priceMin: 350000, priceMax: 500000, unit: 'Ống', status: 'Hoạt động' },
  { id: 'DV00029', categoryId: '006', name: 'Mắc Cài Sứ (Độ 1 - 3)', priceMin: 50000000, priceMax: 55000000, unit: 'Hàm', status: 'Hoạt động' },
  { id: 'DV00030', categoryId: '006', name: 'Mắc Cài Sứ Tự Buộc', priceMin: 55000000, priceMax: 65000000, unit: 'Hàm', status: 'Hoạt động' },
];
// Bổ sung một số dịch vụ mẫu để hiển thị phong phú hơn trên dashboard
export const additionalServices = [
  { id: 'DV00031', categoryId: '0039', name: 'Nhổ răng khôn', priceMin: 800000, priceMax: 1500000, unit: 'Cái', status: 'Hoạt động' },
  { id: 'DV00032', categoryId: '0042', name: 'Trám răng sâu (Composite)', priceMin: 200000, priceMax: 500000, unit: 'Hàm', status: 'Hoạt động' },
  { id: 'DV00033', categoryId: '0029', name: 'Cấy ghép Implant (Gói cơ bản)', priceMin: 10000000, priceMax: 20000000, unit: 'Cái', status: 'Hoạt động' },
  { id: 'DV00034', categoryId: '0031', name: 'Bọc sứ thẩm mỹ (1 răng)', priceMin: 2500000, priceMax: 6000000, unit: 'Răng', status: 'Tạm dừng' },
  { id: 'DV00035', categoryId: '006', name: 'Chỉnh nha: Khay trong (Invisalign)', priceMin: 45000000, priceMax: 120000000, unit: 'Kế hoạch', status: 'Hoạt động' },
];
export const referrerSearchResults = [
  { id: 1, name: 'chị Phương 11768', code: 'CP11768', phone: '0125896485' },
  { id: 2, name: 'NGUYỄN THỊ MINH 20687', code: 'NTM20687', phone: '0988883539' },
  { id: 3, name: 'VÕ THỊ HUYỀN LINH - 16921', code: 'VTHL16921', phone: '0899991699' },
  { id: 4, name: 'NGUYỄN THỊ KIM HOÀNG', code: 'NTKH', phone: '0906301561' },
  { id: 5, name: 'HUỲNH THỊ MINH THÀNH 11912', code: 'HTMT11912', phone: '0943084715' },
];

export interface Referrer {
  id: number;
  name: string;
  code: string;
  phone: string;
}

export const customerGroups = [
  { id: 'vip', name: 'VIP' },
  { id: 'standard', name: 'Standard' },
  { id: 'new', name: 'New Customer' },
];

export const customerSources = [
  { id: 'facebook', name: 'Facebook' },
  { id: 'google', name: 'Google' },
  { id: 'referral', name: 'Khách giới thiệu' },
  { id: 'other', name: 'Khác' },
];


export const referrers = [
  {
    id: 'EM0126',
    type: 'Cộng tác viên',
    name: 'Cộng tác viên',
    phone: '0123456789',
    phone2: '',
    email: 'ctv@example.com',
    branch: 'q1',
    address: '123 Đường ABC, Quận 1',
  },
  {
    id: 'EM0127',
    type: 'Nhân viên',
    name: 'Võ Trần Công Nguyên',
    phone: '00000000013',
    phone2: '0987654321',
    email: 'nguyen.vtc@example.com',
    branch: 'q1',
    address: '456 Đường XYZ, Quận 1',
  },
];

export interface Doctor {
  id: number;
  name: string;
  avatar: string | null;
}


export const doctors = [
  { id: 1, name: 'BS. Lâm Trần Thảo Vy', avatar: '/path/to/avatar1.png' },
  { id: 2, name: 'BS. Nguyễn Tuấn Khang', avatar: '/path/to/avatar2.png' },
  { id: 3, name: 'BS. Serrano Roel Genova', avatar: '/path/to/avatar3.png' },
  { id: 4, name: 'Phòng khám 01', avatar: null },
  { id: 5, name: 'BS. Trần Minh Đức', avatar: '/path/to/avatar5.png' },
  { id: 6, name: 'BS. Hoàng Thị Mai', avatar: '/path/to/avatar6.png' },
  { id: 7, name: 'BS. Lê Văn Bình', avatar: null },
];

export type AppointmentStatus = 'confirmed' | 'checked_in' | 'completed' | 'cancelled';

// 2. Định nghĩa cấu trúc (interface) cho một lịch hẹn
export interface Appointment {
  id: number;
  doctorId: number;
  customerName: string;
  customerEmail?: string;
  phone?: string;
  service: string;
  serviceId?: string;
  startTime: string;
  endTime: string;
  date?: string; // YYYY-MM-DD
  branchName?: string;
  price?: number; // appointment revenue
  status: AppointmentStatus;
}

// 3. Khai báo mảng appointments tuân theo cấu trúc đã định nghĩa
//    và GỠ BỎ 'as const'
export const appointments: Appointment[] = [
  { id: 101, doctorId: 1, customerName: 'Nguyễn Văn An', customerEmail: 'an.nguyen@example.com', phone: '0900000001', service: 'Cạo vôi răng', serviceId: 'DV00001', startTime: '08:30', endTime: '09:30', date: '2025-11-01', branchName: 'CN Quận 1', price: 200000, status: 'confirmed' },
  { id: 102, doctorId: 2, customerName: 'Trần Thị Bích', customerEmail: 'bich.tran@example.com', phone: '0900000002', service: 'Tư vấn niềng răng', serviceId: 'DV00002', startTime: '09:00', endTime: '09:30', date: '2025-11-02', branchName: 'CN Quận 2', price: 500000, status: 'checked_in' },
  { id: 103, doctorId: 1, customerName: 'Lê Văn Cường', customerEmail: 'cuong.le@example.com', phone: '0900000003', service: 'Trám răng', serviceId: 'DV00003', startTime: '10:00', endTime: '11:00', date: '2025-11-03', branchName: 'CN Quận 1', price: 350000, status: 'completed' },
  { id: 104, doctorId: 3, customerName: 'Phạm Thị Duyên', customerEmail: 'duyen.pham@example.com', phone: '0900000004', service: 'Cấy Implant', serviceId: 'DV00004', startTime: '09:30', endTime: '11:30', date: '2025-11-04', branchName: 'CN Quận 3', price: 25000000, status: 'confirmed' },
  { id: 105, doctorId: 2, customerName: 'Võ Minh Hải', customerEmail: 'hai.vo@example.com', phone: '0900000005', service: 'Nhổ răng khôn', serviceId: 'DV00005', startTime: '14:00', endTime: '15:00', date: '2025-11-05', branchName: 'CN Quận 2', price: 1200000, status: 'cancelled' },
  { id: 106, doctorId: 4, customerName: 'Hoàng Gia Huy', customerEmail: 'huy.hoang@example.com', phone: '0900000006', service: 'Lấy tủy', serviceId: 'DV00006', startTime: '13:30', endTime: '14:30', date: '2025-11-06', branchName: 'CN Quận 4', price: 800000, status: 'confirmed' },
  // Additional appointments to provide richer mock data for dashboard and drilldowns
  { id: 107, doctorId: 5, customerName: 'Phan Thị Hoa', customerEmail: 'hoa.phan@example.com', phone: '0900000010', service: 'Nhổ răng khôn', serviceId: 'DV00031', startTime: '08:00', endTime: '09:00', date: '2025-11-07', branchName: 'CN Quận 1', price: 1000000, status: 'completed' },
  { id: 108, doctorId: 6, customerName: 'Đỗ Văn Long', customerEmail: 'long.do@example.com', phone: '0900000011', service: 'Trám răng sâu (Composite)', serviceId: 'DV00032', startTime: '10:30', endTime: '11:00', date: '2025-11-08', branchName: 'CN Quận 2', price: 300000, status: 'checked_in' },
  { id: 109, doctorId: 1, customerName: 'Lý Thị Nga', customerEmail: 'nga.ly@example.com', phone: '0900000012', service: 'Bọc sứ thẩm mỹ (1 răng)', serviceId: 'DV00034', startTime: '15:00', endTime: '16:00', date: '2025-11-09', branchName: 'CN Quận 3', price: 4000000, status: 'confirmed' },
  { id: 110, doctorId: 3, customerName: 'Ngô Minh Tú', customerEmail: 'tu.ngo@example.com', phone: '0900000013', service: 'Cấy ghép Implant (Gói cơ bản)', serviceId: 'DV00033', startTime: '11:00', endTime: '13:00', date: '2025-11-10', branchName: 'CN Quận 3', price: 15000000, status: 'confirmed' },
  { id: 111, doctorId: 2, customerName: 'Phùng Thị Hạnh', customerEmail: 'hanh.phung@example.com', phone: '0900000014', service: 'Chỉnh nha: Khay trong (Invisalign)', serviceId: 'DV00035', startTime: '09:00', endTime: '09:30', date: '2025-11-11', branchName: 'CN Quận 2', price: 50000000, status: 'confirmed' },
  { id: 112, doctorId: 7, customerName: 'Trương Văn Nam', customerEmail: 'nam.truong@example.com', phone: '0900000015', service: 'Tẩy Trắng Zoom 2', serviceId: 'DV00019', startTime: '16:00', endTime: '16:30', date: '2025-11-12', branchName: 'CN Quận 4', price: 5000000, status: 'confirmed' },
];

// 4. Cập nhật statusColors để sử dụng AppointmentStatus
export const statusColors: Record<AppointmentStatus, { light: string; main: string; text: string }> = {
  confirmed: { light: '#e3f2fd', main: '#2196f3', text: '#0d47a1' },
  checked_in: { light: '#fffde7', main: '#ffeb3b', text: '#f57f17' },
  completed: { light: '#e8f5e9', main: '#4caf50', text: '#1b5e20' },
  cancelled: { light: '#ffebee', main: '#f44336', text: '#c62828' },
};


