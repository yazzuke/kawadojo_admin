import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Truck,
  Wallet,
  PackageCheck,
  Inbox,
  ShipWheel,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ShoppingCart,
  RotateCcw,
  History,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navItems, canSeeNav, loadVisits, type NavItem } from '../Utils/nav';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { batchesService } from '../services/batchesService';
import { customerRequestService } from '../services/customerRequestService';
import {
  analyticsService,
  bogotaDay,
  formatCop,
  ENTITY_LABELS,
  METHOD_LABELS,
  type AnalyticsSummary,
  type AuditEntry,
} from '../services/analyticsService';
import type { Order } from '../types/order';
import type { Product } from '../types/product';
import type { Batch } from '../types/batch';
import { ORDER_STATUSES } from '../types/order';

// Páginas que salen en accesos rápidos mientras todavía no hay historial
const DEFAULT_SHORTCUTS = ['/orders', '/products', '/solicitudes', '/batches', '/impex', '/financial'];
const ON_THE_WAY = ['ordered', 'in_mailbox', 'in_transit', 'customs'];
const AWAITING_PAYMENT = ['pending', 'payment_pending', 'awaiting_payment'];

// Las unidades de un mismo repuesto se llaman igual salvo el código del lote al final ("... 076-03")
const groupKey = (name: string) => name.replace(/\s+\d{3}(-\d{1,3})?\s*$/, '').trim().toLowerCase();
const groupName = (name: string) => name.replace(/\s+\d{3}(-\d{1,3})?\s*$/, '').trim();

const timeAgo = (iso: string | number) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
};

// ---------- Piezas pequeñas ----------

function Section({ title, link, children }: { title: string; link?: { to: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="bg-kawa-gray rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">{title}</h2>
        {link && (
          <Link to={link.to} className="text-xs text-gray-400 hover:text-kawa-green inline-flex items-center gap-1">
            {link.label} <ChevronRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Failed({ what }: { what: string }) {
  return <p className="text-sm text-gray-500">No se pudo cargar {what}.</p>;
}

function Loading() {
  return <div className="h-16 rounded-lg bg-gray-800/40 animate-pulse" />;
}

function Todo({ icon: Icon, label, count, to, tone }: { icon: LucideIcon; label: string; count: number; to: string; tone: string }) {
  const done = count === 0;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        done ? 'border-gray-800 bg-kawa-black/40 hover:border-gray-700' : 'border-gray-700 bg-kawa-black hover:border-kawa-green/60'
      }`}
    >
      <div className={`p-2 rounded-lg ${done ? 'bg-gray-800 text-gray-500' : tone}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${done ? 'text-gray-500' : 'text-gray-200'}`}>{label}</p>
      </div>
      <span className={`text-2xl font-bold ${done ? 'text-gray-600' : 'text-white'}`}>{count}</span>
    </Link>
  );
}

function Compare({ label, now, before, money }: { label: string; now: number; before: number; money?: boolean }) {
  const diff = before ? Math.round(((now - before) / before) * 100) : null;
  const up = diff !== null && diff >= 0;
  return (
    <div className="bg-kawa-black rounded-lg p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{money ? formatCop(now) : now.toLocaleString('es-CO')}</p>
      <p className="text-xs mt-1 text-gray-500">
        {diff === null ? (
          'sin datos de la semana pasada'
        ) : (
          <span className={`inline-flex items-center gap-0.5 ${up ? 'text-kawa-green' : 'text-red-400'}`}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(diff)}% vs. semana pasada
          </span>
        )}
      </p>
    </div>
  );
}

function RankList({ rows, unit, empty }: { rows: { name: string; value: number }[]; unit: string; empty: string }) {
  if (!rows.length) return <p className="text-sm text-gray-500">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.name} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-gray-200 truncate" title={r.name}>
              <span className="text-gray-500 mr-2">{i + 1}.</span>
              {r.name}
            </span>
            <span className="text-gray-400 whitespace-nowrap">
              {r.value} {unit}
            </span>
          </div>
          <div className="h-1 mt-1 rounded bg-gray-800">
            <div className="h-1 rounded bg-kawa-green/70" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- Página ----------

type Loaded<T> = T | null | 'error';

export default function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Loaded<Order[]>>(null);
  const [products, setProducts] = useState<Loaded<Product[]>>(null);
  const [batches, setBatches] = useState<Loaded<Batch[]>>(null);
  const [pendingRequests, setPendingRequests] = useState<Loaded<number>>(null);
  const [week, setWeek] = useState<Loaded<AnalyticsSummary>>(null);
  const [month, setMonth] = useState<Loaded<AnalyticsSummary>>(null);
  const [audit, setAudit] = useState<Loaded<AuditEntry[]>>(null);
  const [visits] = useState(loadVisits);

  useEffect(() => {
    // Cada parte carga sola: si una falla, las demás se ven igual
    const load = <T,>(p: Promise<T>, set: (v: Loaded<T>) => void) =>
      p.then(set).catch((err) => {
        console.error('Dashboard:', err);
        set('error');
      });
    load(orderService.getAll(), setOrders);
    load(productService.getAll(), setProducts);
    load(batchesService.getAll(), setBatches);
    load(customerRequestService.list({ status: 'pendiente', limit: 500 }).then((r) => r.length), setPendingRequests);
    load(analyticsService.summary(bogotaDay(6), bogotaDay(0)), setWeek);
    load(analyticsService.summary(bogotaDay(29), bogotaDay(0)), setMonth);
    load(analyticsService.audit({ limit: 6 }), setAudit);
  }, []);

  // Accesos rápidos: lo que más abres, completado con las páginas de siempre
  const shortcuts = useMemo(() => {
    const visible = navItems.filter((i) => i.to !== '/dashboard' && canSeeNav(user?.role, i));
    const byPath = new Map(visible.map((i) => [i.to, i]));
    const ranked = Object.entries(visits.counts)
      .sort((a, b) => b[1] - a[1])
      .map(([path]) => byPath.get(path))
      .filter((i): i is NavItem => !!i);
    const fill = DEFAULT_SHORTCUTS.map((p) => byPath.get(p)).filter((i): i is NavItem => !!i);
    const seen = new Set<string>();
    return [...ranked, ...fill, ...visible].filter((i) => !seen.has(i.to) && seen.add(i.to)).slice(0, 6);
  }, [visits, user?.role]);

  const recent = visits.recent.slice(0, 6);

  // Pendientes de órdenes
  const orderList = Array.isArray(orders) ? orders : [];
  const countStatus = (statuses: string[]) => orderList.filter((o) => statuses.includes(o.status)).length;

  // Semana actual vs. la anterior, día por día
  const compare = useMemo(() => {
    if (!month || month === 'error') return null;
    const thisWeekFrom = bogotaDay(6);
    const lastWeekFrom = bogotaDay(13);
    const sum = (from: string, to: string, key: 'revenue' | 'orders' | 'sessions' | 'whatsapp_clicks') =>
      month.daily.filter((d) => d.date >= from && d.date <= to).reduce((acc, d) => acc + d[key], 0);
    const pair = (key: 'revenue' | 'orders' | 'sessions' | 'whatsapp_clicks') => ({
      now: sum(thisWeekFrom, bogotaDay(0), key),
      before: sum(lastWeekFrom, bogotaDay(7), key),
    });
    return { revenue: pair('revenue'), orders: pair('orders'), sessions: pair('sessions'), whatsapp: pair('whatsapp_clicks') };
  }, [month]);

  // Más vistos y más vendidos de la semana, juntando las unidades del mismo repuesto
  const rank = (summary: AnalyticsSummary, key: 'views' | 'sold') => {
    const groups = new Map<string, { name: string; value: number }>();
    for (const p of summary.products) {
      if (!p[key]) continue;
      const k = groupKey(p.name);
      const g = groups.get(k) ?? { name: groupName(p.name), value: 0 };
      g.value += p[key];
      groups.set(k, g);
    }
    return [...groups.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  };

  // Inventario: lo disponible y lo que se vendió en el mes y ya no tiene otra unidad
  const inventory = useMemo(() => {
    if (!Array.isArray(products)) return null;
    const available = products.filter((p) => p.in_stock);
    const availableKeys = new Set(available.map((p) => groupKey(p.name)));
    let reorder: { name: string; value: number }[] = [];
    if (month && month !== 'error') {
      const sold = new Map<string, { name: string; value: number }>();
      for (const p of month.products) {
        if (!p.sold) continue;
        const k = groupKey(p.name);
        if (availableKeys.has(k)) continue;
        const g = sold.get(k) ?? { name: groupName(p.name), value: 0 };
        g.value += p.sold;
        sold.set(k, g);
      }
      reorder = [...sold.values()].sort((a, b) => b.value - a.value).slice(0, 6);
    }
    return {
      available: available.length,
      soldOut: products.length - available.length,
      value: available.reduce((acc, p) => acc + (p.price || 0), 0),
      reorder,
    };
  }, [products, month]);

  const onTheWay = Array.isArray(batches) ? batches.filter((b) => ON_THE_WAY.includes(b.status)) : [];
  const statusLabel = (s: string) => ORDER_STATUSES.find((x) => x.value === s);
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Bogota' }));
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting}</h1>
        <p className="text-gray-400 text-sm mt-1">Lo que hay que hacer hoy y cómo va la tienda.</p>
      </div>

      {/* 1. Accesos rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Lo que más abres</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {shortcuts.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-4 rounded-xl bg-kawa-gray border border-gray-800 hover:border-kawa-green/60 hover:bg-gray-800/60 transition-colors"
              >
                <Icon size={22} className="text-kawa-green shrink-0" />
                <span className="text-white text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Lo último que abriste</p>
          <div className="bg-kawa-gray rounded-xl border border-gray-800 divide-y divide-gray-800">
            {recent.length === 0 && (
              <p className="p-4 text-sm text-gray-500">Aquí aparecerán las páginas y órdenes que vayas abriendo.</p>
            )}
            {recent.map((r) => (
              <Link key={r.path} to={r.path} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-800/60">
                <span className="text-sm text-gray-200 truncate">{r.label}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo(r.at)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Para hacer hoy */}
      <Section title="Para hacer hoy">
        {orders === null ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {orders === 'error' ? (
              <div className="sm:col-span-2 xl:col-span-3 p-3"><Failed what="las órdenes" /></div>
            ) : (
              <>
                <Todo icon={PackageCheck} label="Pagadas, falta enviarlas" count={countStatus(['paid', 'processing', 'preparing'])} to="/orders?status=paid" tone="bg-kawa-green/15 text-kawa-green" />
                <Todo icon={Wallet} label="Esperando el pago" count={countStatus(AWAITING_PAYMENT)} to="/orders?status=pending" tone="bg-yellow-500/15 text-yellow-300" />
                <Todo icon={Truck} label="Enviadas, falta marcar entregadas" count={countStatus(['shipped'])} to="/orders?status=shipped" tone="bg-purple-500/15 text-purple-300" />
              </>
            )}
            <Todo
              icon={Inbox}
              label="Pedidos de clientes sin responder"
              count={typeof pendingRequests === 'number' ? pendingRequests : 0}
              to="/solicitudes"
              tone="bg-blue-500/15 text-blue-300"
            />
            <Todo icon={ShipWheel} label="Lotes en camino" count={onTheWay.length} to="/batches" tone="bg-orange-500/15 text-orange-300" />
          </div>
        )}
        {Array.isArray(orders) &&
          countStatus(['paid', 'processing', 'preparing', 'shipped', ...AWAITING_PAYMENT]) === 0 && (
            <p className="mt-3 text-sm text-kawa-green inline-flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Todas las órdenes están al día.
            </p>
          )}
        {onTheWay.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {onTheWay.map((b) => (
              <span key={b.id} className="text-xs px-2 py-1 rounded bg-kawa-black border border-gray-800 text-gray-300">
                {b.batch_number} · comprado {timeAgo(b.purchase_date)}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* 3. Cómo va la tienda */}
      <Section title="Cómo va la tienda · últimos 7 días" link={{ to: '/analitica', label: 'Ver analítica' }}>
        {month === null ? (
          <Loading />
        ) : month === 'error' || !compare ? (
          <Failed what="la analítica" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Compare label="Ventas" now={compare.revenue.now} before={compare.revenue.before} money />
            <Compare label="Órdenes" now={compare.orders.now} before={compare.orders.before} />
            <Compare label="Visitas a la tienda" now={compare.sessions.now} before={compare.sessions.before} />
            <Compare label="Clics a WhatsApp" now={compare.whatsapp.now} before={compare.whatsapp.before} />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          <div>
            <p className="text-sm text-gray-300 mb-3 inline-flex items-center gap-2">
              <Eye size={16} className="text-blue-400" /> Lo más visto
            </p>
            {week === null ? <Loading /> : week === 'error' ? <Failed what="las visitas" /> : (
              <RankList rows={rank(week, 'views')} unit="vistas" empty="Nadie ha visto productos esta semana." />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-300 mb-3 inline-flex items-center gap-2">
              <ShoppingCart size={16} className="text-kawa-green" /> Lo más vendido
            </p>
            {week === null ? <Loading /> : week === 'error' ? <Failed what="las ventas" /> : (
              <RankList rows={rank(week, 'sold')} unit="vendidos" empty="No hubo ventas esta semana." />
            )}
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Inventario real */}
        <Section title="Inventario" link={{ to: '/products', label: 'Ver productos' }}>
          {products === null ? <Loading /> : !inventory ? <Failed what="los productos" /> : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-kawa-black rounded-lg p-3">
                  <p className="text-xs text-gray-400">Disponibles</p>
                  <p className="text-2xl font-bold text-white">{inventory.available}</p>
                </div>
                <div className="bg-kawa-black rounded-lg p-3">
                  <p className="text-xs text-gray-400">Agotados</p>
                  <p className="text-2xl font-bold text-gray-500">{inventory.soldOut}</p>
                </div>
                <div className="bg-kawa-black rounded-lg p-3">
                  <p className="text-xs text-gray-400" title="Suma del precio de venta de lo disponible">Vale lo disponible</p>
                  <p className="text-lg font-bold text-kawa-green mt-1">{formatCop(inventory.value)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-5 mb-2 inline-flex items-center gap-2">
                <RotateCcw size={16} className="text-orange-300" /> Se vendió este mes y ya no queda
              </p>
              {month === 'error' ? <Failed what="las ventas del mes" /> : inventory.reorder.length === 0 ? (
                <p className="text-sm text-gray-500">Todo lo que se vendió este mes todavía tiene unidades.</p>
              ) : (
                <ul className="space-y-1.5">
                  {inventory.reorder.map((r) => (
                    <li key={r.name} className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-200 truncate" title={r.name}>{r.name}</span>
                      <span className="text-gray-500 whitespace-nowrap">{r.value} vendidos</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Section>

        {/* 5. Lo último que pasó */}
        <Section title="Últimas órdenes" link={{ to: '/orders', label: 'Ver todas' }}>
          {orders === null ? <Loading /> : orders === 'error' ? <Failed what="las órdenes" /> : (
            <div className="divide-y divide-gray-800">
              {[...orders]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .slice(0, 5)
                .map((o) => {
                  const st = statusLabel(o.status);
                  return (
                    <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 py-2.5 hover:bg-gray-800/40 -mx-2 px-2 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{o.order_number}</p>
                        <p className="text-xs text-gray-500 truncate">{o.user?.name ?? 'Sin cliente'} · {timeAgo(o.created_at)}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full text-white ${st?.color ?? 'bg-gray-600'}`}>{st?.label ?? o.status}</span>
                      <span className="text-sm font-medium text-white w-24 text-right">{formatCop(o.total)}</span>
                    </Link>
                  );
                })}
            </div>
          )}
        </Section>
      </div>

      <Section title="Últimos cambios en el admin" link={{ to: '/historial', label: 'Ver historial' }}>
        {audit === null ? <Loading /> : audit === 'error' ? <Failed what="el historial" /> : audit.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay cambios registrados.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {audit.map((a) => {
              const m = METHOD_LABELS[a.method];
              return (
                <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                  <History size={14} className="text-gray-600 shrink-0" />
                  <span className={`text-[11px] px-2 py-0.5 rounded ${m?.tone ?? 'bg-gray-700 text-gray-300'}`}>{m?.label ?? a.method}</span>
                  <span className="text-gray-200">{ENTITY_LABELS[a.entity ?? ''] ?? a.entity ?? a.path}</span>
                  {a.status_code >= 400 && <span className="text-[11px] text-red-400">falló</span>}
                  <span className="text-gray-500 text-xs truncate flex-1">{a.user_email ?? ''}</span>
                  <span className="text-gray-500 text-xs whitespace-nowrap inline-flex items-center gap-1">
                    <Clock size={12} /> {timeAgo(a.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
