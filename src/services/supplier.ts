import { http } from "./http";
import type { ApiResponse } from "./user";

export interface Supplier {
	id?: number;
	code: string;
	name: string;
	phone?: string;
	representative?: string;
	bankCode?: string;
	bankAccount?: string;
	deposit?: number;
	email?: string;
	laboTemplate?: string;
	address?: string;
}

export const SupplierAPI = {
	async getAll(): Promise<ApiResponse<Supplier[]>> {
		try {
			const res = await http.get('/api/suppliers');
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<Supplier[]>;
			}
			return { success: true, message: '', data: (raw as Supplier[]) || [] } as ApiResponse<Supplier[]>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error may have response
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: [] } as ApiResponse<Supplier[]>;
		}
	},

	async getById(id: number): Promise<ApiResponse<Supplier>> {
		try {
			const res = await http.get(`/api/suppliers/${id}`);
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<Supplier>;
			}
			return { success: true, message: '', data: raw as Supplier } as ApiResponse<Supplier>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error may have response
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null as unknown as Supplier } as ApiResponse<Supplier>;
		}
	},

	async create(payload: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
		try {
			const res = await http.post('/api/suppliers', payload, { headers: { 'Content-Type': 'application/json' } });
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<Supplier>;
			}
			return { success: true, message: '', data: raw as Supplier } as ApiResponse<Supplier>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error may have response
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null as unknown as Supplier } as ApiResponse<Supplier>;
		}
	},

	async update(id: number, payload: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
		try {
			const res = await http.put(`/api/suppliers/${id}`, payload, { headers: { 'Content-Type': 'application/json' } });
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<Supplier>;
			}
			return { success: true, message: '', data: raw as Supplier } as ApiResponse<Supplier>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error may have response
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null as unknown as Supplier } as ApiResponse<Supplier>;
		}
	},

	async delete(id: number): Promise<ApiResponse<null>> {
		try {
			const res = await http.delete(`/api/suppliers/${id}`);
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<null>;
			}
			return { success: true, message: '', data: null } as ApiResponse<null>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error may have response
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null } as ApiResponse<null>;
		}
	},

	async deleteAll(): Promise<ApiResponse<null>> {
		try {
			const res = await http.delete('/api/suppliers');
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<null>;
			}
			return { success: true, message: '', data: null } as ApiResponse<null>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error may have response
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null } as ApiResponse<null>;
		}
	}
};

