import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { motion } from 'framer-motion';
import { FaLeaf } from "react-icons/fa";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import Modal from 'react-modal';
import { BsCalendarCheck, BsPinAngleFill } from "react-icons/bs";

// Đảm bảo Modal biết nơi để gắn vào DOM
Modal.setAppElement('#root');

// Interface cho dữ liệu nhân viên
export interface PositionData {
    positionId: number;
    positionName: string;
}

export interface StaffDataFull {
    staffId: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    position: PositionData;
    status: "ACTIVATE" | "DEACTIVATE";
    startDate: string;
    imageUrl: string;
}

// Interface cho dữ liệu lịch hẹn
export interface ServiceData {
    serviceId: number;
    serviceName: string;
}

export interface AppointmentResponse {
    id: number;
    patientName: string;
    date: string;
    time: string;
    service: ServiceData;
    appointmentDateTime: string;
    totalPrice: number;
    notes: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    createdAt: string;
    updatedAt: string;
}

// Interface cho dữ liệu phòng ban
export interface DepartmentResponse {
    departmentId: number;
    departmentName: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    status: "ACTIVE" | "INACTIVE";
}

// Interface chính cho dữ liệu phân công nhân viên
export interface AssignmentStaffData {
    id: number;
    assignedDate: string;
    note: string;
    staff: StaffDataFull;
    appointment: AppointmentResponse;
    department: DepartmentResponse;
    status: "ACTIVATE" | "DEACTIVATE";
    isImportant?: boolean; // Thêm trường này để đánh dấu quan trọng
}

// Dữ liệu mẫu cho phân công
const mockAssignments: AssignmentStaffData[] = [
    {
        id: 1,
        assignedDate: "2025-07-20T08:00:00Z",
        note: "Phân công chính",
        staff: {
            staffId: 2,
            name: "Lê Thị Bình",
            email: "binh.le@gmail.com",
            phone: "0912345678",
            address: "456 Đường Lê Lợi, Q.1, TP.HCM",
            position: { positionId: 2, positionName: "Nha sĩ" },
            status: "ACTIVATE",
            startDate: "2019-05-20",
            imageUrl: "https://via.placeholder.com/150",
        },
        appointment: {
            id: 101,
            patientName: "Nguyễn Văn A",
            date: "2025-07-20",
            time: "08:00:00",
            service: { serviceId: 1, serviceName: "Làm trắng răng" },
            appointmentDateTime: "2025-07-20T08:00:00Z",
            totalPrice: 1000000,
            notes: "Khách hàng muốn làm trắng răng",
            status: "CONFIRMED",
            createdAt: "2025-07-10T10:00:00Z",
            updatedAt: "2025-07-10T10:00:00Z"
        },
        department: { departmentId: 1, departmentName: "Phòng khám 1", description: "Phòng khám tổng quát", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", status: "ACTIVE" },
        status: "ACTIVATE",
    },
    {
        id: 2,
        assignedDate: "2025-07-20T10:30:00Z",
        note: "Trợ lý nha sĩ",
        staff: {
            staffId: 5,
            name: "Hoàng Minh Hải",
            email: "hai.hoang@gmail.com",
            phone: "0945678910",
            address: "22B Đường Thống Nhất, Q. Gò Vấp, TP.HCM",
            position: { positionId: 2, positionName: "Nha sĩ" },
            status: "ACTIVATE",
            startDate: "2020-11-25",
            imageUrl: "https://via.placeholder.com/150",
        },
        appointment: {
            id: 102,
            patientName: "Phạm Thị B",
            date: "2025-07-20",
            time: "10:30:00",
            service: { serviceId: 2, serviceName: "Nhổ răng khôn" },
            appointmentDateTime: "2025-07-20T10:30:00Z",
            totalPrice: 2000000,
            notes: "Nhổ răng khôn hàm dưới",
            status: "CONFIRMED",
            createdAt: "2025-07-10T11:00:00Z",
            updatedAt: "2025-07-10T11:00:00Z"
        },
        department: { departmentId: 2, departmentName: "Phòng phẫu thuật", description: "Phòng phẫu thuật chuyên sâu", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", status: "ACTIVE" },
        status: "ACTIVATE",
        isImportant: true,
    },
    {
        id: 3,
        assignedDate: "2025-07-21T14:00:00Z",
        note: "Kiểm tra định kỳ",
        staff: {
            staffId: 9,
            name: "Mai Lan Hương",
            email: "huong.mai@gmail.com",
            phone: "0956123789",
            address: "15 Tôn Thất Thiệp, Q.1, TP.HCM",
            position: { positionId: 2, positionName: "Nha sĩ" },
            status: "ACTIVATE",
            startDate: "2021-07-12",
            imageUrl: "https://via.placeholder.com/150",
        },
        appointment: {
            id: 103,
            patientName: "Lê Văn C",
            date: "2025-07-21",
            time: "14:00:00",
            service: { serviceId: 3, serviceName: "Tư vấn niềng răng" },
            appointmentDateTime: "2025-07-21T14:00:00Z",
            totalPrice: 500000,
            notes: "Tư vấn niềng răng lần đầu",
            status: "CONFIRMED",
            createdAt: "2025-07-11T09:00:00Z",
            updatedAt: "2025-07-11T09:00:00Z"
        },
        department: { departmentId: 1, departmentName: "Phòng khám 1", description: "Phòng khám tổng quát", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", status: "ACTIVE" },
        status: "ACTIVATE",
    },
    {
        id: 4,
        assignedDate: "2025-07-22T09:00:00Z",
        note: "Phân công chính",
        staff: {
            staffId: 2,
            name: "Lê Thị Bình",
            email: "binh.le@gmail.com",
            phone: "0912345678",
            address: "456 Đường Lê Lợi, Q.1, TP.HCM",
            position: { positionId: 2, positionName: "Nha sĩ" },
            status: "ACTIVATE",
            startDate: "2019-05-20",
            imageUrl: "https://via.placeholder.com/150",
        },
        appointment: {
            id: 104,
            patientName: "Trần Văn D",
            date: "2025-07-22",
            time: "09:00:00",
            service: { serviceId: 4, serviceName: "Chụp X-quang" },
            appointmentDateTime: "2025-07-22T09:00:00Z",
            totalPrice: 300000,
            notes: "Chụp X-quang kiểm tra tổng quát",
            status: "CONFIRMED",
            createdAt: "2025-07-12T08:00:00Z",
            updatedAt: "2025-07-12T08:00:00Z"
        },
        department: { departmentId: 3, departmentName: "Phòng X-quang", description: "Phòng chụp X-quang", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", status: "ACTIVE" },
        status: "ACTIVATE",
    },
    {
        id: 5,
        assignedDate: "2025-07-22T11:00:00Z",
        note: "Hỗ trợ kỹ thuật",
        staff: {
            staffId: 8,
            name: "Trần Thanh Long",
            email: "long.tran@gmail.com",
            phone: "0923456789",
            address: "88 Đường Hồ Xuân Hương, Q.3, TP.HCM",
            position: { positionId: 3, positionName: "Kỹ thuật viên" },
            status: "ACTIVATE",
            startDate: "2022-01-30",
            imageUrl: "https://via.placeholder.com/150",
        },
        appointment: {
            id: 105,
            patientName: "Đỗ Thị E",
            date: "2025-07-22",
            time: "11:00:00",
            service: { serviceId: 5, serviceName: "Lấy cao răng" },
            appointmentDateTime: "2025-07-22T11:00:00Z",
            totalPrice: 400000,
            notes: "Lấy cao răng định kỳ",
            status: "CONFIRMED",
            createdAt: "2025-07-12T10:00:00Z",
            updatedAt: "2025-07-12T10:00:00Z"
        },
        department: { departmentId: 1, departmentName: "Phòng khám 1", description: "Phòng khám tổng quát", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", status: "ACTIVE" },
        status: "ACTIVATE",
    },
];

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

// Interface cho sự kiện lịch
interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: AssignmentStaffData;
}

const formatAssignmentsForCalendar = (assignments: AssignmentStaffData[]): CalendarEvent[] => {
    return assignments.map(assignment => {
        const assignedDateTime = new Date(assignment.assignedDate);
        const title = `${assignment.staff.name} - ${assignment.appointment.service.serviceName}`;
        
        const endTime = new Date(assignedDateTime);
        endTime.setHours(assignedDateTime.getHours() + 1); 
        
        return {
            title: title,
            start: assignedDateTime,
            end: endTime,
            allDay: false,
            resource: assignment
        };
    });
};

const AssignmentSchedule: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<AssignmentStaffData | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        setLoading(true);
        try {
            const formattedEvents = formatAssignmentsForCalendar(mockAssignments);
            setEvents(formattedEvents);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event.resource); 
        setShowDetailModal(true);
    };

    const handleEventDrop = ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
        const updatedEvents = events.map(ev => {
            if (ev.resource.id === event.resource.id) {
                return { ...ev, start, end, resource: { ...ev.resource, assignedDate: start.toISOString() } };
            }
            return ev;
        });
        setEvents(updatedEvents);
        toast.success(`Đã dời lịch hẹn của ${event.resource.appointment.patientName} đến ${moment(start).format('HH:mm DD/MM/YYYY')}`);
    };

    const handleToggleImportant = (eventId: number) => {
        const updatedEvents = events.map(ev => {
            if (ev.resource.id === eventId) {
                return {
                    ...ev,
                    resource: {
                        ...ev.resource,
                        isImportant: !ev.resource.isImportant
                    }
                };
            }
            return ev;
        });
        setEvents(updatedEvents);
        if (updatedEvents.find(e => e.resource.id === eventId)?.resource.isImportant) {
            toast.info("Đã gắn tag quan trọng!");
        } else {
            toast.warn("Đã bỏ tag quan trọng.");
        }
    };

    const EventComponent = ({ event }: { event: CalendarEvent }) => {
        const { resource } = event;
        return (
            <div className="flex items-center space-x-1 p-1">
                {resource.isImportant && (
                    <BsPinAngleFill className="text-red-500" title="Lịch hẹn quan trọng" />
                )}
                <span className="text-sm font-semibold">{event.title}</span>
            </div>
        );
    };

    const eventPropGetter = (event: CalendarEvent) => {
        const backgroundColor = event.resource.isImportant ? '#ffdddd' : '#a8e6cf';
        const style = {
            backgroundColor,
            borderRadius: '5px',
            opacity: 0.8,
            color: 'black',
            border: `1px solid ${event.resource.isImportant ? '#f44336' : '#62a87c'}`
        };
        return { style };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-y-4">
                <div className="relative h-[100px] w-[100px]">
                    <div className="animate-spin rounded-full h-[90px] w-[90px] border-t-2 border-l-2 border-teal-400 absolute"></div>
                    <div className="animate-spin rounded-full h-[80px] w-[80px] border-t-2 border-r-2 border-purple-400 absolute top-1 left-1"></div>
                    <div className="animate-spin rounded-full h-[70px] w-[70px] border-b-2 border-green-400 absolute top-2 left-2"></div>
                    <div className="animate-spin rounded-full h-[70px] w-[70px] border-b-2 border-blue-400 absolute top-2 left-2"></div>
                    <div className="animate-spin rounded-full h-[70px] w-[70px] border-b-2 border-red-400 absolute top-2 left-2"></div>
                </div>
                <div className="flex items-center">
                    <FaLeaf className="animate-bounce text-green-400 text-xl mr-2" />
                    <span className="text-gray-600 text-sm">Đang thư giãn và tải dữ liệu...</span>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="sm:p-4 pt-0 space-y-3 mb-6 sm:mt-0 mt-10"
        >
            <ToastContainer />
            <p className="sm:text-2xl text-lg font-bold mb-6">Lịch phân công nhân viên 📅</p>
            
            <div className="h-[700px] bg-white p-4 rounded-lg shadow-md">
                <DragAndDropCalendar
                    localizer={localizer}
                    events={events}
                    style={{ height: '100%' }}
                    messages={{
                        today: 'Hôm nay',
                        previous: 'Trước',
                        next: 'Tiếp theo',
                        month: 'Tháng',
                        week: 'Tuần',
                        day: 'Ngày',
                        agenda: 'Lịch trình'
                    }}
                    onSelectEvent={() => handleSelectEvent}
                    resizable
                    onEventDrop={()=>handleEventDrop}
                    components={{
                        event: EventComponent
                    }}
                    eventPropGetter={eventPropGetter}
                />
            </div>

            {/* Modal hiển thị chi tiết lịch hẹn */}
            <Modal
                isOpen={showDetailModal}
                onRequestClose={() => setShowDetailModal(false)}
                className="fixed inset-0 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75 z-50"
                overlayClassName="fixed inset-0 bg-gray-900 bg-opacity-50"
            >
                {selectedEvent && (
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h2 className="text-2xl font-bold flex items-center">
                                <BsCalendarCheck className="mr-2 text-teal-500" />
                                Chi tiết Lịch hẹn
                            </h2>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <p className="text-gray-700"><strong>Bệnh nhân:</strong> {selectedEvent.appointment.patientName}</p>
                            <p className="text-gray-700"><strong>Dịch vụ:</strong> {selectedEvent.appointment.service.serviceName}</p>
                            <p className="text-gray-700"><strong>Nhân viên:</strong> {selectedEvent.staff.name}</p>
                            <p className="text-gray-700"><strong>Phòng ban:</strong> {selectedEvent.department.departmentName}</p>
                            <p className="text-gray-700"><strong>Ghi chú:</strong> {selectedEvent.note || "Không có ghi chú"}</p>
                            <p className="text-gray-700">
                                <strong>Thời gian:</strong> {moment(selectedEvent.assignedDate).format('HH:mm DD/MM/YYYY')}
                            </p>
                            <p className="text-gray-700">
                                <strong>Trạng thái:</strong> <span className={`font-semibold ${selectedEvent.appointment.status === 'CONFIRMED' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {selectedEvent.appointment.status}
                                </span>
                            </p>
                            <p className="flex items-center text-gray-700">
                                <strong>Quan trọng:</strong>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${selectedEvent.isImportant ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {selectedEvent.isImportant ? 'Có' : 'Không'}
                                </span>
                            </p>
                        </div>
                        <div className="mt-6 flex justify-end space-x-4">
                            <button
                                onClick={() => handleToggleImportant(selectedEvent.id)}
                                className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors duration-200 ${
                                    selectedEvent.isImportant ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                                }`}
                            >
                                {selectedEvent.isImportant ? 'Bỏ tag quan trọng' : 'Gắn tag quan trọng'}
                            </button>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </motion.div>
    );
};

export default AssignmentSchedule;