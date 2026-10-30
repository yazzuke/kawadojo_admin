import { useMemo, useState } from 'react';
import { GitCompare, Loader2, PackagePlus, Pencil, Search, Trash2, Trophy, X } from 'lucide-react';
import type { ImpexQuote } from '../types/impex';
import { formatCop, formatUsd, TAX_FREE_LIMIT_USD } from '../Utils/impexQuoteCalc';

interface Props {
  quotes: ImpexQuote[];
  isDeleting: string | null;
  isConverting: string | null;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
  onEdit: (quote: ImpexQuote) => void;
}

type SortKey = 'recent' | 'profit' | 'margin';

// Métricas de una cotización guardada
function quoteMetrics(q: ImpexQuote) {
  const units = q.items.reduce((sum, it) => sum + it.quantity, 0);
  const ventas = q.items.reduce((sum, it) => sum + (it.impex_part?.kawadojo_price || 0) * it.quantity, 0);
  const total = q.total_cop || 0;
  const trm = q.customs_trm || 4000;
  const iva = Math.round((q.iva_usd || 0) * trm);
  const arancel = Math.round((q.arancel_usd || 0) * trm);
  const manejo = q.carrier_fees_cop || 0;
  const piezasTrm = q.exchange_rate_jpy_cop && q.exchange_rate_usd_jpy
    ? Math.round(q.exchange_rate_jpy_cop * q.exchange_rate_usd_jpy)
    : 0;
  return {
    units, ventas, total, iva, arancel, manejo, piezasTrm,
    taxesAndFees: iva + arancel + manejo,
    utilidad: ventas - total,
    margen: ventas > 0 ? ((ventas - total) / ventas) * 100 : 0,
    costPerUnit: units > 0 ? total / units : 0,
  };
}

const partName = (it: ImpexQuote['items'][number]) =>
  it.impex_part?.name_es || it.impex_part?.name_en || it.impex_part?.part_no || 'Pieza';

export default function QuoteHistory({ quotes, isDeleting, isConverting, onDelete, onConvert, onEdit }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('recent');
  const [term, setTerm] = useState('');

  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    const list = quotes
      .map(q => ({ q, m: quoteMetrics(q) }))
      .filter(({ q }) => !t
        || (q.quote_number || '').toLowerCase().includes(t)
        || q.items.some(it => partName(it).toLowerCase().includes(t) || (it.impex_part?.part_no || '').toLowerCase().includes(t)));
    if (sort === 'profit') list.sort((a, b) => b.m.utilidad - a.m.utilidad);
    if (sort === 'margin') list.sort((a, b) => b.m.margen - a.m.margen);
    return list;
  }, [quotes, sort, term]);

  const compared = rows.filter(r => selected.includes(r.q.id as string));
  const bestCompared = compared.length
    ? compared.reduce((a, b) => (b.m.utilidad > a.m.utilidad ? b : a)).q.id
    : null;
  const toggle = (id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  if (quotes.length === 0) {
    return <p className="text-gray-500 text-center py-10">No hay cotizaciones guardadas.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative md:w-72">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="Buscar por COT o pieza..."
            className="w-full bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg pl-8 pr-8 py-2 focus:border-kawa-green outline-none"
          />
          {term && (
            <button onClick={() => setTerm('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-3 py-2"
        >
          <option value="recent">Más recientes</option>
          <option value="profit">Mayor utilidad</option>
          <option value="margin">Mayor margen</option>
        </select>
        <p className="text-sm text-gray-400 flex items-center gap-2 md:ml-auto">
          <GitCompare size={16} />
          {selected.length === 0
            ? 'Marca dos o más para compararlas'
            : <>{selected.length} marcada{selected.length > 1 ? 's' : ''} · <button onClick={() => setSelected([])} className="text-kawa-green hover:underline">limpiar</button></>}
        </p>
      </div>

      {/* Comparación */}
      {compared.length >= 2 && (
        <div className="bg-[#161616] border border-kawa-green/40 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                <th className="p-3 font-semibold">Cotización</th>
                <th className="p-3 font-semibold text-right">Uds</th>
                <th className="p-3 font-semibold text-right">Piezas</th>
                <th className="p-3 font-semibold text-right">Impuestos + manejo</th>
                <th className="p-3 font-semibold text-right">Costo total</th>
                <th className="p-3 font-semibold text-right">Costo / ud</th>
                <th className="p-3 font-semibold text-right">Utilidad</th>
                <th className="p-3 font-semibold text-right">Margen</th>
              </tr>
            </thead>
            <tbody>
              {compared.map(({ q, m }) => (
                <tr key={q.id} className={`border-t border-gray-800 ${q.id === bestCompared ? 'bg-kawa-green/10' : ''}`}>
                  <td className="p-3 text-white font-medium whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      {q.id === bestCompared && <Trophy size={14} className="text-kawa-green" />}
                      {q.quote_number} <span className="text-xs text-gray-500">{q.carrier}</span>
                    </span>
                  </td>
                  <td className="p-3 text-right text-gray-300">{m.units}</td>
                  <td className="p-3 text-right font-mono text-gray-300">{formatUsd(q.subtotal_usd || 0)}</td>
                  <td className="p-3 text-right font-mono text-orange-300">{formatCop(m.taxesAndFees)}</td>
                  <td className="p-3 text-right font-mono text-white">{formatCop(m.total)}</td>
                  <td className="p-3 text-right font-mono text-gray-300">{formatCop(m.costPerUnit)}</td>
                  <td className={`p-3 text-right font-mono font-bold ${m.utilidad >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>{formatCop(m.utilidad)}</td>
                  <td className={`p-3 text-right font-bold ${m.margen >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>{m.margen.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Ninguna cotización coincide con "{term}".</p>}

      {/* Tarjetas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {rows.map(({ q, m }) => {
          const id = q.id as string;
          const isSelected = selected.includes(id);
          const busy = isDeleting === id || isConverting === id;
          const subtotal = q.subtotal_usd || 0;
          const overLimit = subtotal > TAX_FREE_LIMIT_USD;
          return (
            <article
              key={id}
              className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition-colors ${isSelected ? 'border-kawa-green/60' : 'border-gray-800 hover:border-gray-700'}`}
            >
              {/* Encabezado */}
              <header className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(id)}
                  title="Marcar para comparar"
                  className="w-4 h-4 mt-1 accent-[#62BE1B] cursor-pointer shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-white font-bold">{q.quote_number}</h4>
                    <span className="bg-gray-800 text-[11px] text-gray-300 px-2 py-0.5 rounded">{q.carrier || 'N/A'}</span>
                    {q.status === 'ordered' && (
                      <span className="bg-kawa-green/15 text-kawa-green text-[11px] px-2 py-0.5 rounded">Convertida a lote</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {q.created_at ? new Date(q.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    {' · '}{m.units} uds
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEdit(q)} title="Abrir en el comparador para editarla" className="p-2 rounded text-gray-400 hover:text-white hover:bg-[#2a2a2a]">
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(id)}
                    disabled={busy}
                    title="Eliminar cotización"
                    className="p-2 rounded text-gray-500 hover:text-red-400 hover:bg-[#2a2a2a] disabled:opacity-50"
                  >
                    {isDeleting === id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </header>

              {/* Cifras clave */}
              <div className="grid grid-cols-3 border-y border-gray-800 divide-x divide-gray-800">
                <div className="px-4 py-3">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">Costo total</p>
                  <p className="text-white font-bold">{formatCop(m.total)}</p>
                  <p className="text-[11px] text-blue-400 font-mono">{formatUsd(q.total_usd || 0)}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">Utilidad est.</p>
                  <p className={`font-bold ${m.utilidad >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>{formatCop(m.utilidad)}</p>
                  <p className="text-[11px] text-gray-400">{m.margen.toFixed(1)}% margen</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">Costo / ud</p>
                  <p className="text-gray-200 font-bold">{formatCop(m.costPerUnit)}</p>
                  <p className="text-[11px] text-gray-400">venta {formatCop(m.ventas)}</p>
                </div>
              </div>

              {/* Piezas */}
              <ul className="px-4 py-2 max-h-44 overflow-y-auto divide-y divide-gray-800/70">
                {q.items.map((it, idx) => (
                  <li key={idx} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0">{it.quantity}×</span>
                    <span className="flex-1 min-w-0 truncate text-gray-200" title={partName(it)}>{partName(it)}</span>
                    <span className="text-blue-400 font-mono text-xs shrink-0">{formatUsd(it.unit_price_usd || 0)}</span>
                    {it.impex_part?.kawadojo_price ? (
                      <span className="text-gray-500 font-mono text-xs shrink-0 w-24 text-right">{formatCop(it.impex_part.kawadojo_price)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>

              {/* Desglose */}
              <div className="px-4 py-3 bg-[#151515] border-t border-gray-800 space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={overLimit ? 'text-red-400 font-semibold' : 'text-gray-500'}>
                      {overLimit ? 'Pagó arancel' : 'Sin arancel'}
                    </span>
                    <span className="font-mono text-gray-400">{formatUsd(subtotal)} / {TAX_FREE_LIMIT_USD}</span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${overLimit ? 'bg-red-500' : 'bg-kawa-green'}`} style={{ width: `${Math.min(100, (subtotal / TAX_FREE_LIMIT_USD) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-400">Envío <span className="text-gray-200 font-mono">{formatUsd(q.shipping_usd || 0)}</span></span>
                  {m.iva > 0 && <span className="text-gray-400">IVA <span className="text-red-300 font-mono">{formatCop(m.iva)}</span></span>}
                  {m.arancel > 0 && <span className="text-gray-400">Arancel <span className="text-red-300 font-mono">{formatCop(m.arancel)}</span></span>}
                  {m.manejo > 0 && <span className="text-gray-400">Manejo <span className="text-orange-300 font-mono">{formatCop(m.manejo)}</span></span>}
                </div>
                <p className="text-[11px] text-gray-500">
                  TRM piezas {m.piezasTrm ? m.piezasTrm.toLocaleString('es-CO') : '—'} · envío {(q.shipping_trm || 0).toLocaleString('es-CO')} · aduana {(q.customs_trm || 0).toLocaleString('es-CO')}
                </p>
              </div>

              <footer className="px-4 py-3 border-t border-gray-800 flex justify-end">
                <button
                  onClick={() => onConvert(id)}
                  disabled={busy}
                  className="flex items-center gap-2 bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-kawa-green-light text-sm disabled:opacity-50"
                >
                  {isConverting === id ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                  {isConverting === id ? 'Convirtiendo...' : 'Convertir a lote'}
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
