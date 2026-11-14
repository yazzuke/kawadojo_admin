import {
  LayoutDashboard,
  Package,
  Tags,
  Bike,
  ShipWheel,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  ReceiptJapaneseYen,
  BookOpen,
  Sparkles,
  Calculator,
  Layers,
  Inbox,
  Users,
  Store,
  ListOrdered,
  BarChart3,
  History,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem { to: string; icon: LucideIcon; label: string }
export interface NavGroup { title: string | null; items: NavItem[] }

// Menú por secciones: lo de la tienda, lo que se vende, lo que se compra y el dinero
export const navGroups: NavGroup[] = [
  { title: null, items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] },
  {
    title: 'Ventas y clientes',
    items: [
      { to: '/orders', icon: ShoppingBag, label: 'Órdenes' },
      { to: '/analitica', icon: BarChart3, label: 'Analítica' },
      { to: '/solicitudes', icon: Inbox, label: 'Pedidos de clientes' },
      { to: '/users', icon: Users, label: 'Usuarios' },
      { to: '/reviews', icon: MessageSquare, label: 'Reseñas' },
    ],
  },
  {
    title: 'Catálogo de la tienda',
    items: [
      { to: '/products', icon: Package, label: 'Productos' },
      { to: '/fichas', icon: Layers, label: 'Fichas' },
      { to: '/categories', icon: Tags, label: 'Categorías' },
      { to: '/models', icon: Bike, label: 'Modelos' },
      { to: '/resale-pricing', icon: ListOrdered, label: 'Precios Lista' },
    ],
  },
  {
    title: 'Compras e importación',
    items: [
      { to: '/impex', icon: ReceiptJapaneseYen, label: 'Impex' },
      { to: '/impex-cotizaciones', icon: Calculator, label: 'Cotizaciones Impex' },
      { to: '/batches', icon: ShipWheel, label: 'Lotes' },
      { to: '/ebay', icon: Store, label: 'eBay' },
      { to: '/oem', icon: BookOpen, label: 'Catálogo OEM' },
    ],
  },
  {
    title: 'Dinero y herramientas',
    items: [
      { to: '/financial', icon: TrendingUp, label: 'Finanzas' },
      { to: '/ai', icon: Sparkles, label: 'Asistente IA' },
      { to: '/historial', icon: History, label: 'Historial de cambios' },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

/** Qué páginas del menú puede ver cada rol */
export const canSeeNav = (role: string | undefined, item: NavItem) => {
  if (role === 'super_admin') return true;
  if (role === 'admin') return item.to === '/resale-pricing';
  return false; // Por seguridad, si hay otro rol
};

// ---------- Lo que más abres (se guarda solo en este navegador) ----------

const VISITS_KEY = 'kawadojo.visits';
const MAX_RECENT = 8;

export interface RecentEntry { path: string; label: string; at: number }
interface Visits { counts: Record<string, number>; recent: RecentEntry[] }

export const loadVisits = (): Visits => {
  try {
    const v = JSON.parse(localStorage.getItem(VISITS_KEY) || '{}');
    return { counts: v.counts ?? {}, recent: Array.isArray(v.recent) ? v.recent : [] };
  } catch {
    return { counts: {}, recent: [] };
  }
};

const saveVisits = (v: Visits) => {
  try { localStorage.setItem(VISITS_KEY, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
};

/** Anota algo que acabas de abrir: suma una visita y lo pone de primero en "lo último" */
export const rememberVisit = (path: string, label: string, count = true) => {
  const v = loadVisits();
  if (count) v.counts[path] = (v.counts[path] ?? 0) + 1;
  v.recent = [{ path, label, at: Date.now() }, ...v.recent.filter((r) => r.path !== path)].slice(0, MAX_RECENT);
  saveVisits(v);
};
