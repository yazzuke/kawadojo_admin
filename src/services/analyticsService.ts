import api from './api';

export interface GroupRow { name: string; sessions: number; whatsapp: number; cart: number; ordered: number }

export interface AnalyticsSummary {
  from: string;
  to: string;
  totals: {
    sessions: number;
    sessions_with_whatsapp: number;
    page_view: number;
    product_view: number;
    whatsapp_click: number;
    add_to_cart: number;
    checkout_start: number;
    order_placed: number;
    search: number;
    orders: number;
    revenue: number;
    profit: number;
  };
  daily: { date: string; sessions: number; page_views: number; product_views: number; whatsapp_clicks: number; orders: number; revenue: number }[];
  sources: GroupRow[];
  devices: GroupRow[];
  countries: GroupRow[];
  products: {
    id: string;
    name: string;
    price: number | null;
    in_stock: boolean;
    condition: string | null;
    views: number;
    whatsapp_clicks: number;
    add_to_cart: number;
    sold: number;
    revenue: number;
  }[];
  pages: { path: string; views: number }[];
  searches: { query: string; count: number }[];
}

export interface AuditEntry {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  method: string;
  path: string;
  entity: string | null;
  entity_id: string | null;
  status_code: number;
  ip: string | null;
  body: unknown;
}

export interface AuditFilters {
  entity?: string;
  entity_id?: string;
  from?: string;
  to?: string;
  failed?: boolean;
  limit?: number;
}

export const analyticsService = {
  async summary(from: string, to: string): Promise<AnalyticsSummary> {
    const { data } = await api.get('/analytics/summary', { params: { from, to } });
    return data.data;
  },
  async audit(filters: AuditFilters): Promise<AuditEntry[]> {
    const { data } = await api.get('/analytics/audit', { params: filters });
    return data.data;
  },
};

// Nombres en español para lo que guarda el backend
export const ENTITY_LABELS: Record<string, string> = {
  products: 'Productos',
  'product-masters': 'Fichas',
  orders: 'Órdenes',
  batches: 'Lotes',
  categories: 'Categorías',
  'moto-models': 'Modelos',
  users: 'Usuarios',
  reviews: 'Reseñas',
  impex: 'Impex',
  quotes: 'Cotizaciones',
  expenses: 'Gastos',
  losses: 'Pérdidas',
  'interest-payments': 'Intereses',
  'profit-withdrawals': 'Retiros',
  'customer-requests': 'Pedidos de clientes',
  upload: 'Fotos subidas',
  ebay: 'eBay',
  oem: 'Catálogo OEM',
  financial: 'Finanzas',
  cart: 'Carrito',
};

export const METHOD_LABELS: Record<string, { label: string; tone: string }> = {
  POST: { label: 'Creó', tone: 'bg-kawa-green/15 text-kawa-green' },
  PUT: { label: 'Editó', tone: 'bg-blue-500/15 text-blue-300' },
  PATCH: { label: 'Editó', tone: 'bg-blue-500/15 text-blue-300' },
  DELETE: { label: 'Borró', tone: 'bg-red-500/15 text-red-300' },
};

export const SOURCE_LABELS: Record<string, string> = {
  directo: 'Directo / WhatsApp',
  google: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
  bing: 'Bing',
  mercadolibre: 'Mercado Libre',
};

export const formatCop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
export const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');

/** Fecha de Bogotá en YYYY-MM-DD, n días atrás */
export const bogotaDay = (daysAgo = 0) => new Date(Date.now() - 5 * 3_600_000 - daysAgo * 86_400_000).toISOString().slice(0, 10);
