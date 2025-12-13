

import HieuSuatNV from "../../page/dashboard/Hieu_suat_NV";
import ThongKeTC from "../../page/dashboard/Thong_Ke_TC";
import ServicePaymentHistory from "../../page/history/LS_ServiceSpa";
import ProductAdd from "../../page/products/ProductAdd";
import ProductList from "../../page/products/ProductList";
import EmployeeList from "../../page/employees/EmployeesList";
import StaffAccounts from "../../page/employees/StaffAccounts";
import OrderPaymentHistory from "../../page/history/LS_Order";
import AssignmentSchedule from "../../page/employees/AssignmentSchedule";
import DentalStaffAssignment from "../../page/employees/DentalStaffAssignment";
import { AppointmentPage } from "@/page/appointment/AppointmentPage";
import { ServicePage } from "@/page/servicesDental/ServicePage";
import { CustomerFormPage } from "@/page/customer/CustomerFormPage";
import { ReferrerPage } from "@/page/customer/ReferrerPage";
import { DailySchedulePage } from "@/page/appointment/DailySchedulePage";
import { PersonalProfilePage } from "@/page/employees/PersonalProfilePage";
import AppointmentList from "@/page/appointment/AppointmentList";
import DentalAppointmentSchedule from "@/page/appointment/Dentalappointmentschedule";
import CustomerList from "@/page/customer/CustomerList";
import {motion} from 'framer-motion'
import DrugList from "@/page/servicesDental/DrugList";
import PrescriptionPage from "@/page/servicesDental/Prescription";
import DiscountsPage from "@/page/discountCode/DIscounts";
import PrescriptionListPage from "@/page/servicesDental/PrescriptionList";
import PrescriptionSamplePage from "@/page/integration/PrescriptionSample";
import SupplierList from "@/page/supplier/SupplierList";
import DichVuTK from "@/page/dashboard/Service-statistics";
import PaymentList from "@/page/servicesDental/PaymentList";
import Consultation from "@/page/consultation/Consultation";
import BranchList from "@/page/integration/BranchList";


interface DetailsProps {
    currentPage: string;
}

const Details: React.FC<DetailsProps> = ({ currentPage }) => {
    return (
        <div className="overflow-y-auto p-4 pb-10 bg-gray-200 dark:bg-gray-800  text-gray-900 dark:text-white" style={{ height: 'calc(100vh - 64px)' }}>

            {/* Render chi tiết trang tùy thuộc vào currentPage */}
            {currentPage === 'home' &&
                <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-lg p-6">
                    <motion.img src="/tooth.png" alt="tooth" className="w-24 h-24 mb-4 animate-bounce" />
                    <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-blue-500 to-pink-500">Chào mừng đến với hệ thống quản lý Nha Khoa!</p>
                </div>
            }

            {currentPage === 'hsnv' && <HieuSuatNV />}
            {currentPage === 'tktc' && <ThongKeTC />}
            {currentPage === 'dichvutk' && <DichVuTK />}

            {/* Nhan vien */}
            {currentPage === 'themNV' && <PersonalProfilePage />}
            {currentPage === 'danhsachNV' && <EmployeeList />}
            {currentPage === 'danhsachTaiKhoanNV' && <StaffAccounts />}
            {currentPage === 'phancongNV' && <DentalStaffAssignment />}
            {currentPage === 'lichNV' && <AssignmentSchedule />}

            {/* Khach hang */}
            {currentPage === 'themKH' && <CustomerFormPage />}
            {currentPage === "danhsachKH" && <CustomerList />}
            {currentPage === "nguoigt" && <ReferrerPage />}


            {/* Dịch vụ */}
            {currentPage === 'them' && ''}
            {currentPage === 'drugs' && <DrugList />}
            {currentPage === 'prescription' && <PrescriptionPage />}
            {currentPage === 'serviceDental' && <ServicePage />}
            {currentPage === 'prescriptionlist' && <PrescriptionListPage />}
            {currentPage === 'paymentlist' && <PaymentList />}

            {/* Lịch hẹn */}
            {currentPage === 'themLH' && <AppointmentPage />}
            {currentPage === 'danhsachLH' && <AppointmentList />}
            {currentPage === 'lichTrongNgay' && <DailySchedulePage />}
            {currentPage === 'lichTuVan' && <Consultation /> }
            {currentPage === 'lichTheoBacSi' && <DentalAppointmentSchedule />}

            {/* Thẻ + ưu đãi */}
            {currentPage === 'danhsachThe' && <DiscountsPage />}

            {/* Tích hợp */}
            {currentPage === 'prescriptionsample' && <PrescriptionSamplePage />}
            {currentPage === 'branchs' && <BranchList />}

            {/* Kho */}
            {currentPage === 'supplier' && <SupplierList />}
         

            {/* Sản phẩm */}
            {currentPage === 'themSP' && <ProductAdd />}
            {currentPage === 'danhsachSP' && <ProductList />}


            {/* Lịch sử */}
            {currentPage === 'lsdv' && <ServicePaymentHistory />}
            {currentPage === "lsdh" && <OrderPaymentHistory />}
        </div>
    );
}

export default Details;