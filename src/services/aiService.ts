import api from './api';

export type CompatScope = 'impex' | 'products';

export interface ModelRef { id: string; name: string }

export interface CompatSuggestion {
  id: string;
  code: string | null;
  name: string;
  current_models: ModelRef[];
  models: ModelRef[];
  inferred_models: ModelRef[];
  new_models: string[];
  confidence: 'alta' | 'media' | 'baja';
  reason: string;
}

export interface ImpexVerification {
  id: string;
  found: boolean;
  error?: boolean;
  discontinued?: boolean;
  replaced_by?: string | null;
  price_yen_saved?: number | null;
  price_yen_now?: number | null;
}

export const aiService = {
  getStatus: async (): Promise<{ impex: number; products: number; ai_configured: boolean }> => {
    const response = await api.get('/ai/compatibility/status');
    return response.data.data;
  },
  suggest: async (scope: CompatScope, onlyMissing: boolean): Promise<CompatSuggestion[]> => {
    const response = await api.post('/ai/compatibility/suggest', { scope, only_missing: onlyMissing }, { timeout: 180_000 });
    return response.data.data;
  },
  verifyImpex: async (ids: string[]): Promise<ImpexVerification[]> => {
    const response = await api.post('/ai/compatibility/verify-impex', { ids }, { timeout: 180_000 });
    return response.data.data;
  },
  apply: async (
    scope: CompatScope,
    items: Array<{ id: string; model_ids: string[]; new_models: string[] }>
  ): Promise<{ links_created: number; models_created: string[] }> => {
    const response = await api.post('/ai/compatibility/apply', { scope, items });
    return response.data.data;
  },
};
