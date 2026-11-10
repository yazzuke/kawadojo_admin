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

const formatCop = (n: number) => `${Math.round(n).toLocaleString('es-CO')}`;

type CostKey = 'purchase_total_cost' | 'shipping_cost' | 'customs_fees' | 'additional_fees';
const COST_FIELDS: Array<{ key: CostKey; label: string; hint: string }> = [
  { key: 'purchase_total_cost', label: 'Compra', hint: 'Lo que cobró el banco' },
  { key: 'shipping_cost', label: 'Envío', hint: 'Flete desde Japón' },
  { key: 'customs_fees', label: 'Aduana', hint: 'IVA + arancel' },
  { key: 'additional_fees', label: 'Manejo', hint: 'Lo que cobró la transportadora' },
];

// Reparte la compra real entre las unidades en proporción a su costo (igual que el servidor)
const scaleCosts = (costs: number[], purchase: number) => {
  const planned = costs.reduce((s, c) => s + c, 0);
  if (!costs.length || planned <= 0 || planned === purchase) return costs;
  const out = costs.map(c => Math.round(c * (purchase / planned)));
  out[out.length - 1] += purchase - out.reduce((s, c) => s + c, 0);
  return out;
};

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
  // Valores reales que escribes (texto para poder dejarlos vacíos mientras editas)
  const [real, setReal] = useState<Record<CostKey, string>>({ purchase_total_cost: '', shipping_cost: '', customs_fees: '', additional_fees: '' });

  useEffect(() => {
    impexService.previewBatch(quoteId)
      .then(p => {
        setPreview(p);
        setReal({
          purchase_total_cost: String(p.costs.purchase_total_cost),
          shipping_cost: String(p.costs.shipping_cost),
          customs_fees: String(p.costs.customs_fees),
          additional_fees: String(p.costs.additional_fees),
        });
      })
      .catch(err => { toast.error(apiError(err, 'No se pudo armar la vista previa')); onClose(); })
      .finally(() => setLoading(false));
  }, [quoteId, onClose]);

  const convert = async () => {
    if (!preview) return;
    try {
      setConverting(true);
      const res = await impexService.convertQuoteToBatch(quoteId, realCosts);
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

  const value = (k: CostKey) => {
    const n = Number(real[k].replace(/[^0-9]/g, ''));
    return real[k].trim() && Number.isFinite(n) ? n : (preview?.costs[k] ?? 0);
  };
  const realCosts = {
    purchase_total_cost: value('purchase_total_cost'),
    shipping_cost: value('shipping_cost'),
    customs_fees: value('customs_fees'),
    additional_fees: value('additional_fees'),
  };
  const realTotal = realCosts.purchase_total_cost + realCosts.shipping_cost + realCosts.customs_fees + realCosts.additional_fees;
  const unitCosts = scaleCosts(products.map(p => p.cost), realCosts.purchase_total_cost);
  // Cuánto queda cada unidad puesta en Colombia (compra + su parte de envío, aduana y manejo)
  const landedFactor = realCosts.purchase_total_cost > 0 ? realTotal / realCosts.purchase_total_cost : 1;
  const totalDiff = preview ? realTotal - preview.costs.total_cost : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-kawa-gray border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-800">
          <div className="mr-auto">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><PackagePlus size={20} className="text-kawa-green" /> Así quedaría el lote</h2>
            {preview && (
              <p className="text-sm text-gray-400 mt-0.5">
                {preview.quote_number} → <span className="text-white font-semibold">{preview.batch_number}</span> · {products.length} productos · costo total {formatCop(realTotal)}
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
                    <th className="px-4 py-2 text-right">Costo · puesto aquí</th>
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
                      <td className="px-4 py-2 text-right font-mono">
                        <span className="text-gray-300">{formatCop(unitCosts[i])}</span>
                        {unitCosts[i] !== p.cost && <span className="block text-[10px] text-gray-600 line-through">{formatCop(p.cost)}</span>}
                        <span className="block text-[11px] text-kawa-green/80">{formatCop(unitCosts[i] * landedFactor)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 pt-4 border-t border-gray-800 space-y-2">
              <p className="text-xs text-gray-400">
                Corrige con lo que de verdad pagaste. La compra se reparte entre las unidades, así que el costo de cada pieza queda con lo que cobró el banco.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {COST_FIELDS.map(f => {
                  const est = preview.costs[f.key];
                  const diff = realCosts[f.key] - est;
                  return (
                    <label key={f.key} className="block">
                      <span className="block text-[11px] uppercase tracking-wide text-gray-500">{f.label} <span className="normal-case tracking-normal text-gray-600">· {f.hint}</span></span>
                      <input
                        inputMode="numeric"
                        value={real[f.key]}
                        onChange={e => setReal(r => ({ ...r, [f.key]: e.target.value }))}
                        className={`w-full mt-1 bg-kawa-black border rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-kawa-green ${diff ? 'border-yellow-500/50' : 'border-gray-800'}`}
                      />
                      <span className="block text-[11px] text-gray-500 mt-0.5">
                        Cotización {formatCop(est)}
                        {diff !== 0 && <span className={diff > 0 ? 'text-red-300' : 'text-kawa-green'}> · {diff > 0 ? '+' : '−'}{formatCop(Math.abs(diff))}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <p className="text-xs text-gray-500 mr-auto max-w-xl">
                Quedan "En camino". Total {formatCop(realTotal)}
                {totalDiff !== 0 && <span className={totalDiff > 0 ? 'text-red-300' : 'text-kawa-green'}> ({totalDiff > 0 ? '+' : '−'}{formatCop(Math.abs(totalDiff))} vs la cotización)</span>}
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
