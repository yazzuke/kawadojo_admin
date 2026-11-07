import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Plus, Replace, Search, Send, Sparkles, X, XCircle } from 'lucide-react';
import { aiService, type CatalogSuggestion, type QuoteProposal } from '../services/aiService';
import type { SavedImpexPart } from '../types/impex';
import { formatUsd, TAX_FREE_LIMIT_USD, type QuoteLine } from '../Utils/impexQuoteCalc';

interface Props {
  parts: SavedImpexPart[];
  hasCart: boolean;
  onLoad: (lines: QuoteLine[], mode: 'replace' | 'add') => void;
}

// La IA arma una cotización con las piezas guardadas a partir de un pedido en palabras
export default function AiQuoteBuilder({ parts, hasCart, onLoad }: Props) {
  const [open, setOpen] = useState(false); // Oculto por defecto; se abre con un clic
  const [request, setRequest] = useState('');
  const [underLimit, setUnderLimit] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(QuoteProposal & { request: string }) | null>(null);

  const partsById = useMemo(() => new Map(parts.map(p => [String(p.id), p])), [parts]);

  // Botones rápidos: un kit de empaques por cada moto que tenga piezas guardadas
  const presets = useMemo(() => {
    const counts = new Map<string, number>();
    parts.forEach(p => (p.compatibility || []).forEach(c => counts.set(c.moto_models.name, (counts.get(c.moto_models.name) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => `Kit de empaques ${name}`);
  }, [parts]);

  const build = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    try {
      setLoading(true);
      const data = await aiService.buildQuote(q, underLimit ? 199.5 : null);
      setResult({ ...data, request: q });
      if (!data.items.length) toast('La IA no encontró piezas guardadas para eso', { icon: '🤔' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'La IA no pudo armar la cotización');
    } finally {
      setLoading(false);
    }
  };

  const lines: QuoteLine[] = (result?.items || [])
    .map(it => ({ part: partsById.get(it.part_id)!, quantity: it.quantity }))
    .filter(l => l.part);

  const load = (mode: 'replace' | 'add') => {
    onLoad(lines, mode);
    setResult(null);
    setRequest('');
  };

  const missingStatus = (s: CatalogSuggestion) => {
    if (s.already_saved) return <span className="flex items-center gap-1 text-gray-400"><CheckCircle2 size={13} /> Ya la tienes como {s.saved_as?.part_no}</span>;
    if (!s.impex) return <span className="flex items-center gap-1 text-gray-500"><AlertTriangle size={13} /> No se pudo verificar</span>;
    if (!s.impex.found) return <span className="flex items-center gap-1 text-red-400"><XCircle size={13} /> No existe en Impex: la IA se equivocó</span>;
    if (s.impex.replaced_by) return <span className="flex items-center gap-1 text-yellow-400"><AlertTriangle size={13} /> Reemplazada por {s.impex.replaced_by}</span>;
    return (
      <span className="flex items-center gap-1 text-kawa-green">
        <CheckCircle2 size={13} /> Existe en Impex{s.impex.price_yen ? ` · ¥${s.impex.price_yen.toLocaleString('es-CO')}` : ''}
      </span>
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-purple-500/40 bg-[#161616] text-left text-sm hover:border-purple-400 transition-colors"
      >
        <Sparkles size={16} className="text-purple-400" />
        <span className="text-white font-semibold">Armar con IA</span>
        <span className="text-gray-500 text-xs hidden sm:inline">Pide un kit (ej. empaques Ninja 300) y la IA lo arma con tus piezas guardadas</span>
        <ChevronDown size={16} className="ml-auto text-gray-400" />
      </button>
    );
  }

  return (
    <section className="bg-[#161616] border border-purple-500/40 rounded-xl">
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-white font-bold flex items-center gap-2 mr-auto"><Sparkles size={16} className="text-purple-400" /> Armar con IA</h3>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={underLimit} onChange={e => setUnderLimit(e.target.checked)} className="w-4 h-4 accent-[#62BE1B]" />
            Que no pase de US$ {TAX_FREE_LIMIT_USD}
          </label>
          <button onClick={() => setOpen(false)} title="Ocultar" className="text-gray-400 hover:text-white p-1 ml-1">
            <ChevronUp size={16} />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); build(request); }} className="flex gap-2">
          <input
            value={request}
            onChange={e => setRequest(e.target.value)}
            placeholder="Ej: ármame el paquete de empaques de la Ninja 300 con 2 de cada uno"
            className="flex-1 bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:border-purple-400 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !request.trim()}
            className="flex items-center gap-2 bg-purple-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-400 disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {loading ? 'Armando...' : 'Armar'}
          </button>
        </form>
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button
                key={p}
                onClick={() => { setRequest(p); build(p); }}
                disabled={loading}
                className="px-2.5 py-1 rounded-full border border-gray-700 bg-[#1e1e1e] text-[11px] text-gray-200 hover:border-purple-400 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div className="border-t border-gray-800 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500">"{result.request}"</p>
              {result.notes && <p className="text-sm text-gray-200 mt-1">{result.notes}</p>}
            </div>
            <button onClick={() => setResult(null)} className="text-gray-400 hover:text-white p-1" title="Descartar"><X size={16} /></button>
          </div>

          {lines.length > 0 && (
            <>
              <ul className="divide-y divide-gray-800 border border-gray-800 rounded-lg">
                {result.items.map(it => {
                  const part = partsById.get(it.part_id);
                  if (!part) return null;
                  return (
                    <li key={it.part_id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0">{it.quantity}×</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{part.name_es || part.name_en || part.part_no}</p>
                        {it.reason && <p className="text-[11px] text-gray-500 truncate">{it.reason}</p>}
                      </div>
                      <span className="font-mono text-xs text-blue-400 shrink-0">{formatUsd((part.price_usd || 0) * it.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-mono mr-auto ${result.over_limit ? 'text-red-400' : 'text-gray-300'}`}>
                  Piezas: {formatUsd(result.subtotal_usd)}{result.over_limit && ' · pasa el límite'}
                </span>
                {hasCart && (
                  <button
                    onClick={() => load('add')}
                    className="flex items-center gap-1.5 bg-[#1e1e1e] border border-gray-700 text-white px-3 py-2 rounded-lg hover:border-kawa-green hover:text-kawa-green text-sm"
                  >
                    <Plus size={15} /> Agregar a la cotización
                  </button>
                )}
                <button
                  onClick={() => load('replace')}
                  className="flex items-center gap-1.5 bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-kawa-green-light text-sm"
                >
                  <Replace size={15} /> {hasCart ? 'Reemplazar cotización' : 'Usar esta cotización'}
                </button>
              </div>
            </>
          )}

          {result.missing.length > 0 && (
            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-[#1a1a1a] border-b border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Le faltaría al kit (no las tienes guardadas)</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Verificadas en Impex. Que exista no garantiza que sea de esa moto: compara con el nombre de Impex.</p>
              </div>
              <div className="divide-y divide-gray-800">
                {result.missing.map(s => (
                  <div key={s.part_no} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-white"><span className="font-mono text-gray-300 mr-2">{s.part_no}</span>{s.name}</p>
                      <p className="text-[11px] text-gray-500">{s.reason}{s.impex?.name && ` · Impex: ${s.impex.name}`}</p>
                    </div>
                    <div className="text-xs">{missingStatus(s)}</div>
                    {s.impex?.found && !s.already_saved && (
                      <Link
                        to={`/impex?buscar=${encodeURIComponent(s.impex.replaced_by || s.part_no)}`}
                        className="flex items-center gap-1.5 bg-[#1e1e1e] border border-gray-700 text-white px-3 py-1.5 rounded-lg hover:border-kawa-green hover:text-kawa-green text-xs"
                      >
                        <Search size={13} /> Ver en Impex
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
