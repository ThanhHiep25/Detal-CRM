import React, { useState, useEffect } from 'react';
import {
    Menu, Dashboard,
    History,
    // ShoppingBagOutlined,
    DataObject,
    //SentimentSatisfiedAlt,
    //SettingsOutlined,
    InventoryOutlined,
    SpaOutlined,
    DashboardOutlined,
    PeopleOutline,
    NaturePeopleOutlined,
    //CreditCardOutlined,
    PendingActionsOutlined,
    ArticleOutlined,
    PaymentOutlined,
    ConfirmationNumberOutlined
} from '@mui/icons-material';
import Details from '../home/Details';
import { ChevronRight } from 'lucide-react';

type MenuSubItem = {
    name: string;
    page: string;
    index: number;
    roles?: string[];
};

type MenuItem = {
    name: string;
    icon: typeof Dashboard;
    id: string;
    subItems?: MenuSubItem[];
    roles?: string[];
};

const menuItems: MenuItem[] = [
    {
        name: 'Thống kê',
        icon: DashboardOutlined,
        id: 'dashboard',
        subItems: [
            // { name: 'Tài chính', page: 'tktc', index: 1 },
            { name: 'Dịch vụ', page: 'dichvutk', index: 2 },
        ],
        roles: ['ROLE_ADMIN']
    },
    {
        name: 'Dịch Vụ',
        icon: SpaOutlined,
        id: 'services',
        subItems: [
            //{ name: 'Tạo dịch vụ', page: 'addServiceDental', index: 13 },
            { name: 'Danh sách dịch vụ', page: 'serviceDental', index: 14 },
        ]
        ,
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTIONIST']
    },
    {
        name: 'Lịch Hẹn',
        icon: PendingActionsOutlined,
        id: 'appointments',
        subItems: [
            { name: 'Đặt lịch hẹn', page: 'themLH', index: 18, roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] },
            { name: 'Lịch hẹn trong ngày', page: 'lichTrongNgay', index: 19, roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] },
            // { name: 'Lịch hẹn theo ngày', page: 'lichTrongThang', index: 20 },
            { name: 'Lịch hẹn của tôi', page: 'lichTheoBacSi', index: 21, roles: ['ROLE_DENTIST'] },
            { name: 'Danh sách lịch hẹn', page: 'danhsachLH', index: 22, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTIONIST'] },
            { name: 'Danh sách lịch tư vấn ', page: 'lichTuVan', index: 39, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTIONIST'] },   
        ]
        ,
        //roles: ['ROLE_ADMIN', 'ROLE_DENTIST']
    },
    {
        name: 'Khách Hàng',
        icon: NaturePeopleOutlined,
        id: 'customers',
        subItems: [
            { name: 'Tạo mới', page: 'themKH', index: 10 },
            { name: 'Danh sách', page: 'danhsachKH', index: 11 },
            { name: 'Người giới thiệu', page: 'nguoigt', index: 12 },
        ],
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTIONIST']
    },
    {
        name: 'Nhân Viên & Tài Khoản',
        icon: PeopleOutline,
        id: 'employees',
        subItems: [
            { name: 'Thêm nhân viên mới', page: 'themNV', index: 3, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_ACCOUNTANT'] },
            { name: 'Danh sách nhân viên', page: 'danhsachNV', index: 4, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_ACCOUNTANT'] },
            { name: 'Danh sách tài khoản', page: 'danhsachTaiKhoanNV', index: 5, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_ACCOUNTANT'] },
            { name: 'Phân công nhân viên', page: 'phancongNV', index: 6, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_ACCOUNTANT'] },
            { name: 'Lịch làm việc', page: 'lichNV', index: 7, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTIONIST', 'ROLE_DENTIST', 'ROLE_ACCOUNTANT', 'ROLE_MANAGER', 'ROLE_HR'] },
            // { name: 'Bảng lương', page: 'bangluong', index: 8, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_ACCOUNTANT'] },
            //  { name: 'Phân quyền', page: 'phanquyen', index: 9, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_HR', 'ROLE_ACCOUNTANT'] },
        ],
    },


    {
        name: 'Quản lý mã giảm giá',
        icon: ConfirmationNumberOutlined,
        id: 'groups',
        subItems: [
            //{ name: 'Tạo mới', page: 'themNhomThe', index: 16 },
            { name: 'Danh sách thẻ', page: 'danhsachThe', index: 17 },
        ]
        ,
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER']
    },
    {
        name: 'Tích Hợp & Mẫu',
        icon: DataObject,
        id: 'integrations',
        subItems: [
            { name: 'Danh sách đơn thuốc mẫu', page: 'prescriptionsample', index: 29 },
        ],
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DENTIST']
    },

    {
        name: 'Quản lý đơn thuốc',
        icon: ArticleOutlined,
        id: 'medicalrecords',
        subItems: [
            { name: 'Danh sách thuốc', page: 'drugs', index: 15 , roles: ['ROLE_ADMIN', 'ROLE_MANAGER','ROLE_DENTIST']},
            { name: 'Đơn thuốc', page: 'prescription', index: 40, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DENTIST'] },
            { name: 'Danh sách đơn thuốc', page: 'prescriptionlist', index: 41, roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTIONIST'] },
        ]
    },
    {
        name: 'Quản lý thanh toán',
        icon: PaymentOutlined,
        id: 'paymentmanagement',
        subItems: [
            { name: 'Danh sách thanh toán tổng hợp', page: 'paymentlist', index: 42 },
        ],
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTIONIST']
    },
    {
        name: 'Kho lưu trữ & Nhà cung cấp',
        icon: InventoryOutlined,
        id: 'products',
        subItems: [
            //{ name: 'Tạo sản phẩm', page: 'themSP', index: 23 },
            // { name: 'Danh sách kho', page: 'danhsachSP', index: 24 },
            { name: 'Danh sách nhà cung cấp', page: 'supplier', index: 25 },
            //{ name: 'Danh sách nhập kho', page: 'danhsachnhapkho', index: 26 },
        ],
        roles: ['ROLE_ADMIN', 'ROLE_MANAGER']
    },
    // {
    //     name: 'Marketing',
    //     icon: ShoppingBagOutlined,
    //     id: 'orders',
    //     subItems: [
    //         { name: 'Giỏ hàng', page: 'themDH', index: 27 },
    //         { name: 'Danh sách đơn hàng', page: 'danhsachDH', index: 28 },
    //     ],
    //     roles: ['ROLE_ADMIN', 'ROLE_MANAGER']
    // },

    // {
    //     name: 'Labo',
    //     icon: SentimentSatisfiedAlt,
    //     id: 'labo',
    //     subItems: [
    //         { name: 'Danh sách Labo', page: 'danhsachLabo', index: 30 },
    //     ],
    //     roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DENTIST']

    // },

    {
        name: 'Báo Cáo & Lịch Sử',
        icon: History,
        id: 'history',
        subItems: [
            { name: 'Thanh toán dịch vụ', page: 'lsdv', index: 31 },
            { name: 'Thanh toán đơn hàng', page: 'lsdh', index: 32 },
        ],
        roles: ['ssss']
    }
    // {
    //     name: 'Cài đặt',
    //     icon: SettingsOutlined,
    //     id: 'settings',
    //     subItems: [
    //         { name: 'Cài đặt chung', page: 'caidat', index: 33 },
    //         // { name: 'Cài đặt tài khoản', page: 'taikhoan', index: 34 },
    //     ]
    // }
];

const MenuDrawer: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    // Lấy toàn bộ thông tin user từ localStorage và chuẩn hóa role thành mảng
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRoles: string[] = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);

    const [currentPage, setCurrentPage] = useState<string>(() => {
        return localStorage.getItem('currentPage') || 'home';
    });
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [open, setOpen] = useState<{ [key: string]: boolean }>({});

    // Listen for in-app navigation events (dispatched by appointment items)
    useEffect(() => {
        const handler = (e: Event) => {
            try {
                const detail = (e as CustomEvent).detail || {};
                const page = detail.page as string | undefined;
                const appointmentId = detail.appointmentId;
                if (page) {
                    setCurrentPage(page);
                    setActiveIndex(null);
                    localStorage.setItem('currentPage', page);
                    if (appointmentId != null) {
                        localStorage.setItem('prescriptionAppointmentId', String(appointmentId));
                    }
                }
            } catch {
                // ignore malformed events
            }
        };
        window.addEventListener('app:navigate', handler as EventListener);
        return () => window.removeEventListener('app:navigate', handler as EventListener);
    }, []);


    const handleToggle = (menuId: string) => {
        setOpen(prevState => ({ ...prevState, [menuId]: !prevState[menuId] }));
    };

    const toggleDrawer = () => setDrawerOpen(!drawerOpen);
    const handleNavigation = (page: string, index: number) => {
        if (window.innerWidth < 768) {
            setDrawerOpen(false);
        }
        setCurrentPage(page);
        setActiveIndex(index);
        localStorage.setItem('currentPage', page);
    };

    return (
        <div className="flex sm:w-screen dark:bg-gray-800 bg-white text-gray-900 dark:text-white md:pb-10">
            <div className={`flex flex-col ${drawerOpen ? 'sm:w-96 w-screen h-screen' : 'relative w-0'} transition-all duration-300`}>
                <div className="flex items-center justify-end px-2 py-2 z-20">
                    <button onClick={toggleDrawer} className={`p-4 rounded-full ${drawerOpen ? '' : 'absolute w-[70px] pl-8 top-0 left-[-20px]'} bg-white dark:bg-black hover:bg-gray-300`}>
                        {drawerOpen ? <Menu /> : <ChevronRight />}
                    </button>
                </div>
                <div className={`overflow-y-auto ${drawerOpen ? 'sm:h-[75vh] h-[60vh] p-4' : 'overflow-hidden'} sm:h-[70vh] h-[60vh] max-h-full flex flex-col text-[18px]`}>
                    {menuItems.map(menuItem => {
                        // Kiểm tra quyền của người dùng cho menu chính (nếu có roles, yêu cầu ít nhất 1 role trùng)
                        if (menuItem.roles && menuItem.roles.length > 0) {
                            const allowed = userRoles.some(r => menuItem.roles!.includes(r));
                            if (!allowed) return null;
                        }

                        const IconComponent = menuItem.icon;
                        const isOpen = open[menuItem.id];

                        return (
                            <div key={menuItem.id} className='text-[14px] sm:text-[16px]'>
                                <button
                                    onClick={() => handleToggle(menuItem.id)}
                                    className="flex items-center w-full p-4 hover:bg-gray-200 hover:rounded-md"
                                >
                                    <IconComponent />
                                    <span className={`ml-3 ${drawerOpen ? 'block' : 'hidden'}`}>{menuItem.name}</span>
                                </button>
                                {isOpen && (
                                    <div className="ml-6 p-4  border-l-2 border-blue-400 rounded-r-md" style={{ display: drawerOpen ? 'block' : 'none' }}>
                                        {menuItem.subItems?.map(subItem => {

                                            // Kiểm tra quyền của người dùng cho từng subItem (nhận cả array hoặc string từ user)
                                            if (subItem.roles && subItem.roles.length > 0) {
                                                const allowedSub = userRoles.some(r => subItem.roles!.includes(r));
                                                if (!allowedSub) return null;
                                            }
                                            return (
                                                <button
                                                    key={subItem.index}
                                                    className={`"block w-full p-2 text-start pl-6 hover:bg-gray-200 " ${activeIndex === subItem.index ? "bg-blue-500/50  text-white border-l-2 border-blue-700" : ""}`}
                                                    onClick={() => handleNavigation(subItem.page, subItem.index)}
                                                >
                                                    {subItem.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="w-screen max-w-fit-content">
                <Details currentPage={currentPage} />
            </div>
        </div>
    );
};

export default MenuDrawer;