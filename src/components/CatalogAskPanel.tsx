import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Loader2, Search, Send, Sparkles, X, XCircle } from 'lucide-react';
import { aiService, type CatalogSuggestion } from '../services/aiService';

interface Props {
  partIds: string[];
  categoryId: string | null;
  categoryName: string | null;
  modelId: string | null;
  modelName: string | null;
  onSearchPart: (partNo: string) => void;
  onClose: () => void;
}

// Preguntas sobre la lista filtrada: la IA responde y los códigos que sugiera se verifican en Impex
export default function CatalogAskPanel({ partIds, categoryId, categoryName, modelId, modelName, onSearchPart, onClose }: Props) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ question: string; answer: string; suggestions: CatalogSuggestion[] } | null>(null);

  const what = categoryName ? categoryName.toLowerCase() : 'piezas';
  const forModel = modelName ? ` para la ${modelName}` : '';
  const presets = [
    `¿Qué ${what} me faltan${forModel} para tener el kit completo?`,
    `¿Alguna de estas piezas le sirve a otras motos que no tengo marcadas?`,
    `¿Hay precios de venta muy bajos o muy altos comparados con lo que cuestan?`,
    `¿Cuáles conviene tener siempre en stock y cuáles pedir bajo encargo?`,
  ];

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    try {
      setLoading(true);
      const data = await aiService.askCatalog(text, partIds, { category_id: categoryId, moto_model_id: modelId });
      setResult({ question: text, answer: data.answer, suggestions: data.suggestions });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'La IA no pudo responder');
    } finally {
      setLoading(false);
    }
  };

  const status = (s: CatalogSuggestion) => {
    if (s.already_saved) {
      const other = s.saved_as && s.saved_as.part_no.replace(/[^0-9A-Z]/gi, '') !== s.part_no.replace(/[^0-9A-Z]/gi, '');
      return (
        <span className="flex items-center gap-1 text-gray-400" title={s.saved_as?.name}>
          <CheckCircle2 size={13} /> {other ? `Ya la tienes como ${s.saved_as!.part_no}` : 'Ya la tienes guardada'}
        </span>
      );
    }
    if (!s.impex) return <span className="flex items-center gap-1 text-gray-500"><AlertTriangle size={13} /> No se pudo verificar</span>;
    if (!s.impex.found) return <span className="flex items-center gap-1 text-red-400"><XCircle size={13} /> No existe en Impex: la IA se equivocó</span>;
    if (s.impex.replaced_by) return <span className="flex items-center gap-1 text-yellow-400"><AlertTriangle size={13} /> Reemplazada por {s.impex.replaced_by}</span>;
    if (s.impex.discontinued) return <span className="flex items-center gap-1 text-red-400"><XCircle size={13} /> Descontinuada</span>;
    return (
      <span className="flex items-center gap-1 text-kawa-green">
        <CheckCircle2 size={13} /> Existe en Impex
        {s.impex.price_yen ? ` · ¥${s.impex.price_yen.toLocaleString('es-CO')}` : <span className="text-yellow-400"> · sin precio</span>}
      </span>
    );
  };

  return (
    <div className="bg-kawa-gray border border-purple-500/40 rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 p-4 border-b border-gray-800">
        <div className="mr-auto">
          <h3 className="text-white font-bold flex items-center gap-2"><Sparkles size={16} className="text-purple-400" /> Preguntarle a la IA</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Sobre las {partIds.length} piezas que estás viendo
            {(categoryName || modelName) && <> ({[categoryName, modelName].filter(Boolean).join(' · ')})</>}.
            Si te sugiere piezas, cada código se revisa en Impex antes de mostrártelo.
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1" title="Cerrar"><X size={18} /></button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => { setQuestion(p); ask(p); }}
              disabled={loading}
              className="text-left px-3 py-1.5 rounded-lg border border-gray-700 bg-[#1e1e1e] text-xs text-gray-200 hover:border-purple-400 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); ask(question); }} className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="O escribe tu pregunta: tengo estos empaques para la Z250SL, ¿cuál me falta?"
            className="flex-1 bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:border-purple-400 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="flex items-center gap-2 bg-purple-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-400 disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {loading ? 'Pensando...' : 'Preguntar'}
          </button>
        </form>

        {result && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-gray-500">"{result.question}"</p>
            <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed bg-[#161616] border border-gray-800 rounded-lg p-3">
              {result.answer || 'Sin respuesta.'}
            </div>

            {result.suggestions.length > 0 && (
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-[#161616] border-b border-gray-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Piezas sugeridas · verificadas en Impex</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Que exista en Impex no garantiza que sea de esa moto: compara con el nombre que da Impex antes de traerla.
                  </p>
                </div>
                <div className="divide-y divide-gray-800">
                  {result.suggestions.map(s => (
                    <div key={s.part_no} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                      <div className="flex-1 min-w-[220px]">
                        <p className="text-white">
                          <span className="font-mono text-gray-300 mr-2">{s.part_no}</span>{s.name}
                        </p>
                        <p className="text-[11px] text-gray-500">{s.reason}{s.impex?.name && ` · Impex: ${s.impex.name}`}</p>
                      </div>
                      <div className="text-xs">{status(s)}</div>
                      {s.impex?.found && !s.already_saved && (
                        <button
                          onClick={() => onSearchPart(s.impex?.replaced_by || s.part_no)}
                          className="flex items-center gap-1.5 bg-[#1e1e1e] border border-gray-700 text-white px-3 py-1.5 rounded-lg hover:border-kawa-green hover:text-kawa-green text-xs"
                        >
                          <Search size={13} /> Ver en Impex
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
