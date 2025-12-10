import { http } from './http';

// Interface para DentalInfo
export interface DentalInfo {
  id?: number;
  name: string;
  code?: string;
  address?: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Interface para resposta de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Service API cho DentalInfo
const DentalInfoAPI = {
  // Lấy danh sách tất cả
  getAll: async (): Promise<ApiResponse<DentalInfo[]>> => {
    try {
      const response = await http.get<DentalInfo[]>('/api/dental-info');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Error fetching dental infos:', error);
      return {
        success: false,
        error: 'Lỗi khi tải danh sách thông tin phòng khám',
      };
    }
  },

  // Lấy theo ID
  getById: async (id: number): Promise<ApiResponse<DentalInfo>> => {
    try {
      const response = await http.get<DentalInfo>(`/api/dental-info/${id}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(`Error fetching dental info ${id}:`, error);
      return {
        success: false,
        error: 'Lỗi khi tải thông tin phòng khám',
      };
    }
  },

  // Tạo mới
  create: async (data: DentalInfo): Promise<ApiResponse<DentalInfo>> => {
    try {
      const response = await http.post<DentalInfo>('/api/dental-info', data);
      return {
        success: true,
        data: response.data,
        message: 'Thêm mới thông tin phòng khám thành công',
      };
    } catch (error) {
      console.error('Error creating dental info:', error);
      return {
        success: false,
        error: 'Lỗi khi thêm mới thông tin phòng khám',
      };
    }
  },

  // Cập nhật
  update: async (id: number, data: DentalInfo): Promise<ApiResponse<DentalInfo>> => {
    try {
      const response = await http.put<DentalInfo>(`/api/dental-info/${id}`, data);
      return {
        success: true,
        data: response.data,
        message: 'Cập nhật thông tin phòng khám thành công',
      };
    } catch (error) {
      console.error(`Error updating dental info ${id}:`, error);
      return {
        success: false,
        error: 'Lỗi khi cập nhật thông tin phòng khám',
      };
    }
  },

  // Xóa
  delete: async (id: number): Promise<ApiResponse<null>> => {
    try {
      await http.delete(`/api/dental-info/${id}`);
      return {
        success: true,
        message: 'Xóa thông tin phòng khám thành công',
      };
    } catch (error) {
      console.error(`Error deleting dental info ${id}:`, error);
      return {
        success: false,
        error: 'Lỗi khi xóa thông tin phòng khám',
      };
    }
  },
};

export default DentalInfoAPI;
