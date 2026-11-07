import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Layers, Loader2 } from 'lucide-react';
import { impexService } from '../services/Impex';
import { apiError } from '../services/productMasterService';
import type { MasterSuggestion } from '../types/impex';

interface Props {
  refreshKey?: number;
  onLinked: () => void;
}

const REASON = {
  codigo: 'Mismo código',
  producto_base: 'Por su producto base',
} as const;

// Piezas de Impex sin ficha que ya tienen una que les corresponde: se revisan y se vinculan de una vez
export default function MasterLinkBanner({ refreshKey, onLinked }: Props) {
  const [items, setItems] = useState<Array<MasterSuggestion & { selected: boolean }>>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    impexService.masterSuggestions()
      .then(r => setItems(r.suggestions.map(s => ({ ...s, selected: true }))))
      .catch(() => setItems([]));
  }, [refreshKey]);

  if (!items.length) return null;
  const chosen = items.filter(i => i.selected);

  const link = async () => {
    try {
      setSaving(true);
      const { updated } = await impexService.linkMasters(chosen.map(i => ({ part_id: i.part_id, master_id: i.master.id })));
      toast.success(`${updated} ${updated === 1 ? 'pieza vinculada' : 'piezas vinculadas'} a su ficha`);
      setItems(prev => prev.filter(i => !i.selected));
      onLinked();
    } catch (err) {
      toast.error(apiError(err, 'No se pudieron vincular'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-kawa-gray border border-kawa-green/40 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 mr-auto text-left">
          {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          <Layers size={16} className="text-kawa-green" />
          <span className="text-white font-semibold text-sm">
            {items.length} {items.length === 1 ? 'pieza tiene' : 'piezas tienen'} una ficha que le corresponde
          </span>
          <span className="text-xs text-gray-500 hidden sm:inline">Vincúlalas para que el lote salga con nombre, descripción y fotos de la ficha</span>
        </button>
        <button
          onClick={link}
          disabled={saving || !chosen.length}
          className="flex items-center gap-2 bg-kawa-green text-black font-bold px-4 py-1.5 rounded-lg hover:bg-kawa-green-light disabled:opacity-50 text-sm"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Vincular {chosen.length}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-800 divide-y divide-gray-800 max-h-72 overflow-y-auto">
          {items.map(i => (
            <label key={i.part_id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={i.selected}
                onChange={() => setItems(prev => prev.map(x => (x.part_id === i.part_id ? { ...x, selected: !x.selected } : x)))}
                className="w-4 h-4 accent-[#62BE1B]"
              />
              <span className="text-gray-200 min-w-0 flex-1">
                {i.part_name || 'Sin nombre'} <span className="text-gray-500 font-mono text-xs">{i.part_no}</span>
              </span>
              <span className="text-kawa-green text-xs">→ {i.master.name}</span>
              <span className="text-[11px] text-gray-500">{REASON[i.reason]}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
