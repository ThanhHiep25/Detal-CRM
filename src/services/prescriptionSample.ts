import { http } from "./http";
import type { ApiResponse } from "./user";

export interface PrescriptionSample {
	id?: number;
	name: string;
	description?: string;
	status?: string; // e.g. DRAFT, ACTIVE, INACTIVE
	createdAt?: string; // ISO8601
	drugIds?: number[];
}

export type GetPrescriptionSamplesResponse = ApiResponse<PrescriptionSample[]>;

export const PrescriptionSampleAPI = {
	async getSamples(): Promise<GetPrescriptionSamplesResponse> {
		try {
			const res = await http.get('/api/prescription-samples');
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as GetPrescriptionSamplesResponse;
			}
			return { success: true, message: '', data: (raw as PrescriptionSample[]) || [] } as GetPrescriptionSamplesResponse;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error axios error
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: [] } as GetPrescriptionSamplesResponse;
		}
	},

	async getSample(id: number): Promise<ApiResponse<PrescriptionSample>> {
		try {
			const res = await http.get(`/api/prescription-samples/${id}`);
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<PrescriptionSample>;
			}
			return { success: true, message: '', data: (raw as PrescriptionSample) } as ApiResponse<PrescriptionSample>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error axios error
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null as unknown as PrescriptionSample } as ApiResponse<PrescriptionSample>;
		}
	},

	async createSample(payload: Partial<PrescriptionSample>): Promise<ApiResponse<PrescriptionSample>> {
		try {
			const res = await http.post('/api/prescription-samples', payload, {
				headers: { 'Content-Type': 'application/json' }
			});
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<PrescriptionSample>;
			}
			return { success: true, message: '', data: (raw as PrescriptionSample) } as ApiResponse<PrescriptionSample>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error axios error
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null as unknown as PrescriptionSample } as ApiResponse<PrescriptionSample>;
		}
	},

	async updateSample(id: number, payload: Partial<PrescriptionSample>): Promise<ApiResponse<PrescriptionSample>> {
		try {
			const res = await http.put(`/api/prescription-samples/${id}`, payload, {
				headers: { 'Content-Type': 'application/json' }
			});
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<PrescriptionSample>;
			}
			return { success: true, message: '', data: (raw as PrescriptionSample) } as ApiResponse<PrescriptionSample>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error axios error
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null as unknown as PrescriptionSample } as ApiResponse<PrescriptionSample>;
		}
	},

	async deleteSample(id: number): Promise<ApiResponse<null>> {
		try {
			const res = await http.delete(`/api/prescription-samples/${id}`);
			const raw = res.data;
			if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
				return raw as ApiResponse<null>;
			}
			return { success: true, message: '', data: null } as ApiResponse<null>;
		} catch (error: unknown) {
			let message = 'Unknown error';
			if (typeof error === 'object' && error !== null) {
				// @ts-expect-error axios error
				message = error.response?.data?.message || (error as Error).message || message;
			} else if (typeof error === 'string') {
				message = error;
			}
			return { success: false, message, data: null } as ApiResponse<null>;
		}
	}
};

export default PrescriptionSampleAPI;
