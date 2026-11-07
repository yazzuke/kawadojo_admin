import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles, X, XCircle } from 'lucide-react';
import { apiError, productMasterService, type AiDescription } from '../services/productMasterService';

interface Props {
  name: string;
  oemCode: string;
  categoryId: string;
  modelIds: string[];
  conditions: { nuevo: number; usado: number };
  currentDescriptions: string[];
  onUse: (description: string, fullDescription: string | null) => void;
}

// La IA escribe la descripción de la ficha con el nombre, el código OEM (verificado en Impex) y las motos
export default function AiDescriptionBox({ name, oemCode, categoryId, modelIds, conditions, currentDescriptions, onUse }: Props) {
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiDescription | null>(null);

  const generate = async () => {
    if (!name.trim()) { toast.error('Primero ponle nombre a la ficha'); return; }
    try {
      setLoading(true);
      const data = await productMasterService.aiDescription({
        name,
        oem_code: oemCode || null,
        category_id: categoryId || null,
        model_ids: modelIds,
        conditions,
        current_descriptions: currentDescriptions,
        extra: extra || null,
      });
      setResult(data);
    } catch (err) {
      toast.error(apiError(err, 'La IA no pudo escribir la descripción'));
    } finally {
      setLoading(false);
    }
  };

  const use = (withFull: boolean) => {
    if (!result) return;
    onUse(result.description, withFull ? result.full_description : null);
    setResult(null);
    toast.success('Descripción puesta en la ficha. Revísala antes de guardar.');
  };

  const impexStatus = () => {
    if (!oemCode) return <span className="text-gray-500">Sin código OEM: la IA solo usó el nombre y las motos</span>;
    const i = result?.impex;
    if (!i) return <span className="flex items-center gap-1 text-gray-500"><AlertTriangle size={12} /> No se pudo verificar en Impex</span>;
    if (!i.found) return <span className="flex items-center gap-1 text-red-400"><XCircle size={12} /> Impex no encontró {oemCode}</span>;
    return (
      <span className="flex items-center gap-1 text-kawa-green">
        <CheckCircle2 size={12} /> {oemCode} en Impex: "{i.name}"{i.replaced_by ? ` · reemplazado por ${i.replaced_by}` : ''}
      </span>
    );
  };

  return (
    <div className="border border-purple-500/30 bg-purple-500/[0.04] rounded-lg p-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={extra}
          onChange={e => setExtra(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); generate(); } }}
          placeholder='Qué debe decir (opcional): "marca Mitsuba, probado en banco"'
          className="flex-1 min-w-[200px] bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:border-purple-400 outline-none"
        />
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-400 disabled:opacity-50 text-sm"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : result ? <RefreshCw size={15} /> : <Sparkles size={15} />}
          {loading ? 'Escribiendo...' : result ? 'Otra versión' : 'Escribir con IA'}
        </button>
      </div>
      {!result && (
        <p className="text-[11px] text-gray-500">Usa el nombre, el código OEM (lo revisa en Impex), la categoría, las motos y lo que ya está escrito. No guarda nada hasta que le des "Crear/Guardar ficha".</p>
      )}

      {result && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-start gap-2 text-[11px]">
            <div className="flex-1">{impexStatus()}</div>
            <button type="button" onClick={() => setResult(null)} className="text-gray-400 hover:text-white" title="Descartar"><X size={14} /></button>
          </div>
          {result.warnings.length > 0 && (
            <ul className="space-y-1">
              {result.warnings.map(w => (
                <li key={w} className="flex gap-1.5 text-[11px] text-yellow-300"><AlertTriangle size={12} className="shrink-0 mt-0.5" />{w}</li>
              ))}
            </ul>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Corta (tarjeta)</p>
            <p className="text-sm text-white bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2">{result.description}</p>
          </div>
          {result.full_description && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Larga (página del producto)</p>
              <p className="text-sm text-gray-200 bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2 whitespace-pre-line max-h-64 overflow-y-auto">{result.full_description}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={() => use(false)} className="px-3 py-1.5 rounded-lg border border-gray-700 text-sm text-gray-200 hover:border-kawa-green hover:text-kawa-green">
              Usar solo la corta
            </button>
            <button type="button" onClick={() => use(true)} className="px-3 py-1.5 rounded-lg bg-kawa-green text-black font-bold text-sm hover:bg-kawa-green-light">
              Usar las dos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
