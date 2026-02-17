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
};
