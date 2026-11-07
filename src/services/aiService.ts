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

export interface CatalogSuggestion {
  part_no: string;
  name: string;
  reason: string;
  impex: { found: boolean; name?: string | null; price_yen?: number | null; discontinued?: boolean; replaced_by?: string | null } | null;
  already_saved: boolean;
  saved_as?: { part_no: string; name: string } | null;
}

export interface QuoteProposal {
  notes: string;
  items: Array<{ part_id: string; quantity: number; reason: string }>;
  missing: CatalogSuggestion[];
  subtotal_usd: number;
  over_limit: boolean;
}

export const aiService = {
  buildQuote: async (request: string, limitUsd: number | null): Promise<QuoteProposal> => {
    const response = await api.post('/ai/quote/build', { request, limit_usd: limitUsd }, { timeout: 180_000 });
    return response.data.data;
  },
  askCatalog: async (
    question: string,
    partIds: string[],
    filters: { category_id?: string | null; moto_model_id?: string | null }
  ): Promise<{ answer: string; suggestions: CatalogSuggestion[]; parts_count: number }> => {
    const response = await api.post('/ai/catalog/ask', { question, part_ids: partIds, ...filters }, { timeout: 180_000 });
    return response.data.data;
  },
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
