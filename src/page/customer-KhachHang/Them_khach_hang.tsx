// src/pages/AddCustomerForm.tsx
import { useState } from "react";

export default function AddCustomerForm() {
  const [gender, setGender] = useState("Nam");
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Hồ sơ khách hàng</h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-2 ${
            activeTab === "general"
              ? "border-b-2 border-blue-500 text-blue-600 font-medium"
              : "text-gray-500"
          }`}
        >
          Thông tin chung
        </button>
        <button
          onClick={() => setActiveTab("other")}
          className={`pb-2 ${
            activeTab === "other"
              ? "border-b-2 border-blue-500 text-blue-600 font-medium"
              : "text-gray-500"
          }`}
        >
          Khác
         
        </button>
      </div>

      {activeTab === "general" && (
        <form className="grid grid-cols-12 gap-4">
          {/* Avatar */}
          <div className="col-span-3 flex flex-col items-center border rounded-lg p-4">
            <div className="w-40 h-40 bg-gray-100 rounded-md flex items-center justify-center">
              <span className="text-gray-400 text-sm">Ảnh</span>
            </div>
            <button
              type="button"
              className="text-blue-500 text-sm mt-2 hover:underline"
            >
              Hướng dẫn
            </button>

            <div className="flex gap-3 mt-4">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={gender === "Nam"}
                  onChange={() => setGender("Nam")}
                />
                Nam
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={gender === "Nữ"}
                  onChange={() => setGender("Nữ")}
                />
                Nữ
              </label>
            </div>
          </div>

          {/* Form fields */}
          <div className="col-span-9 grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Họ và tên</label>
              <input
                className="w-full border rounded p-2 mt-1"
                placeholder="eg. Họ và tên"
              />
            </div>
            <div>
              <label className="text-sm">Ngày sinh</label>
              <input
                type="date"
                className="w-full border rounded p-2 mt-1"
              />
            </div>

            <div>
              <label className="text-sm">Chi nhánh</label>
              <select className="w-full border rounded p-2 mt-1">
                <option>Nha khoa Cẩm Tú - Quận 1</option>
                <option>Nha khoa Cẩm Tú - Quận 3</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Số điện thoại</label>
              <input
                type="tel"
                className="w-full border rounded p-2 mt-1"
                placeholder="Số điện thoại"
              />
            </div>

            <div>
              <label className="text-sm">Nhóm khách hàng</label>
              <input
                className="w-full border rounded p-2 mt-1"
                placeholder="Nhóm khách hàng"
              />
            </div>
            <div>
              <label className="text-sm">Email</label>
              <input
                type="email"
                className="w-full border rounded p-2 mt-1"
                placeholder="eg. email"
              />
            </div>

            <div>
              <label className="text-sm">Nguồn khách hàng</label>
              <select className="w-full border rounded p-2 mt-1">
                <option>Vãng lai</option>
                <option>Online</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Nghề nghiệp</label>
              <input
                className="w-full border rounded p-2 mt-1"
                placeholder="Nghề nghiệp"
              />
            </div>

            <div>
              <label className="text-sm">Địa chỉ</label>
              <input
                className="w-full border rounded p-2 mt-1"
                placeholder="eg. địa chỉ"
              />
            </div>
            <div>
              <label className="text-sm">Quốc tịch</label>
              <input
                className="w-full border rounded p-2 mt-1"
                defaultValue="Vietnam"
              />
            </div>

            <div>
              <label className="text-sm">Tỉnh/Thành phố</label>
              <input
                className="w-full border rounded p-2 mt-1"
                placeholder="eg. Tỉnh/Thành phố"
              />
            </div>
            <div>
              <label className="text-sm">Quận/Huyện</label>
              <input
                className="w-full border rounded p-2 mt-1"
                placeholder="eg. Quận/Huyện"
              />
            </div>

            <div>
              <label className="text-sm">Phường/Xã</label>
              <input
                className="w-full border rounded p-2 mt-1"
                placeholder="eg. Phường/Xã"
              />
            </div>
          </div>

          {/* Checkbox */}
          <div className="col-span-12 mt-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked />
              Quý khách đồng ý cho chúng tôi sử dụng thông tin liên lạc để phục
              vụ điều trị, nhắc hẹn và ưu đãi.
            </label>
          </div>

          {/* Actions */}
          <div className="col-span-12 flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Lưu
            </button>
          </div>
        </form>
      )}

      {activeTab === "other" && (
        <div className="p-4 text-gray-500">Form thông tin khác...  </div>
      )}
    </div>
  );
}


