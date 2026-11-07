import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bike, Loader2, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { impexService } from '../services/Impex';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types/product';
import type { ImpexCategorySuggestion, SavedImpexPart } from '../types/impex';
import CatalogAskPanel from './CatalogAskPanel';
import ModelSuggestPanel from './ModelSuggestPanel';
import MasterLinkBanner from './MasterLinkBanner';
import { aiService, type CompatSuggestion } from '../services/aiService';

interface Props {
  onEdit: (part: SavedImpexPart) => void;
  onSearchPart: (partNo: string) => void;
  exchangeRate: number | string;
  usdExchangeRate: number | string;
  refreshTrigger?: number;
}

const NONE = '__none__';

// Códigos Kawasaki escritos en el nombre que no son el código guardado (código nuevo o alterno)
const otherCodesInName = (p: SavedImpexPart) => {
  const own = (p.part_no || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
  const found = `${p.name_es || ''} ${p.name_en || ''}`.match(/\b\d{5}-\d{4}(?:-[A-Z0-9]{1,4})?\b/gi) || [];
  return [...new Set(found)].filter(c => c.replace(/[^0-9A-Z]/gi, '').toUpperCase() !== own);
};

const sourceLabel: Record<NonNullable<ImpexCategorySuggestion['source']>, { text: string; style: string }> = {
  producto: { text: 'Igual que en tu tienda', style: 'bg-blue-500/15 text-blue-300' },
  regla: { text: 'Por el nombre', style: 'bg-gray-700 text-gray-300' },
  ia: { text: 'Sugerido por IA', style: 'bg-purple-500/15 text-purple-300' },
};

export default function SavedPartsTab({ onEdit, onSearchPart, exchangeRate, usdExchangeRate, refreshTrigger }: Props) {
  const [askOpen, setAskOpen] = useState(false);
  const [modelSuggestions, setModelSuggestions] = useState<CompatSuggestion[] | null>(null);
  const [suggestingModels, setSuggestingModels] = useState(false);

  // La IA propone motos para las piezas que no tienen ninguna (no guarda nada hasta revisar)
  const runModelSuggest = async () => {
    try {
      setSuggestingModels(true);
      const data = await aiService.suggest('impex', true);
      setModelSuggestions(data);
      if (!data.length) toast.success('Todas las piezas tienen moto');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error sugiriendo motos');
    } finally {
      setSuggestingModels(false);
    }
  };
  const [parts, setParts] = useState<SavedImpexPart[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null); // id, NONE o null = todas
  const [modelFilter, setModelFilter] = useState<string | null>(null);       // id de moto, NONE o null = todas

  // Clasificación automática: propuestas para revisar antes de guardar
  const [suggesting, setSuggesting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<ImpexCategorySuggestion & { chosen: string; selected: boolean }> | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, cats] = await Promise.all([impexService.getSavedParts(), categoryService.getAll()]);
      if (res.success) setParts(res.data);
      else setError('Respuesta no exitosa de la API');
      setCategories(cats);
    } catch (err: any) {
      setError(err.message || 'Error al obtener los repuestos guardados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [refreshTrigger]);

  const handleDelete = async (partNoRaw: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta pieza? Esta acción no se puede deshacer.')) return;
    try {
      const res = await impexService.deletePart(partNoRaw);
      if (res.success) {
        toast.success(res.message || 'Pieza eliminada');
        fetchAll();
      } else {
        toast.error(res.message || 'Error al eliminar la pieza');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la pieza');
    }
  };

  const changeCategory = async (part: SavedImpexPart, categoryId: string | null) => {
    const category = categories.find(c => c.id === categoryId) || null;
    setParts(prev => prev.map(p => (p.id === part.id ? { ...p, category_id: categoryId, category } : p)));
    try {
      await impexService.setCategory(String(part.id), categoryId);
    } catch {
      toast.error('No se pudo guardar la categoría');
      fetchAll();
    }
  };

  const runSuggest = async () => {
    try {
      setSuggesting(true);
      const res = await impexService.suggestCategories(true);
      const rows = res.data.map(s => ({ ...s, chosen: s.suggested?.id || '', selected: !!s.suggested }));
      setSuggestions(rows);
      if (!rows.length) toast.success('Todas las piezas ya tienen categoría');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error clasificando');
    } finally {
      setSuggesting(false);
    }
  };

  const applySuggestions = async () => {
    const items = (suggestions || []).filter(s => s.selected && s.chosen).map(s => ({ id: s.id, category_id: s.chosen }));
    if (!items.length) return;
    try {
      setApplying(true);
      await impexService.applyCategories(items);
      toast.success(`${items.length} piezas categorizadas`);
      setSuggestions(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error guardando categorías');
    } finally {
      setApplying(false);
    }
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach(p => map.set(p.category_id || NONE, (map.get(p.category_id || NONE) || 0) + 1));
    return map;
  }, [parts]);

  const modelsOf = (p: SavedImpexPart) => (p.compatibility || []).map(c => c.moto_models);
  const matchesModel = (p: SavedImpexPart, id: string | null) =>
    id === null || (id === NONE ? modelsOf(p).length === 0 : modelsOf(p).some(m => m.id === id));

  // Motos para filtrar: cuenta las piezas de la categoría elegida que le sirven a cada moto
  const inCategory = parts.filter(p => categoryFilter === null || (p.category_id || NONE) === categoryFilter);
  const modelChips = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    let noModel = 0;
    inCategory.forEach(p => {
      const models = modelsOf(p);
      if (!models.length) noModel += 1;
      models.forEach(m => {
        const entry = map.get(m.id) || { id: m.id, name: m.name, count: 0 };
        entry.count += 1;
        map.set(m.id, entry);
      });
    });
    return { models: [...map.values()].sort((a, b) => a.name.localeCompare(b.name)), noModel };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, categoryFilter]);

  const t = term.trim().toLowerCase();
  const visible = inCategory.filter(p =>
    matchesModel(p, modelFilter) &&
    (!t || [p.name_es, p.name_en, p.name_ja, p.part_no].some(v => (v || '').toLowerCase().includes(t)))
  );
  const missing = counts.get(NONE) || 0;
  const noModelCount = parts.filter(p => !(p.compatibility || []).length).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-900/40 border border-red-800 rounded-lg text-red-400">{error}</div>;
  }

  const chip = (id: string | null, label: string, count: number, warn = false) => (
    <button
      key={id ?? 'all'}
      onClick={() => setCategoryFilter(id)}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        categoryFilter === id
          ? 'bg-kawa-green text-black border-kawa-green'
          : warn ? 'border-yellow-600/60 text-yellow-400 hover:border-yellow-500' : 'border-gray-700 text-gray-300 hover:border-gray-500'
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );

  const modelChip = (id: string | null, label: string, count: number, warn = false) => (
    <button
      key={id ?? 'all-models'}
      onClick={() => setModelFilter(id)}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        modelFilter === id
          ? 'bg-blue-500 text-white border-blue-500'
          : warn ? 'border-yellow-600/60 text-yellow-400 hover:border-yellow-500' : 'border-gray-700 text-gray-300 hover:border-gray-500'
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Fichas que les corresponden a piezas sin ficha */}
      <MasterLinkBanner refreshKey={refreshTrigger} onLinked={fetchAll} />

      {/* Motos propuestas por la IA */}
      {modelSuggestions && modelSuggestions.length > 0 && (
        <ModelSuggestPanel
          suggestions={modelSuggestions}
          onClose={() => setModelSuggestions(null)}
          onApplied={() => { setModelSuggestions(null); fetchAll(); }}
        />
      )}

      {/* Clasificación automática */}
      {suggestions && suggestions.length > 0 && (
        <div className="bg-kawa-gray border border-purple-500/40 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-800">
            <div className="mr-auto">
              <h3 className="text-white font-bold flex items-center gap-2"><Sparkles size={16} className="text-purple-400" /> Categorías propuestas</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="text-blue-300">Igual que en tu tienda</span>: un producto tuyo con el mismo código OEM ya tiene esa categoría ·{' '}
                <span className="text-gray-300">Por el nombre</span>: sale de palabras como "empaque" o "anillo" ·{' '}
                <span className="text-purple-300">IA</span>: lo sugiere Gemini. Las que quedan "Sin categoría" ponlas tú. Nada se guarda hasta que le des Guardar.
              </p>
            </div>
            <button onClick={() => setSuggestions(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancelar</button>
            <button
              onClick={applySuggestions}
              disabled={applying}
              className="flex items-center gap-2 bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-kawa-green-light disabled:opacity-50 text-sm"
            >
              {applying && <Loader2 size={14} className="animate-spin" />}
              Guardar {suggestions.filter(s => s.selected && s.chosen).length}
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-800">
            {suggestions.map(s => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={s.selected}
                  disabled={!s.chosen}
                  onChange={() => setSuggestions(prev => prev!.map(x => (x.id === s.id ? { ...x, selected: !x.selected } : x)))}
                  className="w-4 h-4 accent-[#62BE1B]"
                />
                <div className="flex-1 min-w-[200px]">
                  <p className="text-white">{s.name}</p>
                  <p className="text-[11px] text-gray-500"><span className="font-mono">{s.part_no}</span>{s.reason && ` · ${s.reason}`}</p>
                </div>
                {s.source && <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${sourceLabel[s.source].style}`}>{sourceLabel[s.source].text}</span>}
                <select
                  value={s.chosen}
                  onChange={e => setSuggestions(prev => prev!.map(x => (x.id === s.id ? { ...x, chosen: e.target.value, selected: !!e.target.value } : x)))}
                  className="bg-[#111] border border-gray-700 rounded px-2 py-1.5 text-white text-xs min-w-[190px]"
                >
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-kawa-gray rounded-xl border border-gray-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-800 bg-[#2a2a2a] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h2 className="text-lg font-semibold text-white mr-auto">Piezas en Base de Datos <span className="text-gray-500 text-sm font-normal">({parts.length})</span></h2>
            <div className="relative md:w-72">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg pl-8 pr-8 py-2 focus:border-kawa-green outline-none"
              />
              {term && (
                <button onClick={() => setTerm('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-white"><X size={16} /></button>
              )}
            </div>
            <button
              onClick={() => setAskOpen(o => !o)}
              disabled={visible.length === 0}
              title="Pregúntale a la IA sobre las piezas que estás viendo"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 ${askOpen ? 'bg-purple-500 text-white' : 'bg-purple-500/15 text-purple-200 border border-purple-500/50 hover:border-purple-400'}`}
            >
              <Sparkles size={15} /> Preguntar a la IA ({visible.length})
            </button>
            <button
              onClick={runModelSuggest}
              disabled={suggestingModels || noModelCount === 0}
              title={noModelCount === 0 ? 'Todas tienen moto' : 'Propone motos para las piezas que no tienen ninguna'}
              className="flex items-center gap-2 bg-[#1e1e1e] border border-blue-500/50 text-blue-200 px-3 py-2 rounded-lg hover:border-blue-400 disabled:opacity-40 text-sm"
            >
              {suggestingModels ? <Loader2 size={15} className="animate-spin" /> : <Bike size={15} />}
              Asignar motos ({noModelCount})
            </button>
            <button
              onClick={runSuggest}
              disabled={suggesting || missing === 0}
              title={missing === 0 ? 'Todas tienen categoría' : 'Propone categoría para las piezas que no tienen'}
              className="flex items-center gap-2 bg-[#1e1e1e] border border-purple-500/50 text-purple-200 px-3 py-2 rounded-lg hover:border-purple-400 disabled:opacity-40 text-sm"
            >
              {suggesting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              Clasificar sin categoría ({missing})
            </button>
            <button onClick={fetchAll} className="text-gray-400 hover:text-white p-2" title="Recargar"><RefreshCw size={18} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 w-16">Categoría</span>
            {chip(null, 'Todas', parts.length)}
            {categories.filter(c => counts.get(c.id)).map(c => chip(c.id, c.name, counts.get(c.id) || 0))}
            {missing > 0 && chip(NONE, 'Sin categoría', missing, true)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 w-16">Moto</span>
            {modelChip(null, 'Todas', inCategory.length)}
            {modelChips.models.map(m => modelChip(m.id, m.name, m.count))}
            {modelChips.noModel > 0 && modelChip(NONE, 'Sin modelo', modelChips.noModel, true)}
          </div>
        </div>

        {askOpen && visible.length > 0 && (
          <div className="p-4 border-b border-gray-800">
            <CatalogAskPanel
              partIds={visible.map(p => String(p.id))}
              categoryId={categoryFilter && categoryFilter !== NONE ? categoryFilter : null}
              categoryName={categoryFilter === NONE ? 'Sin categoría' : categories.find(c => c.id === categoryFilter)?.name || null}
              modelId={modelFilter && modelFilter !== NONE ? modelFilter : null}
              modelName={modelFilter === NONE ? null : modelChips.models.find(m => m.id === modelFilter)?.name || null}
              onSearchPart={onSearchPart}
              onClose={() => setAskOpen(false)}
            />
          </div>
        )}

        {visible.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a1a] border-b border-gray-800">
                <tr className="text-left text-gray-400 text-xs">
                  <th className="p-4 font-semibold uppercase tracking-wider">Pieza</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Categoría</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Base (¥)</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">USD</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Costo (COP)</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">P. Venta (COP)</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Utilidad</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-kawa-gray divide-y divide-gray-800">
                {visible.map(part => {
                  const copCost = (part.price_yen || 0) * (Number(exchangeRate) || 0);
                  const priceUsd = (part.price_yen || 0) / (Number(usdExchangeRate) || 160);
                  const sellPrice = part.kawadojo_price || 0;
                  const profit = sellPrice > 0 ? sellPrice - copCost : 0;
                  const margin = copCost > 0 && sellPrice > 0 ? (profit / copCost) * 100 : 0;
                  return (
                    <tr key={part.id} className="hover:bg-[#2a2a2a] transition-colors">
                      <td className="p-4 text-sm max-w-xs">
                        <p className="text-white font-medium truncate" title={part.name_es || part.name_en || part.name_ja || ''}>
                          {part.name_es || part.name_en || part.name_ja}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="text-xs text-gray-500 font-mono mr-1">{part.part_no}</span>
                          {otherCodesInName(part).map(code => (
                            <span
                              key={code}
                              title="El nombre trae otro código: puede ser el código nuevo (reemplazo) o el de otra moto. Confirma cuál es el que pides en Impex."
                              className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-[10px] font-semibold font-mono"
                            >
                              nombre: {code}
                            </span>
                          ))}
                          {modelsOf(part).map(m => (
                            <span key={m.id} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-semibold">{m.name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={part.category_id || ''}
                          onChange={e => changeCategory(part, e.target.value || null)}
                          className={`bg-[#111] border rounded px-2 py-1.5 text-xs min-w-[170px] ${part.category_id ? 'border-gray-700 text-white' : 'border-yellow-600/60 text-yellow-400'}`}
                        >
                          <option value="">Sin categoría</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="p-4 whitespace-nowrap text-sm text-gray-400 font-mono">¥ {part.price_yen?.toLocaleString() ?? 0}</td>
                      <td className="p-4 whitespace-nowrap text-sm text-blue-400 font-mono">US$ {priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-300">$ {copCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                      <td className="p-4 whitespace-nowrap text-sm font-semibold text-kawa-green">$ {sellPrice.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                      <td className="p-4 whitespace-nowrap text-sm">
                        {sellPrice > 0 ? (
                          <div className="flex flex-col">
                            <span className={profit > 0 ? 'text-kawa-green font-bold' : 'text-red-500 font-bold'}>
                              $ {profit.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                            <span className={`text-[11px] font-bold ${profit > 0 ? 'text-kawa-green/80' : 'text-red-500/80'}`}>{margin.toFixed(1)}% margen</span>
                          </div>
                        ) : (
                          <span className="text-gray-600 font-medium px-2">—</span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => onEdit(part)} className="bg-gray-800 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors text-xs font-bold">
                            Editar
                          </button>
                          <button onClick={() => handleDelete(part.part_no_raw)} className="bg-red-900/50 text-red-400 px-3 py-1 rounded-md hover:bg-red-900 hover:text-red-300 transition-colors text-xs font-bold">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <h3 className="text-white font-bold text-lg">{parts.length ? 'Ninguna pieza coincide' : 'No hay piezas guardadas'}</h3>
            <p className="text-gray-500 mt-2">{parts.length ? 'Cambia la búsqueda o el filtro de categoría.' : 'Usa la pestaña de consulta para buscar y guardar repuestos.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
