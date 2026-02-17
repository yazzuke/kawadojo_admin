import api from './api';
import type { FinancialSummaryData, MonthlySummaryData } from '../types/financialresume';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const financialService = {
  async getSummary(year?: number): Promise<FinancialSummaryData> {
    const params = year ? `?year=${year}` : '';
    const response = await api.get<ApiResponse<FinancialSummaryData>>(`/financial/summary${params}`);
    return response.data.data;
  },

  async getMonthlySummary(year?: number): Promise<MonthlySummaryData> {
    const params = year ? `?year=${year}` : '';
    const response = await api.get<ApiResponse<MonthlySummaryData>>(`/financial/monthly${params}`);
    return response.data.data;
  },

  async createExpense(data: {
    name: string;
    amount: number;
    expense_date: string;
    notes?: string;
  }) {
    const response = await api.post<ApiResponse<unknown>>('/expenses', data);
    return response.data;
  },

  async createInterest(data: {
    name: string;
    amount: number;
    source: string;
    creditor?: string;
    payment_date: string;
    notes?: string;
  }) {
    const response = await api.post('/interest-payments', data);
    return response.data;
  },

  async createLoss(data: {
    name: string;
    amount: number;
    reason: string;
    order_id?: string;
    loss_date: string;
    notes?: string;
  }) {
    const response = await api.post('/losses', data);
    return response.data;
  },
};
