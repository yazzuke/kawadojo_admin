import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { GitCompare, RotateCcw, Search, ShoppingCart, Trophy, Wand2, X } from 'lucide-react';
import { impexService } from '../services/Impex';
import type { ImpexQuote, SavedImpexPart } from '../types/impex';
import {
  computeShipment, formatCop, formatUsd, packageInfo, TAX_FREE_LIMIT_USD,
  type Carrier, type QuoteLine, type QuoteRates,
} from '../Utils/impexQuoteCalc';
import {
  buildOptions, demandCap, estimateShippingJpy, historyByPart, unitContribution,
  type Candidate, type SalesStat,
} from '../Utils/orderBuilder';

interface Props {
  parts: SavedImpexPart[];
  quotes: ImpexQuote[];
  rates: QuoteRates;
  usdJpyRate: number;
  carrier: Carrier;
  onSendToCart: (lines: QuoteLine[]) => void;
  onSendToComparator: (lines: QuoteLine[], name: string) => void;
}

type Mode = 'auto' | 'fixed' | 'off';
interface PartSetting { mode: Mode; qty: number | null }

// Ajustes generales del armador (por navegador). El modo de cada pieza se guarda en la DB.
interface Prefs {
  months: number;
  minOrders: number;
  includeNoSales: boolean;
  // Versión anterior: modos guardados en el navegador, se migran a la DB una vez
  modes?: Record<string, Mode>;
  fixedQty?: Record<string, number>;
  caps?: Record<string, number>;
}

const PREFS_KEY = 'kawadojo.impex.builderPrefs';
const DEFAULT_PREFS: Prefs = { months: 2, minOrders: 2, includeNoSales: false };

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface Row {
  part: SavedImpexPart;
  id: string;
  mode: Mode;
  stat?: SalesStat;
  timesOrdered: number;
  contribution: number;
  min: number;
  max: number;
  reason: string;
  manualCap: boolean;
}

export default function OrderBuilder({ parts, quotes, rates, usdJpyRate, carrier, onSendToCart, onSendToComparator }: Props) {
  const [limitUsd, setLimitUsd] = useState('199.50');
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [stats, setStats] = useState<Map<string, SalesStat>>(new Map());
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<'active' | 'all' | 'off'>('active');
  const [overrides, setOverrides] = useState<Record<string, PartSetting>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* sin storage */ }
  }, [prefs]);

  const settingOf = (p: SavedImpexPart): PartSetting =>
    overrides[String(p.id)] ?? { mode: p.builder_mode || 'auto', qty: p.builder_qty ?? null };

  // Guarda en la DB (con un pequeño retraso para no mandar una petición por cada tecla)
  const saveSetting = (id: string, setting: PartSetting) => {
    setOverrides((prev) => ({ ...prev, [id]: setting }));
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      impexService.updateBuilderSettings(id, setting.mode, setting.qty)
        .catch(() => toast.error('No se pudo guardar el modo de la pieza'));
    }, 600);
  };

  // Una sola vez: pasa a la DB los modos que estaban guardados en este navegador
  useEffect(() => {
    const legacy = prefs.modes || prefs.fixedQty || prefs.caps;
    if (!legacy || !parts.length) return;
    const ids = new Set([...Object.keys(prefs.modes || {}), ...Object.keys(prefs.caps || {})]);
    const pending = parts.filter((p) => ids.has(String(p.id)) && (p.builder_mode || 'auto') === 'auto' && p.builder_qty == null);
    Promise.all(pending.map((p) => {
      const id = String(p.id);
      const mode = prefs.modes?.[id] || 'auto';
      const qty = mode === 'fixed' ? prefs.fixedQty?.[id] ?? 1 : mode === 'auto' ? prefs.caps?.[id] ?? null : null;
      setOverrides((prev) => ({ ...prev, [id]: { mode, qty } }));
      return impexService.updateBuilderSettings(id, mode, qty);
    }))
      .then(() => setPrefs(({ months, minOrders, includeNoSales }) => ({ months, minOrders: minOrders ?? 2, includeNoSales })))
      .catch(() => { /* se reintenta la próxima vez */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts]);

  useEffect(() => {
    impexService.getSalesStats()
      .then((res) => { if (res.success) setStats(new Map(res.data.map((s) => [s.impex_part_id, s]))); })
      .catch(() => { /* sin ventas: el armador usa solo el historial */ });
  }, []);

  const history = useMemo(() => historyByPart(quotes), [quotes]);

  // Cuántas unidades puede llevar cada pieza y por qué
  const rows: Row[] = useMemo(() => parts
    .filter((p) => (p.kawadojo_price || 0) > 0 && (p.price_usd || 0) > 0)
    .map((p) => {
      const id = String(p.id);
      const { mode, qty } = settingOf(p);
      const stat = stats.get(id);
      const h = history.get(id);
      const contribution = unitContribution(p, rates, usdJpyRate);
      let min = 0;
      let max = 0;
      let reason = '';
      const manualCap = mode === 'auto' && qty !== null;
      const orders = stat?.orders_180d || 0;
      const ordersText = `${orders} ${orders === 1 ? 'pedido' : 'pedidos'} en 6 meses`
        + (stat && stat.sold_180d > orders ? ` (${stat.sold_180d} uds)` : '');

      if (mode === 'off') {
        reason = 'Bajo encargo: no entra al armador';
      } else if (mode === 'fixed') {
        min = max = qty ?? 1;
        reason = `Fijo: siempre ${min}`;
      } else if (manualCap) {
        max = qty!;
        reason = `Máximo manual: ${max}`;
      } else {
        const d = demandCap(stat, prefs.months, prefs.minOrders);
        if (d) {
          max = d.cap;
          reason = `${ordersText} → ${d.demand} para ${prefs.months} ${prefs.months === 1 ? 'mes' : 'meses'}`
            + (stat!.stock ? ` − ${stat!.stock} en stock` : '');
        } else if (orders > 0) {
          reason = `Solo ${ordersText}: parece encargo`;
        } else if (prefs.includeNoSales && h) {
          max = 1;
          reason = 'Sin ventas registradas: máximo 1';
        } else {
          reason = stat ? 'Sin ventas en 6 meses' : 'Sin ventas registradas en la tienda';
        }
      }
      return { part: p, id, mode, stat, timesOrdered: h?.timesOrdered || 0, contribution, min, max, reason, manualCap };
    })
    .filter((r) => r.stat || r.timesOrdered > 0 || r.mode !== 'auto')
    .sort((a, b) => (b.max > 0 ? 1 : 0) - (a.max > 0 ? 1 : 0) || (b.stat?.sold_180d || 0) - (a.stat?.sold_180d || 0) || b.contribution - a.contribution),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [parts, prefs, stats, history, rates, usdJpyRate, overrides]);

  const limit = Math.min(Number(limitUsd) || 0, 1000);
  const candidates: Candidate[] = rows
    .filter((r) => r.max > 0)
    .map((r) => ({ part: r.part, minQty: r.min, maxQty: r.max, unitContribution: r.contribution }));
  const options = useMemo(() => buildOptions(candidates, limit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(candidates.map((c) => [c.part.id, c.minQty, c.maxQty, Math.round(c.unitContribution)])), limit]);

  const results = options.map((lines) => {
    const { weightKg } = packageInfo(lines);
    const shippingUsd = usdJpyRate > 0 ? estimateShippingJpy(weightKg) / usdJpyRate : 0;
    return { lines, weightKg, shippingUsd, calc: computeShipment(lines, shippingUsd, carrier, rates) };
  });

  const setMode = (id: string, mode: Mode) =>
    saveSetting(id, { mode, qty: mode === 'fixed' ? 1 : null });
  const setFixed = (id: string, qty: number) => saveSetting(id, { mode: 'fixed', qty });
  const setCap = (id: string, qty: number | null) => saveSetting(id, { mode: 'auto', qty });

  const t = term.trim().toLowerCase();
  const visibleRows = rows
    .filter((r) => filter === 'all' || (filter === 'off' ? r.mode === 'off' : r.max > 0))
    .filter((r) => !t || [r.part.name_es, r.part.name_en, r.part.part_no].some((v) => (v || '').toLowerCase().includes(t)));
  const offCount = rows.filter((r) => r.mode === 'off').length;
  const activeCount = rows.filter((r) => r.max > 0).length;

  const modeButton = (r: Row, mode: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(r.id, mode)}
      className={`px-2 py-1 text-[11px] font-semibold transition-colors ${
        r.mode === mode
          ? mode === 'off' ? 'bg-red-500/80 text-white' : mode === 'fixed' ? 'bg-blue-500 text-white' : 'bg-kawa-green text-black'
          : 'bg-[#111] text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Wand2 size={20} className="text-kawa-green" /> Armador de pedidos</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">
            Escoge lo que más deja sin pasar el límite, pero solo trae lo que de verdad rota: cuántos clientes distintos lo pidieron en
            los últimos 6 meses, menos lo que ya tienes en stock. Marca como <span className="text-red-400">Encargo</span> lo que solo pides bajo pedido.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs text-gray-400 space-y-1">
            <span className="block">Límite (US$)</span>
            <input
              type="number"
              value={limitUsd}
              onChange={(e) => setLimitUsd(e.target.value)}
              className="w-24 bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1.5 text-right text-white text-sm focus:border-kawa-green outline-none"
            />
          </label>
          <label className="text-xs text-gray-400 space-y-1">
            <span className="block">Cubrir ventas de</span>
            <select
              value={prefs.months}
              onChange={(e) => setPrefs((p) => ({ ...p, months: Number(e.target.value) }))}
              className="bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1.5 text-white text-sm"
            >
              {[1, 2, 3, 4, 6].map((m) => <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400 space-y-1" title="Una pieza que solo compró un cliente suele ser un encargo">
            <span className="block">Rota si la pidieron</span>
            <select
              value={prefs.minOrders}
              onChange={(e) => setPrefs((p) => ({ ...p, minOrders: Number(e.target.value) }))}
              className="bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1.5 text-white text-sm"
            >
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ {n === 1 ? 'cliente' : 'clientes'}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer pb-1.5">
            <input
              type="checkbox"
              checked={prefs.includeNoSales}
              onChange={(e) => setPrefs((p) => ({ ...p, includeNoSales: e.target.checked }))}
              className="w-4 h-4 accent-[#62BE1B]"
            />
            Incluir piezas pedidas sin ventas registradas (máx. 1)
          </label>
        </div>
      </div>

      {limit > TAX_FREE_LIMIT_USD && (
        <p className="text-xs text-red-400">Ojo: con un límite sobre US$ {TAX_FREE_LIMIT_USD} el pedido paga arancel.</p>
      )}

      {/* Opciones */}
      {results.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded-xl p-10 text-center text-gray-400 text-sm">
          Con estos filtros no hay nada que traer: o ya tienes stock de lo que se vende, o no hay ventas registradas.
          Sube los meses a cubrir, marca piezas como <span className="text-blue-400">Fijo</span> o incluye las que no tienen ventas.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {results.map((r, i) => (
            <div key={i} className={`bg-[#161616] border rounded-xl ${i === 0 ? 'border-kawa-green/60' : 'border-gray-800'}`}>
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h4 className="text-white font-bold flex items-center gap-2">
                  {i === 0 && <Trophy size={16} className="text-kawa-green" />}
                  {i === 0 ? 'La que más deja' : `Alternativa ${i}`}
                </h4>
                <span className="text-xs text-gray-400">{r.calc.units} uds · {r.weightKg.toFixed(2)} kg</span>
              </div>

              <ul className="px-4 py-2 divide-y divide-gray-800/70">
                {r.calc.lines.map((l) => {
                  const row = rows.find((x) => x.part.id === l.part.id);
                  return (
                    <li key={l.part.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0">{l.quantity}×</span>
                      <span className="flex-1 min-w-0 truncate text-gray-200" title={row?.reason}>
                        {l.part.name_es || l.part.name_en || l.part.part_no}
                        {row?.mode === 'fixed' && <span className="ml-1 text-[10px] text-blue-400">fijo</span>}
                      </span>
                      <span className={`font-mono text-xs shrink-0 ${l.unitProfitCop >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>{formatCop(l.unitProfitCop)} c/u</span>
                    </li>
                  );
                })}
              </ul>

              <div className="px-4 pb-1">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className={r.calc.requiresTaxes ? 'text-red-400' : 'text-gray-500'}>
                    {r.calc.requiresTaxes ? 'Paga arancel' : `Sin arancel · quedan ${formatUsd(Math.max(0, TAX_FREE_LIMIT_USD - r.calc.subtotalUsd))}`}
                  </span>
                  <span className="font-mono text-gray-400">{formatUsd(r.calc.subtotalUsd)} / {TAX_FREE_LIMIT_USD}</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${r.calc.requiresTaxes ? 'bg-red-500' : 'bg-kawa-green'}`} style={{ width: `${Math.min(100, (r.calc.subtotalUsd / TAX_FREE_LIMIT_USD) * 100)}%` }} />
                </div>
              </div>

              <div className="p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Envío estimado (EMS)</span>
                  <span className="font-mono text-gray-200">{formatUsd(r.shippingUsd)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Costo total ({carrier})</span>
                  <span className="font-mono text-gray-200">{formatCop(r.calc.totalCop)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Venta estimada</span>
                  <span className="font-mono text-gray-200">{formatCop(r.calc.ventasCop)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1">
                  <span className="text-white">Utilidad</span>
                  <span className={r.calc.utilidadCop >= 0 ? 'text-kawa-green' : 'text-red-400'}>
                    {formatCop(r.calc.utilidadCop)} <span className="text-xs font-normal">({r.calc.margenPct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <button
                    onClick={() => onSendToCart(r.lines)}
                    className="flex items-center justify-center gap-1.5 bg-kawa-green text-black font-bold text-sm py-2 rounded-lg hover:bg-kawa-green-light"
                  >
                    <ShoppingCart size={15} /> Usar
                  </button>
                  <button
                    onClick={() => onSendToComparator(r.lines, i === 0 ? 'Armador: la que más deja' : `Armador: alternativa ${i}`)}
                    className="flex items-center justify-center gap-1.5 bg-[#1e1e1e] border border-gray-700 text-white text-sm py-2 rounded-lg hover:border-kawa-green hover:text-kawa-green"
                  >
                    <GitCompare size={15} /> Comparar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Piezas candidatas */}
      <div className="bg-[#161616] border border-gray-800 rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-gray-800">
          <div className="mr-auto">
            <h4 className="text-white font-bold">Piezas</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="text-kawa-green">Auto</span>: trae según ventas y stock ·{' '}
              <span className="text-blue-400">Fijo</span>: siempre esa cantidad ·{' '}
              <span className="text-red-400">Encargo</span>: nunca entra. Se guarda en la DB.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold">
            {([['active', `En juego (${activeCount})`], ['all', `Todas (${rows.length})`], ['off', `Encargo (${offCount})`]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 ${filter === key ? 'bg-kawa-green text-black' : 'bg-[#111] text-gray-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative lg:w-60">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar pieza..."
              className="w-full bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg pl-8 pr-7 py-1.5 focus:border-kawa-green outline-none"
            />
            {term && (
              <button onClick={() => setTerm('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-white"><X size={14} /></button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                <th className="p-3 font-semibold">Pieza</th>
                <th className="p-3 font-semibold text-right" title="Pedidos distintos de clientes en los últimos 6 meses">Pedidos 6m</th>
                <th className="p-3 font-semibold text-right">Stock</th>
                <th className="p-3 font-semibold text-right">US$ c/u</th>
                <th className="p-3 font-semibold text-right">Deja c/u</th>
                <th className="p-3 font-semibold text-center">Modo</th>
                <th className="p-3 font-semibold text-center">Cant.</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className={`border-t border-gray-800 ${r.mode === 'off' || r.max === 0 ? 'opacity-50' : ''}`}>
                  <td className="p-3 min-w-[240px]">
                    <p className="text-white leading-tight">{r.part.name_es || r.part.name_en || r.part.part_no}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      <span className="font-mono">{r.part.part_no}</span> · {r.reason}
                      {!r.part.weight && <span className="text-yellow-500"> · sin peso</span>}
                    </p>
                  </td>
                  <td className="p-3 text-right text-gray-300">
                    {r.stat
                      ? <>{r.stat.orders_180d}{r.stat.sold_180d > r.stat.orders_180d && <span className="text-gray-500 text-xs"> ({r.stat.sold_180d} uds)</span>}</>
                      : <span className="text-gray-600" title="No hay producto en la tienda con este código OEM">—</span>}
                  </td>
                  <td className="p-3 text-right text-gray-300">{r.stat ? r.stat.stock : <span className="text-gray-600">—</span>}</td>
                  <td className="p-3 text-right font-mono text-blue-400">{(r.part.price_usd || 0).toFixed(2)}</td>
                  <td className={`p-3 text-right font-mono font-bold ${r.contribution > 0 ? 'text-kawa-green' : 'text-red-400'}`}>{formatCop(r.contribution)}</td>
                  <td className="p-3">
                    <div className="flex justify-center">
                      <div className="inline-flex rounded border border-gray-700 overflow-hidden">
                        {modeButton(r, 'auto', 'Auto')}
                        {modeButton(r, 'fixed', 'Fijo')}
                        {modeButton(r, 'off', 'Encargo')}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      {r.mode === 'off' ? (
                        <span className="text-gray-600">—</span>
                      ) : r.mode === 'fixed' ? (
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={r.min}
                          onChange={(e) => setFixed(r.id, Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                          className="w-14 bg-[#111] border border-blue-500/60 rounded px-1 py-1 text-center text-white"
                        />
                      ) : (
                        <>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={r.max}
                            title="Máximo de unidades (cámbialo para fijarlo a mano)"
                            onChange={(e) => setCap(r.id, Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                            className={`w-14 bg-[#111] border rounded px-1 py-1 text-center text-white ${r.manualCap ? 'border-yellow-500/60' : 'border-gray-700'}`}
                          />
                          {r.manualCap && (
                            <button onClick={() => setCap(r.id, null)} title="Volver al cálculo automático" className="text-gray-500 hover:text-white">
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500 text-sm">No hay piezas en esta vista.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
