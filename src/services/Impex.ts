import api from './api';
import type { ImpexResponse, ImpexSavePayload, SavedImpexPart } from '../types/impex';

export const impexService = {
  savePart: async (payload: ImpexSavePayload): Promise<any> => {
    const response = await api.post('/impex/save', payload);
    return response.data;
  },
  searchPart: async (partNo: string): Promise<ImpexResponse> => {
    const response = await api.get(`/impex/search?part_no=${encodeURIComponent(partNo)}`);
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
  }
};
