import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bike, Loader2, X } from 'lucide-react';
import { aiService, type CompatSuggestion } from '../services/aiService';

interface Row extends CompatSuggestion {
  selected: boolean;
  chosen: Set<string>;    // Modelos existentes elegidos
  chosenNew: Set<string>; // Modelos nuevos a crear
}

const confidenceStyle: Record<Row['confidence'], string> = {
  alta: 'bg-kawa-green/15 text-kawa-green',
  media: 'bg-yellow-500/15 text-yellow-400',
  baja: 'bg-red-500/15 text-red-400',
};

// Lo que dice el nombre va marcado; lo inferido no; lo nuevo solo si la confianza es alta
const toRow = (s: CompatSuggestion): Row => {
  const chosen = new Set(s.models.map(m => m.id));
  const chosenNew = new Set(s.confidence === 'alta' ? s.new_models : []);
  return { ...s, chosen, chosenNew, selected: s.confidence !== 'baja' && chosen.size + chosenNew.size > 0 };
};

interface Props {
  suggestions: CompatSuggestion[];
  onClose: () => void;
  onApplied: () => void;
}

// Revisión de las motos que propone la IA para las piezas que no tienen ninguna
export default function ModelSuggestPanel({ suggestions, onClose, onApplied }: Props) {
  const [rows, setRows] = useState<Row[]>(() => suggestions.map(toRow));
  const [applying, setApplying] = useState(false);

  const update = (id: string, fn: (r: Row) => Row) => setRows(prev => prev.map(r => (r.id === id ? fn(r) : r)));
  const toggle = (id: string, key: string, isNew: boolean) => update(id, r => {
    const set = new Set(isNew ? r.chosenNew : r.chosen);
    if (set.has(key)) set.delete(key); else set.add(key);
    const next = isNew ? { ...r, chosenNew: set } : { ...r, chosen: set };
    return { ...next, selected: next.chosen.size + next.chosenNew.size > 0 };
  });

  const selected = rows.filter(r => r.selected && r.chosen.size + r.chosenNew.size > 0);
  const newModels = [...new Set(selected.flatMap(r => [...r.chosenNew]))];

  const apply = async () => {
    if (!selected.length) return;
    if (newModels.length && !confirm(`Se van a crear estos modelos nuevos: ${newModels.join(', ')}. ¿Continuar?`)) return;
    try {
      setApplying(true);
      const res = await aiService.apply('impex', selected.map(r => ({ id: r.id, model_ids: [...r.chosen], new_models: [...r.chosenNew] })));
      toast.success(`${selected.length} piezas con moto asignada${res.models_created.length ? ` · ${res.models_created.length} modelos nuevos` : ''}`);
      onApplied();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error guardando las motos');
    } finally {
      setApplying(false);
    }
  };

  const chip = (r: Row, key: string, label: string, variant: 'direct' | 'inferred' | 'new') => {
    const active = variant === 'new' ? r.chosenNew.has(key) : r.chosen.has(key);
    const styles = {
      direct: active ? 'bg-kawa-green text-black border-kawa-green' : 'border-kawa-green/40 text-kawa-green/60',
      inferred: active ? 'bg-blue-500 text-white border-blue-500' : 'border-dashed border-blue-500/60 text-blue-300/70',
      new: active ? 'bg-purple-500 text-white border-purple-500' : 'border-dashed border-purple-500/60 text-purple-300/70',
    }[variant];
    return (
      <button
        key={`${variant}-${key}`}
        type="button"
        onClick={() => toggle(r.id, key, variant === 'new')}
        title={variant === 'new' ? 'No existe todavía: se crea al guardar' : variant === 'inferred' ? 'No sale en el nombre: la IA cree que comparte la pieza' : 'Sale en el nombre'}
        className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${styles}`}
      >
        {variant === 'new' && '+ '}{label}
      </button>
    );
  };

  return (
    <div className="bg-kawa-gray border border-blue-500/40 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-800">
        <div className="mr-auto">
          <h3 className="text-white font-bold flex items-center gap-2"><Bike size={16} className="text-blue-400" /> Motos propuestas</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="text-kawa-green">Verde</span>: sale en el nombre ·{' '}
            <span className="text-blue-300">Azul</span>: la IA cree que comparte la pieza (revísalo) ·{' '}
            <span className="text-purple-300">Morado</span>: moto nueva que se crea. Toca para marcar o desmarcar.
          </p>
        </div>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-3 py-2 flex items-center gap-1"><X size={14} /> Cancelar</button>
        <button
          onClick={apply}
          disabled={applying || !selected.length}
          className="flex items-center gap-2 bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-kawa-green-light disabled:opacity-50 text-sm"
        >
          {applying && <Loader2 size={14} className="animate-spin" />}
          Guardar {selected.length}
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-800">
        {rows.map(r => {
          const empty = !r.models.length && !r.inferred_models.length && !r.new_models.length;
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={r.selected}
                disabled={r.chosen.size + r.chosenNew.size === 0}
                onChange={() => update(r.id, x => ({ ...x, selected: !x.selected }))}
                className="w-4 h-4 accent-[#62BE1B]"
              />
              <div className="flex-1 min-w-[220px]">
                <p className="text-white">{r.name}</p>
                <p className="text-[11px] text-gray-500"><span className="font-mono">{r.code}</span>{r.reason && ` · ${r.reason}`}</p>
              </div>
              <div className="flex flex-wrap gap-1 max-w-[340px]">
                {r.models.map(m => chip(r, m.id, m.name, 'direct'))}
                {r.inferred_models.map(m => chip(r, m.id, m.name, 'inferred'))}
                {r.new_models.map(n => chip(r, n, n, 'new'))}
                {empty && <span className="text-gray-500 text-xs">Sin sugerencia: ponla tú en Editar</span>}
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${confidenceStyle[r.confidence]}`}>{r.confidence}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
