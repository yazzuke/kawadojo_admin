import api from './api';
import type {
	ProfitWithdrawal,
	ProfitWithdrawalListResponse,
	ProfitWithdrawalResponse,
} from '../types/profit_withdrawals';

export const profitWithdrawalsService = {
	async list(params?: {
		from?: string;
		to?: string;
		category?: string;
		page?: number;
		limit?: number;
	}): Promise<ProfitWithdrawalListResponse> {
		const res = await api.get('/profit-withdrawals', { params });
		return res.data;
	},

	async getById(id: string): Promise<ProfitWithdrawalResponse> {
		const res = await api.get(`/profit-withdrawals/${id}`);
		return res.data;
	},

	async create(data: Omit<ProfitWithdrawal, 'id' | 'created_at'>): Promise<ProfitWithdrawalResponse> {
		const res = await api.post('/profit-withdrawals', data);
		return res.data;
	},

	async update(id: string, data: Partial<Omit<ProfitWithdrawal, 'id' | 'created_at'>>): Promise<ProfitWithdrawalResponse> {
		const res = await api.put(`/profit-withdrawals/${id}`, data);
		return res.data;
	},

	async remove(id: string): Promise<{ success: boolean }> {
		const res = await api.delete(`/profit-withdrawals/${id}`);
		return res.data;
	},
};
