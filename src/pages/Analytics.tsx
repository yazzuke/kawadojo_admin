import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import toast from 'react-hot-toast';
import { BarChart3, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { apiError } from '../services/productMasterService';
import {
  SOURCE_LABELS, analyticsService, bogotaDay, formatCop, percent,
  type AnalyticsSummary, type GroupRow,
} from '../services/analyticsService';

const control = 'bg-kawa-gray border border-gray-800 text-white text-sm rounded-xl px-3 py-2.5 focus:border-kawa-green outline-none';
const card = 'bg-kawa-gray border border-gray-800 rounded-xl';
const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '3 meses' },
];

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function GroupTable({ title, rows, label }: { title: string; rows: GroupRow[]; label?: (name: string) => string }) {
  return (
    <div className={card}>
      <p className="px-4 py-3 border-b border-gray-800 text-sm font-semibold text-white">{title}</p>
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500">
          <tr>
            <th className="text-left font-normal px-4 py-2" />
            <th className="text-right font-normal px-2 py-2">Visitas</th>
            <th className="text-right font-normal px-2 py-2" title="Visitas que le dieron clic a WhatsApp">WhatsApp</th>
            <th className="text-right font-normal px-4 py-2" title="Visitas que hicieron un pedido en la web">Pedidos</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">Sin datos todavía</td></tr>
          )}
          {rows.slice(0, 8).map((r) => (
            <tr key={r.name} className="border-t border-gray-800/60">
              <td className="px-4 py-2 text-gray-200">{label ? label(r.name) : r.name}</td>
              <td className="px-2 py-2 text-right text-white">{r.sessions}</td>
              <td className="px-2 py-2 text-right text-gray-300">{r.whatsapp} <span className="text-gray-500 text-xs">{percent(r.whatsapp, r.sessions)}</span></td>
              <td className="px-4 py-2 text-right text-gray-300">{r.ordered}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Analítica: lo que hace la gente en kawadojo.com cruzado con las ventas reales
export default function AnalyticsPage() {
  const [from, setFrom] = useState(bogotaDay(29));
  const [to, setTo] = useState(bogotaDay(0));
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await analyticsService.summary(from, to));
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cargar la analítica'));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const chart = useMemo(() => {
    if (!data) return null;
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['Visitas', 'Clics a WhatsApp', 'Ventas'], textStyle: { color: '#ccc' } },
      grid: { left: 40, right: 40, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: data.daily.map((d) => d.date.slice(5)), axisLabel: { color: '#888' } },
      yAxis: [
        { type: 'value', minInterval: 1, axisLabel: { color: '#888' }, splitLine: { lineStyle: { color: '#222' } } },
        { type: 'value', minInterval: 1, axisLabel: { color: '#888' }, splitLine: { show: false } },
      ],
      series: [
        { name: 'Visitas', type: 'line', smooth: true, data: data.daily.map((d) => d.sessions), itemStyle: { color: '#62BE1B' }, areaStyle: { color: 'rgba(98,190,27,0.12)' } },
        { name: 'Clics a WhatsApp', type: 'line', smooth: true, data: data.daily.map((d) => d.whatsapp_clicks), itemStyle: { color: '#25D366' } },
        { name: 'Ventas', type: 'bar', yAxisIndex: 1, data: data.daily.map((d) => d.orders), itemStyle: { color: '#3b82f6' }, barMaxWidth: 14 },
      ],
    };
  }, [data]);

  const t = data?.totals;
  const setRange = (days: number) => { setFrom(bogotaDay(days - 1)); setTo(bogotaDay(0)); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 size={22} className="text-kawa-green" /> Analítica de la tienda</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Qué hace la gente en kawadojo.com (visitas, piezas que miran, clics a WhatsApp, carrito) junto a las ventas
            reales de Órdenes. Las visitas no guardan datos personales.
          </p>
        </div>
        <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-2 border border-gray-700 rounded-lg">
          Cloudflare <ExternalLink size={14} />
        </a>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-2 border border-gray-700 rounded-lg">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recargar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setRange(r.days)}
            className={`text-sm px-3 py-2 rounded-xl border ${from === bogotaDay(r.days - 1) && to === bogotaDay(0) ? 'border-kawa-green text-kawa-green' : 'border-gray-800 text-gray-300 hover:text-white'}`}
          >
            {r.label}
          </button>
        ))}
        <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} title="Desde" className={control} />
        <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} title="Hasta" className={control} />
      </div>

      {loading && !data && (
        <div className="flex items-center gap-2 text-gray-400 py-10 justify-center"><Loader2 className="animate-spin" size={18} /> Cargando...</div>
      )}

      {t && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Stat label="Visitas" value={t.sessions} hint={`${t.page_view} páginas vistas`} />
            <Stat label="Vieron una pieza" value={t.product_view} hint="fichas abiertas" />
            <Stat label="Clics a WhatsApp" value={t.whatsapp_click} hint={`${percent(t.sessions_with_whatsapp, t.sessions)} de las visitas`} />
            <Stat label="Agregaron al carrito" value={t.add_to_cart} hint={`${t.checkout_start} llegaron al pago`} />
            <Stat label="Ventas (Órdenes)" value={t.orders} hint={`${t.order_placed} pedidos hechos en la web`} />
            <Stat label="Vendido" value={formatCop(t.revenue)} hint={`Ganancia ${formatCop(t.profit)}`} />
          </div>

          <div className={`${card} p-4`}>
            <p className="text-sm font-semibold text-white mb-2">Día a día</p>
            {chart && <ReactECharts option={chart} style={{ height: 300, width: '100%' }} theme="dark" opts={{ renderer: 'svg' }} />}
          </div>

          <div className={card}>
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-sm font-semibold text-white">Piezas: lo que miran vs. lo que se vende</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Muchas vistas y pocas ventas: revisa precio, fotos o descripción. Las ventas salen de Órdenes (incluye las que
                registras a mano por WhatsApp).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="text-left font-normal px-4 py-2">Pieza</th>
                    <th className="text-right font-normal px-2 py-2">Vistas</th>
                    <th className="text-right font-normal px-2 py-2">WhatsApp</th>
                    <th className="text-right font-normal px-2 py-2">Carrito</th>
                    <th className="text-right font-normal px-2 py-2">Vendidas</th>
                    <th className="text-right font-normal px-4 py-2">Vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Sin datos todavía en estas fechas</td></tr>
                  )}
                  {data.products.map((p) => (
                    <tr key={p.id} className="border-t border-gray-800/60">
                      <td className="px-4 py-2">
                        <span className="text-gray-100">{p.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {p.price ? formatCop(p.price) : ''}{p.in_stock ? '' : ' · agotada'}{p.condition === 'usado' ? ' · usada' : ''}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-white">{p.views}</td>
                      <td className="px-2 py-2 text-right text-gray-300">{p.whatsapp_clicks} <span className="text-xs text-gray-500">{p.views ? percent(p.whatsapp_clicks, p.views) : ''}</span></td>
                      <td className="px-2 py-2 text-right text-gray-300">{p.add_to_cart}</td>
                      <td className={`px-2 py-2 text-right ${p.sold ? 'text-kawa-green font-semibold' : 'text-gray-500'}`}>{p.sold}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{p.revenue ? formatCop(p.revenue) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <GroupTable title="De dónde llegan" rows={data.sources} label={(n) => SOURCE_LABELS[n] ?? n} />
            <GroupTable title="Aparato" rows={data.devices} label={(n) => (n === 'mobile' ? 'Celular' : n === 'desktop' ? 'Computador' : 'Sin dato')} />
            <GroupTable title="País" rows={data.countries} label={(n) => (n === '??' ? 'Sin dato' : n)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className={card}>
              <p className="px-4 py-3 border-b border-gray-800 text-sm font-semibold text-white">Lo que buscan</p>
              <ul className="text-sm">
                {data.searches.length === 0 && <li className="px-4 py-4 text-center text-gray-500">Nadie ha buscado todavía</li>}
                {data.searches.map((s) => (
                  <li key={s.query} className="flex justify-between px-4 py-2 border-t border-gray-800/60 first:border-t-0">
                    <span className="text-gray-200">{s.query}</span><span className="text-gray-400">{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={card}>
              <p className="px-4 py-3 border-b border-gray-800 text-sm font-semibold text-white">Páginas más vistas</p>
              <ul className="text-sm">
                {data.pages.length === 0 && <li className="px-4 py-4 text-center text-gray-500">Sin datos todavía</li>}
                {data.pages.map((p) => (
                  <li key={p.path} className="flex justify-between gap-3 px-4 py-2 border-t border-gray-800/60 first:border-t-0">
                    <a href={`https://kawadojo.com${p.path}`} target="_blank" rel="noopener noreferrer" className="text-gray-200 hover:text-kawa-green truncate">{p.path}</a>
                    <span className="text-gray-400">{p.views}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
