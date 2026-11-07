import api from './api';

export const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'presencial', label: 'En persona' },
  { value: 'web', label: 'Página web' },
  { value: 'otro', label: 'Otro' },
] as const;

export const STATUSES = [
  { value: 'pendiente', label: 'Pendiente', tone: 'bg-gray-700/60 text-gray-300' },
  { value: 'cotizado', label: 'Cotizado', tone: 'bg-blue-500/15 text-blue-300' },
  { value: 'conseguido', label: 'Se lo conseguí', tone: 'bg-yellow-500/15 text-yellow-300' },
  { value: 'vendido', label: 'Vendido', tone: 'bg-kawa-green/15 text-kawa-green' },
  { value: 'perdido', label: 'Perdido', tone: 'bg-red-500/15 text-red-300' },
  { value: 'no_se_consigue', label: 'No se consigue', tone: 'bg-purple-500/15 text-purple-300' },
] as const;

export type Channel = (typeof CHANNELS)[number]['value'];
export type Status = (typeof STATUSES)[number]['value'];

export const channelLabel = (v: string) => CHANNELS.find(c => c.value === v)?.label ?? v;
export const statusInfo = (v: string) => STATUSES.find(s => s.value === v) ?? STATUSES[0];

// Lo que se manda para crear o editar una solicitud
export interface RequestDraft {
  requested_at: string; // YYYY-MM-DD
  channel: Channel;
  customer_name: string;
  customer_phone: string;
  moto_text: string;
  moto_model_id?: string | null;
  part_text: string;
  oem_code: string;
  quantity: number;
  quoted_price: number | null;
  status: Status;
  category_id?: string | null;
  impex_part_id?: string | null;
  master_id?: string | null;
  notes: string;
  source_text?: string | null;
}

export interface CustomerRequest {
  id: string;
  requested_at: string;
  channel: Channel;
  customer_name: string | null;
  customer_phone: string | null;
  moto_text: string | null;
  moto_model_id: string | null;
  part_text: string;
  oem_code: string | null;
  quantity: number;
  quoted_price: number | null;
  status: Status;
  category_id: string | null;
  impex_part_id: string | null;
  master_id: string | null;
  notes: string | null;
  source_text: string | null;
  created_at: string;
  moto_model: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  impex_part: { id: string; part_no: string; name_es: string | null; name_en: string | null } | null;
  master: { id: string; name: string } | null;
}

export interface RequestFilters {
  q?: string;
  status?: string;
  channel?: string;
  moto_model_id?: string;
  category_id?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface Duplicate { id: string; requested_at: string; part_text: string; status: Status }
export interface LinkOption { id: string; label: string }

export const customerRequestService = {
  async list(filters: RequestFilters): Promise<CustomerRequest[]> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''));
    const res = await api.get('/customer-requests', { params });
    return res.data.data;
  },
  async create(rows: RequestDraft[]): Promise<CustomerRequest[]> {
    const res = await api.post('/customer-requests', { rows }, { timeout: 60_000 });
    return res.data.data;
  },
  async update(id: string, row: RequestDraft): Promise<CustomerRequest> {
    const res = await api.put(`/customer-requests/${id}`, row);
    return res.data.data;
  },
  async setStatus(ids: string[], status: Status): Promise<{ updated: number }> {
    const res = await api.patch('/customer-requests/status', { ids, status });
    return res.data.data;
  },
  async remove(id: string) {
    await api.delete(`/customer-requests/${id}`);
  },
  async duplicates(rows: Array<Pick<RequestDraft, 'customer_name' | 'part_text' | 'requested_at'>>): Promise<Duplicate[][]> {
    const res = await api.post('/customer-requests/duplicates', { rows });
    return res.data.data;
  },
  async linkOptions(): Promise<{ impex_parts: LinkOption[]; masters: LinkOption[] }> {
    const res = await api.get('/customer-requests/link-options');
    return res.data.data;
  },
};

// Igual que en el backend: "Ninja-300 2015" encuentra "Ninja 300"; el nombre más largo gana (Z250SL antes que Z250)
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const matchModel = <T extends { id: string; name: string }>(text: string, models: T[]): T | null => {
  const key = normalize(text);
  if (!key) return null;
  return [...models]
    .filter(m => normalize(m.name) && key.includes(normalize(m.name)))
    .sort((a, b) => normalize(b.name).length - normalize(a.name).length)[0] ?? null;
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const formatCop = (n: number) => `$${n.toLocaleString('es-CO')}`;
