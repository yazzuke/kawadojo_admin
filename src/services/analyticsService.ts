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
  async customer(userId: string): Promise<CustomerActivity> {
    const { data } = await api.get(`/analytics/customers/${userId}`);
    return data.data;
  },
  async interested(from: string, to: string): Promise<InterestedCustomer[]> {
    const { data } = await api.get('/analytics/interested', { params: { from, to } });
    return data.data;
  },
};

export interface ActivityProduct {
  id: string;
  name: string;
  slug: string | null;
  price: number | null;
  in_stock: boolean | null;
}

export interface CustomerActivity {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    moto: string | null;
    created_at: string | null;
    last_login: string | null;
    orders_count: number;
    recent_orders: { id: string; created_at: string | null; total: number; status: string }[];
  };
  summary: {
    visits: number;
    first_seen: string | null;
    last_seen: string | null;
    page_views: number;
    product_views: number;
    whatsapp_clicks: number;
    add_to_cart: number;
    searches: number;
  };
  products: (ActivityProduct & { views: number; whatsapp_clicks: number; add_to_cart: number; score: number; last_seen: string; path: string | null })[];
  cart: (ActivityProduct & { quantity: number; added_at: string | null })[];
  searches: { query: string; count: number }[];
  visits: {
    start: string;
    end: string;
    source: string;
    device: string | null;
    events: { at: string; type: string; path: string; query: string | null; product: string | null }[];
  }[];
}

export interface InterestedCustomer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  moto: string | null;
  visits: number;
  last_seen: string;
  whatsapp_clicks: number;
  last_order_at: string | null;
  products: (ActivityProduct & { in_cart: boolean })[];
}

/** Link de WhatsApp al cliente con el mensaje listo. Celulares de Colombia: 3xx xxx xxxx → 57… */
export function customerWhatsapp(phone: string | null, message: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  const number = digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits.length >= 11 ? digits : null;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

/** Mensaje para escribirle a un cliente por la pieza que le interesó */
export function followUpMessage(name: string | null, product: { name: string; in_cart?: boolean } | undefined): string {
  const hello = `Hola${name ? ` ${name.split(' ')[0]}` : ''}! Te escribimos de KawaDojo.`;
  if (!product) return `${hello} ¿Te podemos ayudar con algún repuesto para tu moto?`;
  return product.in_cart
    ? `${hello} Vimos que dejaste ${product.name} en el carrito. ¿Te ayudamos a terminar el pedido? Te confirmamos que le sirve a tu moto.`
    : `${hello} ¿Te podemos ayudar con ${product.name}? Te confirmamos que le sirve a tu moto y cómo te llega.`;
}

export const EVENT_LABELS: Record<string, string> = {
  page_view: 'Entró a',
  product_view: 'Miró la pieza',
  whatsapp_click: 'Le dio clic a WhatsApp',
  add_to_cart: 'Agregó al carrito',
  checkout_start: 'Fue a pagar',
  order_placed: 'Hizo un pedido',
  search: 'Buscó',
};

/** Nombre corto de una página de la tienda */
export function pageLabel(path: string): string {
  if (path === '/') return 'Inicio';
  const named: Record<string, string> = {
    '/login': 'Iniciar sesión',
    '/complete-profile': 'Completar perfil',
    '/perfil': 'Su perfil',
    '/mis-pedidos': 'Sus pedidos',
    '/checkout': 'Pago',
    '/stock': 'Stock',
    '/guias': 'Guías',
    '/resenas': 'Reseñas',
    '/envios-y-devoluciones': 'Envíos y devoluciones',
  };
  if (named[path]) return named[path];
  const m = path.match(/^\/(motos|categorias|guias)\/(.+)$/);
  if (m) {
    const kind = m[1] === 'motos' ? 'Moto' : m[1] === 'categorias' ? 'Categoría' : 'Guía';
    return `${kind}: ${m[2].replace(/-/g, ' ')}`;
  }
  return path;
}

export const formatWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

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
