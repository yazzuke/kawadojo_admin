import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Plus, Trash2, Trophy, Save, Search } from 'lucide-react';
import { impexService } from '../services/Impex';
import type { SavedImpexPart } from '../types/impex';
import {
  buildQuotePayload, computeShipment, formatCop, formatUsd, newDraftId, TAX_FREE_LIMIT_USD,
  type Carrier, type QuoteLine, type QuoteRates, type ShippingMode,
} from '../Utils/impexQuoteCalc';
import ImpexShippingPicker, { ShippingModeToggle } from './ImpexShippingPicker';

export interface DraftItem { partId: string; quantity: number }
export interface QuoteDraft {
  id: string;
  name: string;
  carrier: Carrier;
  shippingUsd: string;
  shippingMode?: ShippingMode;
  shippingMethod?: string;
  items: DraftItem[];
}


interface Props {
  drafts: QuoteDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<QuoteDraft[]>>;
  parts: SavedImpexPart[];
  rates: QuoteRates;
  usdJpyRate: number;
  defaultCarrier: Carrier;
  onSaved: () => void;
}

// Buscador para agregar cualquier pieza guardada a un borrador
function PartPicker({ parts, onPick }: { parts: SavedImpexPart[]; onPick: (part: SavedImpexPart) => void }) {
  const [term, setTerm] = useState('');
  const matches = term.trim()
    ? parts.filter(p => {
        const t = term.toLowerCase();
        return [p.name_es, p.name_en, p.name_ja, p.part_no].some(v => (v || '').toLowerCase().includes(t));
      }).slice(0, 6)
    : [];
  return (
    <div className="relative">
      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder="Agregar pieza..."
        className="w-full bg-[#111] border border-dashed border-gray-700 rounded pl-7 pr-2 py-1.5 text-xs text-white focus:border-kawa-green outline-none"
      />
      {matches.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-[#111] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {matches.map(p => (
            <button
              key={p.id}
              onClick={() => { onPick(p); setTerm(''); }}
              className="w-full flex justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-[#2a2a2a]"
            >
              <span className="truncate text-gray-200">{p.name_es || p.name_en || p.part_no}</span>
              <span className="shrink-0 font-mono text-blue-400">{formatUsd(p.price_usd || 0)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuoteComparator({ drafts, setDrafts, parts, rates, usdJpyRate, defaultCarrier, onSaved }: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const partsById = useMemo(() => new Map(parts.map(p => [String(p.id), p])), [parts]);

  const toLines = (d: QuoteDraft): QuoteLine[] =>
    d.items
      .map(i => ({ part: partsById.get(i.partId)!, quantity: i.quantity }))
      .filter(l => l.part && l.quantity > 0);

  const results = drafts.map(d => computeShipment(toLines(d), Number(d.shippingUsd) || 0, d.carrier, rates));
  const withItems = results.map((r, i) => ({ r, i })).filter(({ r }) => r.units > 0);
  const bestProfit = withItems.length ? withItems.reduce((a, b) => (b.r.utilidadCop > a.r.utilidadCop ? b : a)).i : -1;
  const bestMargin = withItems.length ? withItems.reduce((a, b) => (b.r.margenPct > a.r.margenPct ? b : a)).i : -1;

  const combined = results.reduce(
    (acc, r) => ({
      units: acc.units + r.units,
      subtotalUsd: acc.subtotalUsd + r.subtotalUsd,
      envioCop: acc.envioCop + r.envioCop,
      taxesAndFeesCop: acc.taxesAndFeesCop + r.taxesAndFeesCop,
      totalCop: acc.totalCop + r.totalCop,
      ventasCop: acc.ventasCop + r.ventasCop,
    }),
    { units: 0, subtotalUsd: 0, envioCop: 0, taxesAndFeesCop: 0, totalCop: 0, ventasCop: 0 }
  );
  const combinedProfit = combined.ventasCop - combined.totalCop;

  // ---------- Acciones ----------
  const update = (id: string, fn: (d: QuoteDraft) => QuoteDraft) =>
    setDrafts(prev => prev.map(d => (d.id === id ? fn(d) : d)));

  const setQty = (id: string, partId: string, quantity: number) =>
    update(id, d => ({
      ...d,
      items: quantity <= 0
        ? d.items.filter(i => i.partId !== partId)
        : d.items.map(i => (i.partId === partId ? { ...i, quantity } : i)),
    }));

  const addPart = (id: string, partId: string) =>
    update(id, d => ({
      ...d,
      items: d.items.some(i => i.partId === partId)
        ? d.items.map(i => (i.partId === partId ? { ...i, quantity: i.quantity + 1 } : i))
        : [...d.items, { partId, quantity: 1 }],
    }));

  // Pasa una unidad de una cotización a otra
  const moveUnit = (fromId: string, toId: string, partId: string) =>
    setDrafts(prev => prev.map(d => {
      if (d.id === fromId) {
        return { ...d, items: d.items.map(i => (i.partId === partId ? { ...i, quantity: i.quantity - 1 } : i)).filter(i => i.quantity > 0) };
      }
      if (d.id === toId) {
        return {
          ...d,
          items: d.items.some(i => i.partId === partId)
            ? d.items.map(i => (i.partId === partId ? { ...i, quantity: i.quantity + 1 } : i))
            : [...d.items, { partId, quantity: 1 }],
        };
      }
      return d;
    }));

  const addEmpty = () =>
    setDrafts(prev => [...prev, { id: newDraftId(), name: `Cotización ${prev.length + 1}`, carrier: defaultCarrier, shippingUsd: '', items: [] }]);

  const duplicate = (d: QuoteDraft) =>
    setDrafts(prev => [...prev, { ...d, id: newDraftId(), name: `${d.name} (copia)`, items: d.items.map(i => ({ ...i })) }]);

  const save = async (d: QuoteDraft, index: number) => {
    try {
      setSavingId(d.id);
      const res = await impexService.createQuote(
        buildQuotePayload(toLines(d), Number(d.shippingUsd) || 0, d.carrier, rates, usdJpyRate, results[index])
      );
      if (res.success) {
        toast.success(`"${d.name}" guardada en el historial`);
        onSaved();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error guardando cotización');
    } finally {
      setSavingId(null);
    }
  };

  const partName = (id: string) => {
    const p = partsById.get(id);
    return p ? p.name_es || p.name_en || p.name_ja || p.part_no : 'Pieza no encontrada';
  };

  // ---------- UI ----------
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Comparar cotizaciones</h3>
          <p className="text-sm text-gray-400 mt-1">
            Arma varias cotizaciones con las piezas que quieras, pasa piezas de una a otra y mira cuál combinación deja más.
            Cada una es un pedido aparte: paga su propio manejo y arancel si pasa US$ {TAX_FREE_LIMIT_USD}.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={addEmpty} className="flex items-center gap-2 bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-kawa-green-light text-sm">
            <Plus size={16} /> Nueva cotización
          </button>
          {drafts.length > 0 && (
            <button onClick={() => confirm('¿Borrar todas las cotizaciones del comparador?') && setDrafts([])} className="flex items-center gap-2 text-red-400 hover:text-red-300 px-3 py-2 text-sm">
              <Trash2 size={16} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded-xl p-10 text-center text-gray-400">
          <p className="font-medium text-white mb-1">No hay cotizaciones para comparar</p>
          <p className="text-sm">
            En <span className="text-white">Nueva Cotización</span> arma un pedido y dale <span className="text-kawa-green">Al comparador</span>, o crea una aquí con
            <span className="text-kawa-green"> Nueva cotización</span> y busca las piezas.
          </p>
        </div>
      ) : (
        <>
          {/* Tabla resumen */}
          <div className="bg-[#161616] border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="p-3 font-semibold">Cotización</th>
                  <th className="p-3 font-semibold text-right">Uds</th>
                  <th className="p-3 font-semibold text-right">Piezas</th>
                  <th className="p-3 font-semibold text-right">Impuestos + manejo</th>
                  <th className="p-3 font-semibold text-right">Costo total</th>
                  <th className="p-3 font-semibold text-right">Venta est.</th>
                  <th className="p-3 font-semibold text-right">Utilidad</th>
                  <th className="p-3 font-semibold text-right">Margen</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, i) => {
                  const r = results[i];
                  return (
                    <tr key={d.id} className={`border-t border-gray-800 ${i === bestProfit ? 'bg-kawa-green/10' : ''}`}>
                      <td className="p-3 text-white font-medium whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          {i === bestProfit && <Trophy size={14} className="text-kawa-green" />}
                          {d.name}
                          <span className="text-xs text-gray-500">{d.carrier}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-300">{r.units}</td>
                      <td className={`p-3 text-right font-mono ${r.requiresTaxes ? 'text-red-400' : 'text-gray-300'}`}>
                        {formatUsd(r.subtotalUsd)}
                      </td>
                      <td className="p-3 text-right font-mono text-orange-300">{formatCop(r.taxesAndFeesCop)}</td>
                      <td className="p-3 text-right font-mono text-white">{formatCop(r.totalCop)}</td>
                      <td className="p-3 text-right font-mono text-gray-300">{formatCop(r.ventasCop)}</td>
                      <td className={`p-3 text-right font-mono font-bold ${r.utilidadCop >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>{formatCop(r.utilidadCop)}</td>
                      <td className={`p-3 text-right font-bold ${r.margenPct >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>
                        {r.margenPct.toFixed(1)}%
                        {i === bestMargin && withItems.length > 1 && <span className="block text-[10px] font-normal text-gray-400">mejor margen</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {drafts.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-700 bg-[#1a1a1a]">
                    <td className="p-3 text-gray-300 font-semibold">Si pides todas</td>
                    <td className="p-3 text-right text-gray-300">{combined.units}</td>
                    <td className="p-3 text-right font-mono text-gray-300">{formatUsd(combined.subtotalUsd)}</td>
                    <td className="p-3 text-right font-mono text-orange-300">{formatCop(combined.taxesAndFeesCop)}</td>
                    <td className="p-3 text-right font-mono text-white">{formatCop(combined.totalCop)}</td>
                    <td className="p-3 text-right font-mono text-gray-300">{formatCop(combined.ventasCop)}</td>
                    <td className={`p-3 text-right font-mono font-bold ${combinedProfit >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>{formatCop(combinedProfit)}</td>
                    <td className="p-3 text-right font-bold text-gray-300">
                      {combined.ventasCop > 0 ? ((combinedProfit / combined.ventasCop) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Cotizaciones lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 items-start">
            {drafts.map((d, di) => {
              const r = results[di];
              const pct = Math.min(100, (r.subtotalUsd / TAX_FREE_LIMIT_USD) * 100);
              return (
                <div key={d.id} className={`bg-[#161616] border rounded-xl ${di === bestProfit ? 'border-kawa-green/60' : 'border-gray-800'}`}>
                  <div className="flex items-center gap-2 p-4 border-b border-gray-800">
                    {di === bestProfit && <Trophy size={16} className="text-kawa-green shrink-0" />}
                    <input
                      value={d.name}
                      onChange={e => update(d.id, x => ({ ...x, name: e.target.value }))}
                      className="flex-1 min-w-0 bg-transparent text-white font-bold outline-none border-b border-transparent focus:border-gray-600"
                    />
                    <button onClick={() => duplicate(d)} title="Duplicar" className="text-gray-400 hover:text-white p-1"><Copy size={16} /></button>
                    <button onClick={() => setDrafts(prev => prev.filter(x => x.id !== d.id))} title="Quitar" className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={16} /></button>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <select
                        value={d.carrier}
                        onChange={e => update(d.id, x => ({ ...x, carrier: e.target.value as Carrier }))}
                        className="bg-[#111] border border-gray-700 rounded px-2 py-1 text-white"
                      >
                        <option value="DHL">DHL</option>
                        <option value="FEDEX">FedEx</option>
                        <option value="OTHER">Otro</option>
                      </select>
                      <ShippingModeToggle
                        mode={d.shippingMode || 'manual'}
                        onChange={mode => update(d.id, x => ({ ...x, shippingMode: mode }))}
                      />
                      <label className="flex items-center gap-1 ml-auto">
                        Envío US$
                        <input
                          type="number"
                          value={d.shippingUsd}
                          onChange={e => update(d.id, x => ({ ...x, shippingUsd: e.target.value }))}
                          readOnly={d.shippingMode === 'api'}
                          placeholder="0.00"
                          className={`w-20 bg-[#111] border border-gray-700 rounded px-2 py-1 text-right text-white ${d.shippingMode === 'api' ? 'opacity-70' : ''}`}
                        />
                      </label>
                    </div>

                    {d.shippingMode === 'api' && (
                      <ImpexShippingPicker
                        compact
                        lines={toLines(d)}
                        usdJpyRate={usdJpyRate}
                        method={d.shippingMethod}
                        shippingUsd={d.shippingUsd}
                        onChange={({ method, shippingUsd, carrier }) =>
                          update(d.id, x => ({ ...x, shippingMethod: method, shippingUsd, carrier }))
                        }
                      />
                    )}

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={r.requiresTaxes ? 'text-red-400 font-semibold' : 'text-gray-400'}>
                          {r.requiresTaxes ? 'Paga arancel' : `Sin arancel · quedan ${formatUsd(Math.max(0, TAX_FREE_LIMIT_USD - r.subtotalUsd))}`}
                        </span>
                        <span className="font-mono text-gray-300">{formatUsd(r.subtotalUsd)} / {TAX_FREE_LIMIT_USD}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${r.requiresTaxes ? 'bg-red-500' : pct > 90 ? 'bg-yellow-500' : 'bg-kawa-green'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="divide-y divide-gray-800 border border-gray-800 rounded-lg">
                      {r.lines.length === 0 && <p className="text-xs text-gray-500 p-3">Sin piezas todavía</p>}
                      {r.lines.map(line => {
                        const partId = String(line.part.id);
                        return (
                          <div key={partId} className="p-2.5 space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="flex-1 min-w-0 truncate text-gray-200" title={partName(partId)}>{partName(partId)}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => setQty(d.id, partId, line.quantity - 1)} className="bg-gray-800 w-6 h-6 rounded text-white text-xs">−</button>
                                <span className="text-white w-5 text-center font-bold text-xs">{line.quantity}</span>
                                <button onClick={() => setQty(d.id, partId, line.quantity + 1)} className="bg-gray-800 w-6 h-6 rounded text-white text-xs">+</button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-500">
                              <span className="font-mono">{formatUsd((line.part.price_usd || 0) * line.quantity)}</span>
                              <span>puesto {formatCop(line.unitLandedCop)}</span>
                              <span className={line.unitProfitCop >= 0 ? 'text-kawa-green' : 'text-red-400'}>
                                {formatCop(line.unitProfitCop)} c/u ({line.marginPct.toFixed(0)}%)
                              </span>
                              {drafts.length > 1 && (
                                <select
                                  value=""
                                  onChange={e => e.target.value && moveUnit(d.id, e.target.value, partId)}
                                  title="Pasar 1 unidad a otra cotización"
                                  className="ml-auto bg-[#111] border border-gray-700 rounded px-1 py-0.5 text-[11px] text-gray-300"
                                >
                                  <option value="">Pasar 1 →</option>
                                  {drafts.map(other => other.id !== d.id && (
                                    <option key={other.id} value={other.id}>{other.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <PartPicker parts={parts} onPick={p => addPart(d.id, String(p.id))} />
                  </div>

                  <div className="p-4 border-t border-gray-800 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Piezas + envío</span>
                      <span className="font-mono text-gray-200">{formatCop(r.piezasCop + r.envioCop)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Impuestos + manejo</span>
                      <span className="font-mono text-orange-300">{formatCop(r.taxesAndFeesCop)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Costo total / Venta</span>
                      <span className="font-mono text-gray-200">{formatCop(r.totalCop)} / {formatCop(r.ventasCop)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1">
                      <span className="text-white">Utilidad</span>
                      <span className={r.utilidadCop >= 0 ? 'text-kawa-green' : 'text-red-400'}>
                        {formatCop(r.utilidadCop)} <span className="text-xs font-normal">({r.margenPct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <button
                      onClick={() => save(d, di)}
                      disabled={savingId === d.id || r.units === 0}
                      className="w-full mt-2 flex items-center justify-center gap-2 bg-[#1e1e1e] border border-gray-700 text-white py-2 rounded-lg hover:border-kawa-green hover:text-kawa-green disabled:opacity-50 text-sm"
                    >
                      <Save size={14} /> {savingId === d.id ? 'Guardando...' : 'Guardar en el historial'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
