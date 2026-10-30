import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { aiService, type CompatScope, type CompatSuggestion, type ImpexVerification } from '../services/aiService';

interface Row extends CompatSuggestion {
  selected: boolean;
  chosen: Set<string>;    // ids de modelos existentes elegidos
  chosenNew: Set<string>; // modelos nuevos a crear
}

const confidenceStyle: Record<Row['confidence'], string> = {
  alta: 'bg-kawa-green/15 text-kawa-green',
  media: 'bg-yellow-500/15 text-yellow-400',
  baja: 'bg-red-500/15 text-red-400',
};

// Por defecto: lo que dice el nombre va marcado; lo inferido no; lo nuevo solo si la confianza es alta
function toRow(s: CompatSuggestion): Row {
  const chosen = new Set(s.models.map(m => m.id));
  const chosenNew = new Set(s.confidence === 'alta' ? s.new_models : []);
  return { ...s, chosen, chosenNew, selected: s.confidence !== 'baja' && chosen.size + chosenNew.size > 0 };
}

export default function AiCompatibilityPage() {
  const [status, setStatus] = useState<{ impex: number; products: number; ai_configured: boolean } | null>(null);
  const [scope, setScope] = useState<CompatScope>('impex');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [applying, setApplying] = useState(false);
  const [verification, setVerification] = useState<Record<string, ImpexVerification>>({});

  const loadStatus = () => aiService.getStatus().then(setStatus).catch(() => toast.error('No se pudo cargar el estado'));
  useEffect(() => { loadStatus(); }, []);

  const runSuggest = async () => {
    try {
      setLoading(true);
      setRows([]);
      setVerification({});
      const data = await aiService.suggest(scope, onlyMissing);
      setRows(data.map(toRow));
      if (!data.length) toast.success('No hay nada pendiente en esta lista');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error consultando la IA');
    } finally {
      setLoading(false);
    }
  };

  const runVerify = async () => {
    try {
      setVerifying(true);
      const data = await aiService.verifyImpex(rows.map(r => r.id));
      setVerification(Object.fromEntries(data.map(v => [v.id, v])));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error verificando en Impex');
    } finally {
      setVerifying(false);
    }
  };

  const updateRow = (id: string, fn: (r: Row) => Row) => setRows(prev => prev.map(r => (r.id === id ? fn(r) : r)));

  const toggleModel = (id: string, modelId: string) =>
    updateRow(id, r => {
      const chosen = new Set(r.chosen);
      if (chosen.has(modelId)) chosen.delete(modelId); else chosen.add(modelId);
      return { ...r, chosen, selected: chosen.size + r.chosenNew.size > 0 ? r.selected || true : false };
    });

  const toggleNew = (id: string, name: string) =>
    updateRow(id, r => {
      const chosenNew = new Set(r.chosenNew);
      if (chosenNew.has(name)) chosenNew.delete(name); else chosenNew.add(name);
      return { ...r, chosenNew, selected: r.chosen.size + chosenNew.size > 0 ? r.selected || true : false };
    });

  const selectedRows = rows.filter(r => r.selected && r.chosen.size + r.chosenNew.size > 0);
  const newModelsToCreate = useMemo(
    () => [...new Set(selectedRows.flatMap(r => [...r.chosenNew]))],
    [selectedRows]
  );

  const apply = async () => {
    if (!selectedRows.length) return;
    const msg = `Se van a guardar los modelos de ${selectedRows.length} ${scope === 'impex' ? 'piezas' : 'productos'}.`
      + (newModelsToCreate.length ? `\n\nModelos nuevos que se crean: ${newModelsToCreate.join(', ')}` : '')
      + '\n\n¿Continuar?';
    if (!confirm(msg)) return;
    try {
      setApplying(true);
      const res = await aiService.apply(scope, selectedRows.map(r => ({
        id: r.id,
        model_ids: [...r.chosen],
        new_models: [...r.chosenNew],
      })));
      toast.success(`${res.links_created} compatibilidades guardadas${res.models_created.length ? ` · ${res.models_created.length} modelos nuevos` : ''}`);
      const applied = new Set(selectedRows.map(r => r.id));
      setRows(prev => prev.filter(r => !applied.has(r.id)));
      loadStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error guardando');
    } finally {
      setApplying(false);
    }
  };

  const chip = (label: string, active: boolean, onClick: () => void, variant: 'direct' | 'inferred' | 'new', title?: string) => {
    const styles = {
      direct: active ? 'bg-kawa-green text-black border-kawa-green' : 'border-kawa-green/40 text-kawa-green/60',
      inferred: active ? 'bg-blue-500 text-white border-blue-500' : 'border-dashed border-blue-500/60 text-blue-300/70',
      new: active ? 'bg-purple-500 text-white border-purple-500' : 'border-dashed border-purple-500/60 text-purple-300/70',
    }[variant];
    return (
      <button key={label} type="button" onClick={onClick} title={title} className={`px-2 py-0.5 rounded-full border text-xs font-semibold transition-colors ${styles}`}>
        {variant === 'new' && '+ '}{label}{variant === 'inferred' && ' ·inferido'}
      </button>
    );
  };

  const verifyBadge = (id: string) => {
    const v = verification[id];
    if (!v) return null;
    if (v.error || !v.found) return <span className="flex items-center gap-1 text-[11px] text-red-400"><XCircle size={12} /> No encontrada en Impex</span>;
    if (v.replaced_by) return <span className="flex items-center gap-1 text-[11px] text-yellow-400"><AlertTriangle size={12} /> Reemplazada por {v.replaced_by}</span>;
    if (v.discontinued) return <span className="flex items-center gap-1 text-[11px] text-red-400"><XCircle size={12} /> Descontinuada</span>;
    const priceChanged = v.price_yen_now != null && v.price_yen_saved != null && v.price_yen_now !== v.price_yen_saved;
    return (
      <span className={`flex items-center gap-1 text-[11px] ${priceChanged ? 'text-yellow-400' : 'text-kawa-green'}`}>
        <CheckCircle2 size={12} /> Vigente{priceChanged && ` · precio ¥${v.price_yen_saved?.toLocaleString('es-CO')} → ¥${v.price_yen_now?.toLocaleString('es-CO')}`}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Sparkles className="text-kawa-green" /> Asistente IA</h1>
        <p className="text-gray-400 mt-1">Gemini sugiere los modelos compatibles leyendo el nombre y el código de cada repuesto. Nada se guarda hasta que lo apruebes.</p>
      </div>

      {status && !status.ai_configured && (
        <div className="flex gap-2 p-4 rounded-lg border border-yellow-700 bg-yellow-900/20 text-yellow-300 text-sm">
          <AlertTriangle size={18} className="shrink-0" />
          Falta <code className="font-mono">GEMINI_API_KEY</code> en el <code className="font-mono">.env</code> del backend. Agrégala y reinicia el backend.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([['impex', 'Piezas Impex sin modelo', status?.impex], ['products', 'Productos de la tienda sin modelo', status?.products]] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => { setScope(key); setRows([]); setVerification({}); }}
            className={`text-left p-5 rounded-lg border transition-colors ${scope === key ? 'border-kawa-green bg-kawa-green/10' : 'border-gray-800 bg-kawa-gray hover:border-gray-600'}`}
          >
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-3xl font-bold text-white mt-1">{count ?? '—'}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-kawa-gray border border-gray-800 rounded-lg p-4">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} className="w-4 h-4 accent-[#62BE1B]" />
          Solo los que no tienen modelo
        </label>
        <button
          onClick={runSuggest}
          disabled={loading || status?.ai_configured === false}
          className="flex items-center gap-2 bg-kawa-green text-black font-bold px-5 py-2.5 rounded-lg hover:bg-kawa-green-light disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? 'Analizando...' : 'Sugerir con IA'}
        </button>
        {scope === 'impex' && rows.length > 0 && (
          <button
            onClick={runVerify}
            disabled={verifying}
            className="flex items-center gap-2 bg-[#1e1e1e] border border-gray-700 text-white px-4 py-2.5 rounded-lg hover:border-gray-500 disabled:opacity-50 text-sm"
          >
            {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Verificar en Impex
          </button>
        )}
        {rows.length > 0 && (
          <div className="flex items-center gap-3 md:ml-auto">
            <span className="text-sm text-gray-400">{selectedRows.length} de {rows.length} seleccionados</span>
            <button
              onClick={apply}
              disabled={applying || !selectedRows.length}
              className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {applying && <Loader2 size={16} className="animate-spin" />}
              Aplicar ({selectedRows.length})
            </button>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <p className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
            <span><span className="text-kawa-green font-semibold">Verde</span>: dicho en el nombre</span>
            <span><span className="text-blue-400 font-semibold">Azul</span>: inferido por la IA (revísalo)</span>
            <span><span className="text-purple-400 font-semibold">Morado</span>: modelo nuevo que se crearía</span>
            <span>Toca un modelo para marcarlo o desmarcarlo.</span>
          </p>
          <div className="bg-kawa-gray border border-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="p-3 w-10"></th>
                  <th className="p-3 font-semibold">Repuesto</th>
                  <th className="p-3 font-semibold">Ya tiene</th>
                  <th className="p-3 font-semibold">Sugerencia</th>
                  <th className="p-3 font-semibold">Confianza</th>
                  <th className="p-3 font-semibold">Por qué</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const empty = !r.models.length && !r.inferred_models.length && !r.new_models.length;
                  return (
                    <tr key={r.id} className={`border-t border-gray-800 align-top ${r.selected ? 'bg-kawa-green/5' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          disabled={r.chosen.size + r.chosenNew.size === 0}
                          onChange={() => updateRow(r.id, x => ({ ...x, selected: !x.selected }))}
                          className="w-4 h-4 accent-[#62BE1B] disabled:opacity-30"
                        />
                      </td>
                      <td className="p-3 min-w-[220px]">
                        <p className="text-white font-semibold leading-tight">{r.name}</p>
                        {r.code && <p className="text-gray-500 text-xs font-mono mt-0.5">{r.code}</p>}
                        <div className="mt-1">{verifyBadge(r.id)}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {r.current_models.length
                            ? r.current_models.map(m => <span key={m.name} className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 text-xs">{m.name}</span>)
                            : <span className="text-gray-600 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="p-3 min-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {r.models.map(m => chip(m.name, r.chosen.has(m.id), () => toggleModel(r.id, m.id), 'direct'))}
                          {r.inferred_models.map(m => chip(m.name, r.chosen.has(m.id), () => toggleModel(r.id, m.id), 'inferred'))}
                          {r.new_models.map(n => chip(n, r.chosenNew.has(n), () => toggleNew(r.id, n), 'new', 'No existe todavía: se crea al aplicar'))}
                          {empty && <span className="text-gray-500 text-xs">Sin sugerencia</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${confidenceStyle[r.confidence]}`}>{r.confidence}</span>
                      </td>
                      <td className="p-3 text-gray-400 text-xs max-w-xs">{r.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
