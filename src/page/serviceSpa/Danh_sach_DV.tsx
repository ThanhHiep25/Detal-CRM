import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaCaretDown, FaTimes, FaRegTrashAlt } from "react-icons/fa";
import { VscSettingsGear } from "react-icons/vsc";

interface Service {
    id: string;
    name: string;
    price: number;
    unit: string;
    status: "Hoạt động" | "Ngưng";
}

export default function Services() {
    const [services, setServices] = useState<Service[]>([
        { id: "DV00018", name: "Tẩy Trắng Pola", price: 2500000, unit: "Nguyên 2 Hàm", status: "Hoạt động" },
        { id: "DV00019", name: "Tẩy Trắng Zoom 2", price: 3500000, unit: "Nguyên 2 Hàm", status: "Hoạt động" },
    ]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [serviceToDisable, setServiceToDisable] = useState<Service | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    const [visibleColumns, setVisibleColumns] = useState({
        id: true,
        name: true,
        price: true,
        unit: true,
        status: true,
        action: true,
    });

    const toggleColumn = (col: keyof typeof visibleColumns) => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
    };

    const handleDisable = (service: Service) => {
        setServiceToDisable(service);
        setShowConfirm(true);
    };

    const confirmDisable = () => {
        if (serviceToDisable) {
            setServices(prev =>
                prev.map(s =>
                    s.id === serviceToDisable.id ? { ...s, status: "Ngưng" } : s
                )
            );
        }
        setShowConfirm(false);
    };

    const renderStatusBadge = (status: "Hoạt động" | "Ngưng") => {
        const colorClass = status === "Hoạt động" ? "bg-blue-200 text-blue-800" : "bg-red-200 text-red-800";
        return (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md space-y-4 h-screen overflow-y-auto max-h-[calc(96vh-100px)]">
            <h1 className="text-2xl font-bold text-gray-800">Quản lý Dịch vụ</h1>
            
            {/* Thanh hành động */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-md"
                >
                    <FaPlus className="mr-2" /> Thêm mới
                </button>

                <div className="relative flex gap-2">
                    {/* Nút xuất file */}
                    <motion.div className="relative" onHoverStart={() => setShowExportMenu(true)} onHoverEnd={() => setShowExportMenu(false)}>
                        <button className="flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors duration-200 font-medium">
                            Xuất file <FaCaretDown className="ml-2" />
                        </button>
                        <AnimatePresence>
                            {showExportMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-2 w-48 origin-top-right bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-10"
                                >
                                    <button className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">Xuất dữ liệu Excel</button>
                                    <button className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">Xuất dữ liệu PDF</button>
                                    <button className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left">Tùy chọn</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Nút xem thêm */}
                    <motion.div className="relative" onHoverStart={() => setShowSettingsMenu(true)} onHoverEnd={() => setShowSettingsMenu(false)}>
                        <button className="flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors duration-200 font-medium">
                            Xem thêm <VscSettingsGear className="ml-2" />
                        </button>
                        <AnimatePresence>
                            {showSettingsMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-2 w-56 origin-top-right bg-white border border-gray-200 rounded-lg shadow-xl p-2 space-y-2 z-10"
                                >
                                    <p className="font-semibold text-sm text-gray-700">Hiển thị cột</p>
                                    <hr className="my-1 border-gray-200" />
                                    {Object.keys(visibleColumns).map(col => (
                                        <label key={col} className="flex items-center gap-2 text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns[col as keyof typeof visibleColumns]}
                                                onChange={() => toggleColumn(col as keyof typeof visibleColumns)}
                                                className="form-checkbox text-purple-600 rounded"
                                            />
                                            <span className="capitalize">{col}</span>
                                        </label>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            {/* Bảng dịch vụ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm"
            >
                <table className="min-w-full text-sm text-gray-700 divide-y divide-gray-200">
                    <thead className="bg-purple-50">
                        <tr>
                            {visibleColumns.id && <th className="px-6 py-3 text-left font-semibold text-gray-600">Mã</th>}
                            {visibleColumns.name && <th className="px-6 py-3 text-left font-semibold text-gray-600">Dịch vụ</th>}
                            {visibleColumns.price && <th className="px-6 py-3 text-right font-semibold text-gray-600">Đơn giá</th>}
                            {visibleColumns.unit && <th className="px-6 py-3 text-left font-semibold text-gray-600">Đơn vị</th>}
                            {visibleColumns.status && <th className="px-6 py-3 text-left font-semibold text-gray-600">Tình trạng</th>}
                            {visibleColumns.action && <th className="px-6 py-3 text-center font-semibold text-gray-600">Xử lý</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {services.map(service => (
                            <tr key={service.id} className="hover:bg-gray-50 transition-colors duration-150">
                                {visibleColumns.id && <td className="px-6 py-4">{service.id}</td>}
                                {visibleColumns.name && <td className="px-6 py-4 font-medium">{service.name}</td>}
                                {visibleColumns.price && <td className="px-6 py-4 text-right">{service.price.toLocaleString()} đ</td>}
                                {visibleColumns.unit && <td className="px-6 py-4">{service.unit}</td>}
                                {visibleColumns.status && <td className="px-6 py-4">{renderStatusBadge(service.status)}</td>}
                                {visibleColumns.action && (
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            className="text-red-500 hover:text-red-700 transition-colors duration-200"
                                            onClick={() => handleDisable(service)}
                                        >
                                            <FaRegTrashAlt className="inline" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </motion.div>

            {/* Modal thêm dịch vụ */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 50 }}
                            className="bg-white rounded-lg w-full max-w-lg p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                <h2 className="text-xl font-bold text-gray-800">Thêm Dịch vụ mới</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-800 transition-colors duration-200">
                                    <FaTimes size={20} />
                                </button>
                            </div>
                            <form className="space-y-4">
                                <input className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200" placeholder="Tên dịch vụ" />
                                <input className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200" placeholder="Mã dịch vụ" />
                                <input type="number" className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200" placeholder="Đơn giá" />
                                <input className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200" placeholder="Đơn vị" />
                                <textarea className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200" placeholder="Ghi chú"></textarea>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors duration-200"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200"
                                    >
                                        Lưu
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal xác nhận */}
            <AnimatePresence>
                {showConfirm && serviceToDisable && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 50 }}
                            className="bg-white rounded-lg shadow-2xl text-center w-full max-w-sm p-6"
                        >
                            <div className="text-4xl text-red-500 mb-4">
                                <FaRegTrashAlt className="inline" />
                            </div>
                            <p className="mb-2 text-gray-800 text-lg font-semibold">
                                Vô hiệu hóa dịch vụ?
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                                Bạn có chắc chắn muốn vô hiệu hóa dịch vụ <strong>{serviceToDisable.id}</strong> không?
                            </p>
                            <div className="flex justify-center gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors duration-200"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={confirmDisable}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors duration-200"
                                >
                                    Vô hiệu hóa
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}