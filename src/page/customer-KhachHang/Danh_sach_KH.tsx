import React from 'react';
import { useState } from "react";


interface Customer {
  id: string;
  name: string;
  appointment: string;
  info: string;
  phone: string;
  gender: string;
  dob: string;
}

const mockData: Customer[] = [
  {
    id: "CTU00017309",
    name: "Charles George Patterson",
    appointment: "14:30 Th 7 , 30/08/2025 - Điều trị 3x extraction",
    phone: "6421150294",
    dob: "07-07-1999",
    gender: "Nam",
    info: "07-07-1999 / Nam",
  },
  {
    id: "CTU00018684",
    name: "Trần Văn Hội",
    appointment: "09:00 Th 6 , 29/08/2025 - Điều trị cleaning 2nd, lịch tạm",
    phone: "0903727643",
    dob: "21-06-1974",
    gender: "Nam",
    info: "21-06-1974 / Nam",
  },
  {
    id: "CTU00016434",
    name: "Vinita",
    appointment: "09:30 Th 7 , 30/08/2025 - Điều trị cạo vôi răng, yc chị Ngọt",
    phone: "0702593977",
    dob: "01-01-1990",
    gender: "Nữ",
    info: "01-01-1990 / Nữ",
  },
  {
    id: "CTU00018853",
    name: "new",
    appointment: "09:30 Th 7 , 30/08/2025 - Tư vấn cvr",
    phone: "0123456789",
    dob: "05-07-1999",
    gender: "Nam",
    info: "05-07-1999 / Nam",
  },
  {
    id: "CTU00018868",
    name: "Trần Hiếu Hòa",
    appointment: "14:00 Th 5 , 28/08/2025 - Tư vấn NR 47 + cvr + chụp pano",
    phone: "0932800275",
    dob: "05-07-1977",
    gender: "Nam",
    info: "05-07-1977 / Nam",
  },
]


const CustomersList: React.FC = () => {
const [customers] = useState<Customer[]>(mockData);

    return (
      <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Chăm Sóc - Lịch Hẹn</h1>
        <div className="flex gap-2">
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng"
              className="border rounded p-2"
            />
            <button className="px-3 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600">
              Tìm
            </button>
          </div>
          <button className="px-3 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600">
            Thêm
          </button>
          <button className="px-3 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600">
            Xuất file
          </button>
          <button className="px-3 py-2 bg-gray-100 border rounded-md hover:bg-gray-200">
            Xem thêm
          </button>
        </div>
      </div>

      <table className="w-full border-collapse border text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="border px-3 py-2">#</th>
            <th className="border px-3 py-2">Khách Hàng</th>
            <th className="border px-3 py-2">Lịch Hẹn</th>
            <th className="border px-3 py-2">Thông Tin</th>
            <th className="border px-3 py-2">Xử Lý</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c, idx) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="border px-3 py-2">{idx + 1}</td>
              <td className="border px-3 py-2">
                <p className="text-blue-600 font-medium">{c.id}</p>
                <p>{c.name}</p>
              </td>
              <td className="border px-3 py-2">{c.appointment}</td>
              <td className="border px-3 py-2">
                <p className="text-blue-600">{c.phone}</p>
                <p>{c.info}</p>
              </td>
              <td className="border px-3 py-2">
                <button className="text-blue-500 hover:underline">
                  Xử lý
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-center">
        <button className="text-blue-500 hover:underline">Xem thêm</button>
      </div>
    </div>
  );
    
};

export default CustomersList;