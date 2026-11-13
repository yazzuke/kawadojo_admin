import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import toast from 'react-hot-toast';
import { AlertTriangle, Banknote, Landmark, Loader2, Package, RefreshCw, Scale, Wallet } from 'lucide-react';
import { financeService, money, shortDate, type FinanceOverview, type FundReport, type MovementFilters } from '../services/financeService';
import { apiError } from '../services/productMasterService';
import MovementsTab from '../components/caja/MovementsTab';
import BatchesTab from '../components/caja/BatchesTab';
import AccountsTab from '../components/caja/AccountsTab';
import { cardCls } from '../components/caja/ui';

type Tab = 'resumen' | 'movimientos' | 'lotes' | 'cuentas';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'lotes', label: 'Lotes y fondos' },
  { id: 'cuentas', label: 'Cuentas' },
];

const SALES_MAP_KEY = 'caja.salesAccounts';
const readSalesMap = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(SALES_MAP_KEY) || '{}'); } catch { return {}; }
};

// Caja: cuánta plata hay, dónde, de quién es y en qué se fue
export default function CajaPage() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('resumen');
  const [movementFilters, setMovementFilters] = useState<MovementFilters | undefined>();
  const [salesMap, setSalesMap] = useState<Record<string, string>>(readSalesMap);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await financeService.overview());
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cargar la caja'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Las ventas cobradas desde que arrancó la caja entran solas al abrir la página
  const syncSales = useCallback(async (quiet: boolean) => {
    try {
      setSyncing(true);
      const r = await financeService.syncSales(readSalesMap());
      if (!quiet || r.created || r.removed) toast.success(`Ventas: ${r.created} nuevas, ${r.updated} al día, ${r.removed} quitadas`);
      await load();
    } catch (err) {
      if (!quiet) toast.error(apiError(err, 'No se pudieron pasar las ventas'));
    } finally {
      setSyncing(false);
    }
  }, [load]);

  useEffect(() => { load().then(() => syncSales(true)); }, [load, syncSales]);

  const categories = useMemo(() => (data?.categories || []).map(c => c.category), [data]);

  const openMovements = (filters: MovementFilters) => {
    setMovementFilters(filters);
    setTab('movimientos');
  };

  const setSalesAccount = (method: string, id: string) => {
    const next = { ...salesMap, [method]: id };
    setSalesMap(next);
    try { localStorage.setItem(SALES_MAP_KEY, JSON.stringify(next)); } catch { /* sin localStorage */ }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={36} className="animate-spin text-kawa-green" /></div>;
  }
  if (!data) return <p className="text-center text-gray-400 py-12">No se pudo cargar la caja</p>;

  const t = data.totals;
  const cashAccounts = data.accounts.filter(a => !a.is_debt && a.active);
  const debtAccounts = data.accounts.filter(a => a.is_debt && a.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Caja</h1>
          <p className="text-gray-400 mt-1">
            Cuánta plata hay, dónde está, de quién es y en qué se fue
            {data.cutover && <span className="text-gray-500"> · saldos desde el {shortDate(data.cutover)}</span>}
          </p>
        </div>
        {data.needs_review > 0 && (
          <button onClick={() => openMovements({ needs_review: 'true' })} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-500/40 text-yellow-300 text-sm hover:bg-yellow-500/10">
            <AlertTriangle size={15} /> {data.needs_review} movimientos del Sheet por revisar
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-800 overflow-x-auto">
        {TABS.map(x => (
          <button
            key={x.id}
            onClick={() => { setTab(x.id); if (x.id === 'movimientos') setMovementFilters(undefined); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === x.id ? 'border-kawa-green text-kawa-green' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card icon={<Wallet size={18} />} label="Plata en cuentas" value={money(t.cash)} />
            <Card icon={<Landmark size={18} />} label="Lo que debes" value={money(t.debt)} tone="red" />
            <Card icon={<Package size={18} />} label={`Stock (${t.stock_units} piezas) a costo`} value={money(t.stock_cost)} hint={`a precio de venta ${money(t.stock_sale_value)}`} />
            <Card
              icon={<Scale size={18} />}
              label="Lo que tienes de verdad"
              value={money(t.net_worth)}
              tone={t.net_worth >= 0 ? 'green' : 'red'}
              hint={`plata + stock a costo − deudas · vendiendo todo: ${money(t.net_worth_at_sale_price)}`}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <AccountList title="Dónde está la plata" accounts={cashAccounts} total={t.cash} onOpen={id => openMovements({ account_id: id })} />
            <AccountList title="Lo que debes" accounts={debtAccounts} total={t.debt} onOpen={id => openMovements({ account_id: id })} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-3">Fondos</h2>
            <div className="grid lg:grid-cols-3 gap-4">
              {data.funds.map(f => <FundCard key={f.id} fund={f} onOpen={() => openMovements({ fund_id: f.id })} />)}
            </div>
          </div>

          <MonthlyChart data={data} />

          <div className="grid lg:grid-cols-2 gap-4">
            <div className={`${cardCls} p-4`}>
              <h3 className="text-white font-semibold mb-3">En qué se va la plata</h3>
              <div className="space-y-1.5">
                {data.categories.slice(0, 14).map(c => {
                  const max = data.categories[0]?.total || 1;
                  return (
                    <button key={c.category} onClick={() => openMovements({ category: c.category })} className="w-full text-left group">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-300 group-hover:text-white">{c.category}</span>
                        <span className="text-gray-400 font-mono">{money(c.total)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-kawa-green/70" style={{ width: `${(c.total / max) * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`${cardCls} p-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2"><Banknote size={16} /> Ventas que entran a la caja</h3>
                <button onClick={() => syncSales(false)} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 text-xs hover:text-white disabled:opacity-50">
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> Pasar ventas
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Cada orden cobrada desde que arrancó la caja entra sola como ingreso, en el fondo del lote de donde salió la pieza.
                Elige a qué cuenta cae cada forma de pago:
              </p>
              {[['transfer', 'Transferencia'], ['cash', 'Efectivo / contra entrega'], ['mercadopago', 'Mercado Pago']].map(([k, label]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-300">{label}</span>
                  <select value={salesMap[k] || ''} onChange={e => setSalesAccount(k, e.target.value)} className="bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none">
                    <option value="">Automático</option>
                    {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'movimientos' && (
        <MovementsTab
          key={JSON.stringify(movementFilters || {})}
          accounts={data.accounts}
          funds={data.funds}
          categories={categories}
          initialFilters={movementFilters}
          onChanged={load}
        />
      )}
      {tab === 'lotes' && <BatchesTab accounts={data.accounts} funds={data.funds} onChanged={load} />}
      {tab === 'cuentas' && <AccountsTab accounts={data.accounts} funds={data.funds} onChanged={load} />}
    </div>
  );
}

function Card({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: string; hint?: string; tone?: 'green' | 'red' }) {
  return (
    <div className={`${cardCls} p-4`}>
      <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider">{icon}{label}</div>
      <p className={`text-xl xl:text-2xl font-bold font-mono mt-2 break-all ${tone === 'green' ? 'text-kawa-green' : tone === 'red' ? 'text-red-300' : 'text-white'}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function AccountList({ title, accounts, total, onOpen }: { title: string; accounts: FinanceOverview['accounts']; total: number; onOpen: (id: string) => void }) {
  return (
    <div className={`${cardCls} p-4`}>
      <div className="flex justify-between items-baseline mb-2">
        <h3 className="text-white font-semibold">{title}</h3>
        <span className={`font-mono text-sm ${total < 0 ? 'text-red-300' : 'text-white'}`}>{money(total)}</span>
      </div>
      <div className="divide-y divide-gray-800">
        {accounts.map(a => (
          <button key={a.id} onClick={() => onOpen(a.id)} className="w-full flex justify-between py-2 text-sm hover:bg-white/[0.02] text-left">
            <span className="text-gray-300">{a.name}</span>
            <span className={`font-mono ${a.balance < 0 ? 'text-red-300' : 'text-white'}`}>{money(a.balance)}</span>
          </button>
        ))}
        {accounts.length === 0 && <p className="text-gray-500 text-sm py-2">Nada aquí</p>}
      </div>
    </div>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: number; tone?: 'green' | 'red' | 'muted'; strong?: boolean }) {
  if (!value && !strong) return null;
  return (
    <div className={`flex justify-between gap-3 text-sm ${strong ? 'pt-2 mt-1 border-t border-gray-800 font-semibold' : ''}`}>
      <span className={strong ? 'text-white' : 'text-gray-400'}>{label}</span>
      <span className={`font-mono whitespace-nowrap ${tone === 'green' ? 'text-kawa-green' : tone === 'red' ? 'text-red-300' : tone === 'muted' ? 'text-gray-500' : 'text-white'}`}>{money(value)}</span>
    </div>
  );
}

function FundCard({ fund: f, onOpen }: { fund: FundReport; onOpen: () => void }) {
  return (
    <div className={`${cardCls} p-4 space-y-1`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-white font-semibold">{f.name}</h3>
          <p className="text-[11px] text-gray-500">{f.lots.length} lotes · {f.units_sold}/{f.units} piezas vendidas</p>
        </div>
        <button onClick={onOpen} className="text-[11px] text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-0.5">Movimientos</button>
      </div>
      {f.received > 0 && <Row label="Préstamo recibido" value={f.received} />}
      {f.transfers_in > 0 && <Row label="Le pasaron de otro fondo" value={f.transfers_in} />}
      <Row label="Invertido en lotes" value={f.invested} />
      {f.loan_left !== null && <Row label="Sobró del préstamo" value={f.loan_left} tone="muted" />}
      <Row label="Vendido" value={f.sales} tone="green" />
      <Row label="Gastos del negocio" value={-f.expenses} tone="red" />
      <Row label="Pagos de lotes (del Sheet)" value={-f.lot_payments} tone="red" />
      <Row label="Personal" value={-f.personal} tone="red" />
      <Row label="Cuotas / pagos de deuda" value={-f.installments} tone="red" />
      <Row label="Intereses" value={-f.interest} tone="red" />
      <Row label="Pasado a otro fondo" value={-f.transfers_out} tone="red" />
      <Row label="Neto de las ventas" value={f.net_sales} tone={f.net_sales >= 0 ? 'green' : 'red'} strong />
      <Row label="Ganancia real" value={f.profit} tone={f.profit >= 0 ? 'green' : 'red'} />
      <Row label={`Stock que queda (${f.stock_units})`} value={f.stock_value} tone="muted" />
      {f.loan_balance !== null && <Row label={`Deuda actual ${f.loan_name}`} value={f.loan_balance} tone="red" />}
    </div>
  );
}

function MonthlyChart({ data }: { data: FinanceOverview }) {
  const months = data.monthly.filter(m => m.month >= '2026-01');
  const series: Array<[Exclude<keyof FinanceOverview['monthly'][number], 'month'>, string, string]> = [
    ['lotes', 'Lotes', '#60a5fa'],
    ['negocio', 'Negocio', '#a78bfa'],
    ['personal', 'Personal', '#f472b6'],
    ['intereses', 'Intereses', '#f87171'],
    ['deudas', 'Pago de deudas', '#fb923c'],
  ];
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => money(v) },
    legend: { textStyle: { color: '#9ca3af' }, top: 0 },
    grid: { left: 60, right: 16, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: months.map(m => m.month), axisLabel: { color: '#9ca3af' } },
    yAxis: { type: 'value', axisLabel: { color: '#9ca3af', formatter: (v: number) => `${Math.round(v / 1_000_000)}M` }, splitLine: { lineStyle: { color: '#262626' } } },
    series: [
      { name: 'Ventas', type: 'line', data: months.map(m => m.ingresos + m.otros), itemStyle: { color: '#22c55e' }, smooth: true },
      ...series.map(([k, name, color]) => ({ name, type: 'bar', stack: 'out', data: months.map(m => m[k]), itemStyle: { color } })),
    ],
  };
  return (
    <div className={`${cardCls} p-4`}>
      <h3 className="text-white font-semibold mb-1">Mes a mes</h3>
      <p className="text-[11px] text-gray-500 mb-2">Ventas contra lo que sale. Antes de la caja las fechas de los gastos son aproximadas (el Sheet no las tenía).</p>
      <ReactECharts option={option} style={{ height: 320 }} />
    </div>
  );
}
