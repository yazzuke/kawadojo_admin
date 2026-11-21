import api from './api';

export interface KitComponent {
  master_id: string;
  name: string;
  oem_code: string | null;
  quantity: number;
  available: number;
  incoming: number;
  kits_possible: number;
  kits_with_incoming: number;
  unit_price: number;
  list_price: number;
  cost: number;
}

export interface Kit {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_percent: number;
  fixed_price: number | null;
  active: boolean;
  units_per_kit: number;
  components: KitComponent[];
  kits_possible: number;
  kits_with_incoming: number;
  list_price: number;
  price: number;
  savings: number;
  cost: number;
  profit: number;
  margin_percent: number;
  missing_for_next: Array<{ name: string; missing: number }>;
  leftovers: Array<{ name: string; units: number }>;
  models: Array<{ id: string; name: string }>;
}

export interface KitPayload {
  name: string;
  description?: string | null;
  discount_type: 'percent' | 'fixed';
  discount_percent: number;
  fixed_price?: number | null;
  active?: boolean;
  items: Array<{ master_id: string; quantity: number }>;
}

export interface KitPick {
  kit: { id: string; name: string };
  count: number;
  total: number;
  list_total: number;
  items: Array<{ product_id: string; name: string; batch: string | null; list_price: number; negotiated_price: number; quantity: number }>;
}

export const kitService = {
  async list(): Promise<Kit[]> {
    const res = await api.get('/kits');
    return res.data.data;
  },
  async create(payload: KitPayload): Promise<Kit> {
    const res = await api.post('/kits', payload);
    return res.data.data;
  },
  async update(id: string, payload: KitPayload): Promise<Kit> {
    const res = await api.put(`/kits/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/kits/${id}`);
  },
  // Qué unidades se venderían (no cambia nada en la base)
  async pick(id: string, count = 1): Promise<KitPick> {
    const res = await api.get(`/kits/${id}/pick`, { params: { count } });
    return res.data.data;
  },
};

export const formatCop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
