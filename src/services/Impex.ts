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
  }
};
