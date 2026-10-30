import api from './api';
import type { ImpexResponse, ImpexSavePayload, ImpexShippingOption, SavedImpexPart } from '../types/impex';

export const impexService = {
  savePart: async (payload: ImpexSavePayload): Promise<any> => {
    const response = await api.post('/impex/save', payload);
    return response.data;
  },
  searchPart: async (partNo: string): Promise<ImpexResponse> => {
    const response = await api.get(`/impex/search?part_no=${encodeURIComponent(partNo)}`);
    return response.data;
  },
  updateBuilderSettings: async (id: string, mode: 'auto' | 'fixed' | 'off', qty: number | null) => {
    const response = await api.put(`/impex/builder-settings/${id}`, { mode, qty });
    return response.data;
  },
  getSalesStats: async (): Promise<{ success: boolean; data: import('../Utils/orderBuilder').SalesStat[] }> => {
    const response = await api.get('/impex/sales-stats');
    return response.data;
  },
  calcShipping: async (weightKg: number, priceJpy: number): Promise<{ success: boolean; data: ImpexShippingOption[] }> => {
    const response = await api.get('/impex/shipping', { params: { weight: weightKg, price_jpy: Math.round(priceJpy) } });
    return response.data;
  },
  getSavedParts: async (): Promise<{ success: boolean; data: SavedImpexPart[] }> => {
    const response = await api.get('/impex/saved-parts');
    return response.data;
  },
  fetchMotoModels: async (): Promise<any[]> => {
    const response = await api.get('/moto-models');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },
  updatePart: async (payload: Partial<ImpexSavePayload>): Promise<any> => {
    const response = await api.put('/impex/update', payload);
    return response.data;
  },
  deletePart: async (partNoRaw: string): Promise<any> => {
    const response = await api.delete(`/impex/delete/${encodeURIComponent(partNoRaw)}`);
    return response.data;
  },
  createQuote: async (payload: import('../types/impex').ImpexQuote): Promise<any> => {
    const response = await api.post('/quotes', payload);
    return response.data;
  },
  getQuotes: async (): Promise<{ success: boolean; data: import('../types/impex').ImpexQuote[] }> => {
    const response = await api.get('/quotes');
    return response.data;
  },
  convertQuoteToBatch: async (id: string): Promise<any> => {
    const response = await api.post(`/quotes/${id}/convert`);
    return response.data;
  },
  deleteQuote: async (id: string): Promise<any> => {
    const response = await api.delete(`/quotes/${id}`);
    return response.data;
  }
};
