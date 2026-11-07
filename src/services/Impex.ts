import api from './api';
import type { ImpexCategorySuggestion, ImpexResponse, ImpexSavePayload, ImpexShippingOption, MasterOption, MasterSuggestion, SavedImpexPart } from '../types/impex';

export const impexService = {
  savePart: async (payload: ImpexSavePayload): Promise<any> => {
    const response = await api.post('/impex/save', payload);
    return response.data;
  },
  searchPart: async (partNo: string): Promise<ImpexResponse> => {
    const response = await api.get(`/impex/search?part_no=${encodeURIComponent(partNo)}`);
    return response.data;
  },
  setCategory: async (id: string, categoryId: string | null) => {
    const response = await api.put(`/impex/category/${id}`, { category_id: categoryId });
    return response.data;
  },
  suggestCategories: async (onlyMissing = true): Promise<{ success: boolean; data: ImpexCategorySuggestion[] }> => {
    const response = await api.post('/impex/categories/suggest', { only_missing: onlyMissing }, { timeout: 120_000 });
    return response.data;
  },
  applyCategories: async (items: Array<{ id: string; category_id: string }>) => {
    const response = await api.post('/impex/categories/apply', { items });
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
  updatePart: async (payload: Partial<ImpexSavePayload> & { id?: string }): Promise<any> => {
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
  // Fichas sugeridas para piezas sin ficha + todas las fichas para el selector
  masterSuggestions: async (): Promise<{ suggestions: MasterSuggestion[]; masters: MasterOption[] }> => {
    const response = await api.get('/impex/master-suggestions');
    return response.data.data;
  },
  linkMasters: async (links: Array<{ part_id: string; master_id: string | null }>): Promise<{ updated: number }> => {
    const response = await api.put('/impex/link-masters', { links });
    return response.data.data;
  },
  // Qué productos saldrían en el lote; no guarda nada
  previewBatch: async (id: string): Promise<BatchPreview> => {
    const response = await api.get(`/quotes/${id}/batch-preview`, { timeout: 60_000 });
    return response.data.data;
  },
  convertQuoteToBatch: async (id: string): Promise<{ success: boolean; data: { batch_number: string; products_created: number } }> => {
    const response = await api.post(`/quotes/${id}/convert`, undefined, { timeout: 90_000 });
    return response.data;
  },
  deleteQuote: async (id: string): Promise<any> => {
    const response = await api.delete(`/quotes/${id}`);
    return response.data;
  }
};

export interface PlannedBatchProduct {
  impex_part_id: string | null;
  part_no: string | null;
  template: 'ficha' | 'producto' | 'impex';
  name: string;
  price: number;
  cost: number;
  condition: string;
  category_name: string | null;
  group_tag: string | null;
  oem_code: string | null;
  master_id: string | null;
  master_name: string | null;
  models: Array<{ id: string; name: string }>;
  photos: Array<{ url: string; is_primary: boolean; sort_order: number }>;
  warnings: string[];
}

export interface BatchPreview {
  quote_number: string;
  already_converted: boolean;
  existing_batch: string | null;
  batch_number: string;
  costs: { purchase_total_cost: number; shipping_cost: number; customs_fees: number; additional_fees: number; total_cost: number };
  products: PlannedBatchProduct[];
}
