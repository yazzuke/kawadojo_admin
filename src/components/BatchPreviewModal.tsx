import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ImageOff, Layers, Loader2, PackagePlus, X } from 'lucide-react';
import { impexService, type BatchPreview } from '../services/Impex';
import { apiError } from '../services/productMasterService';

interface Props {
  quoteId: string;
  onClose: () => void;
  onConverted: (batchNumber: string) => void;
}

const formatCop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

const TEMPLATE = {
  ficha: { label: 'Ficha', cls: 'bg-kawa-green/15 text-kawa-green', hint: 'Nombre, descripción, fotos y tag salen de la ficha' },
  producto: { label: 'Producto base', cls: 'bg-blue-500/15 text-blue-300', hint: 'Sale del producto vinculado en Impex' },
  impex: { label: 'Solo Impex', cls: 'bg-yellow-500/15 text-yellow-300', hint: 'Sin ficha: queda con el nombre de Impex y sin fotos' },
} as const;

// Muestra qué productos va a crear el lote antes de crearlo; solo se guarda al confirmar
export default function BatchPreviewModal({ quoteId, onClose, onConverted }: Props) {
  const [preview, setPreview] = useState<BatchPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    impexService.previewBatch(quoteId)
      .then(setPreview)
      .catch(err => { toast.error(apiError(err, 'No se pudo armar la vista previa')); onClose(); })
      .finally(() => setLoading(false));
  }, [quoteId, onClose]);

  const convert = async () => {
    if (!preview) return;
    try {
      setConverting(true);
      const res = await impexService.convertQuoteToBatch(quoteId);
      toast.success(`Lote ${res.data.batch_number} creado con ${res.data.products_created} productos`);
      onConverted(res.data.batch_number);
    } catch (err) {
      toast.error(apiError(err, 'No se pudo crear el lote'));
    } finally {
      setConverting(false);
    }
  };

  const products = preview?.products ?? [];
  const counts = { ficha: 0, producto: 0, impex: 0 };
  products.forEach(p => { counts[p.template]++; });
  const withWarnings = products.filter(p => p.warnings.length).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-kawa-gray border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-800">
          <div className="mr-auto">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><PackagePlus size={20} className="text-kawa-green" /> Así quedaría el lote</h2>
            {preview && (
              <p className="text-sm text-gray-400 mt-0.5">
                {preview.quote_number} → <span className="text-white font-semibold">{preview.batch_number}</span> · {products.length} productos · costo total {formatCop(preview.costs.total_cost)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        {loading || !preview ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-kawa-green" /></div>
        ) : (
          <>
            <div className="px-5 py-3 space-y-2 border-b border-gray-800">
              {preview.already_converted && (
                <p className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle size={15} /> Esta cotización ya se convirtió{preview.existing_batch ? ` en el lote ${preview.existing_batch}` : ''}. No se puede convertir otra vez.
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {(Object.keys(TEMPLATE) as Array<keyof typeof TEMPLATE>).filter(k => counts[k]).map(k => (
                  <span key={k} title={TEMPLATE[k].hint} className={`px-2 py-0.5 rounded font-semibold ${TEMPLATE[k].cls}`}>{counts[k]} con {TEMPLATE[k].label.toLowerCase()}</span>
                ))}
                {withWarnings > 0 && <span className="px-2 py-0.5 rounded font-semibold bg-orange-500/15 text-orange-300">{withWarnings} para revisar</span>}
              </div>
              {counts.impex > 0 && (
                <p className="text-[11px] text-gray-500">
                  Las piezas "Solo Impex" no tienen ficha. Vincúlalas a una ficha en Impex para que salgan con su nombre, descripción y fotos.
                </p>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-kawa-gray">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-800">
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-2 py-2">Viene de</th>
                    <th className="px-2 py-2">Categoría · motos</th>
                    <th className="px-2 py-2 text-right">Precio</th>
                    <th className="px-4 py-2 text-right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={i} className="border-b border-gray-800/60 align-top">
                      <td className="px-4 py-2">
                        <div className="flex items-start gap-2">
                          {p.photos[0]
                            ? <img src={p.photos[0].url} alt="" className="w-9 h-9 rounded object-cover bg-gray-800 shrink-0" />
                            : <div className="w-9 h-9 rounded bg-gray-800 flex items-center justify-center shrink-0"><ImageOff size={13} className="text-gray-600" /></div>}
                          <div className="min-w-0">
                            <p className="text-white">{p.name}</p>
                            <p className="text-[11px] text-gray-500 font-mono">{p.oem_code || 'sin código'}{p.photos.length > 1 && <span className="font-sans"> · {p.photos.length} fotos</span>}</p>
                            {p.warnings.map(w => (
                              <p key={w} className="text-[11px] text-orange-300 flex items-center gap-1"><AlertTriangle size={10} className="shrink-0" /> {w}</p>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span title={TEMPLATE[p.template].hint} className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${TEMPLATE[p.template].cls}`}>{TEMPLATE[p.template].label}</span>
                        {p.master_name && <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><Layers size={10} /> {p.master_name}</p>}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-300">
                        {p.category_name || <span className="text-gray-600">—</span>}
                        <p className="text-[11px] text-gray-500">{p.models.map(m => m.name).join(', ') || '—'}</p>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-gray-200">{formatCop(p.price)}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-400">{formatCop(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 mr-auto max-w-xl">
                Quedan "En camino". Compra {formatCop(preview.costs.purchase_total_cost)} · envío {formatCop(preview.costs.shipping_cost)} · aduana {formatCop(preview.costs.customs_fees)}
                {preview.costs.additional_fees > 0 && ` · manejo ${formatCop(preview.costs.additional_fees)}`}
              </p>
              <button onClick={onClose} className="text-sm text-gray-300 hover:text-white px-4 py-2 border border-gray-700 rounded-lg">Cancelar</button>
              <button
                onClick={convert}
                disabled={converting || preview.already_converted}
                className="flex items-center gap-2 bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-kawa-green-light text-sm disabled:opacity-40"
              >
                {converting ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                Crear lote con {products.length} productos
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
