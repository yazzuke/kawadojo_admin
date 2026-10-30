import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { impexService } from '../services/Impex';
import type { ImpexShippingOption } from '../types/impex';
import { carrierFromMethod, formatUsd, packageInfo, type Carrier, type QuoteLine, type ShippingMode } from '../Utils/impexQuoteCalc';

// Selector Manual / API Impex para el envío
export function ShippingModeToggle({ mode, onChange }: { mode: ShippingMode; onChange: (mode: ShippingMode) => void }) {
  return (
    <div className="inline-flex rounded-md border border-gray-700 overflow-hidden text-[11px] font-semibold">
      {(['manual', 'api'] as const).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`px-2.5 py-1 transition-colors ${mode === m ? 'bg-kawa-green text-black' : 'bg-[#111] text-gray-400 hover:text-white'}`}
        >
          {m === 'manual' ? 'Manual' : 'API Impex'}
        </button>
      ))}
    </div>
  );
}

interface Props {
  lines: QuoteLine[];
  usdJpyRate: number;
  method?: string;
  shippingUsd: string;
  onChange: (value: { method: string; shippingUsd: string; carrier: Carrier }) => void;
  compact?: boolean;
}

// Pide a la API de Impex las opciones de envío Japón → Colombia según peso y valor del paquete
export default function ImpexShippingPicker({ lines, usdJpyRate, method, shippingUsd, onChange, compact }: Props) {
  const { weightKg, priceJpy, missingWeight } = packageInfo(lines);
  const [options, setOptions] = useState<ImpexShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toUsd = (jpy: number) => (usdJpyRate > 0 ? jpy / usdJpyRate : 0);

  useEffect(() => {
    if (weightKg <= 0) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await impexService.calcShipping(weightKg, priceJpy);
        if (!cancelled && res.success) setOptions(res.data);
      } catch {
        if (!cancelled) setError('No se pudo calcular el envío con Impex');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [weightKg, priceJpy]);

  // Mantiene el envío sincronizado con la opción elegida (o la más barata) cuando cambian las piezas
  useEffect(() => {
    if (!options.length) return;
    const chosen = options.find(o => o.name === method) || options[0];
    const usd = toUsd(chosen.shipping_jpy).toFixed(2);
    if (chosen.name !== method || usd !== shippingUsd) {
      onChange({ method: chosen.name, shippingUsd: usd, carrier: carrierFromMethod(chosen.name) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, method, shippingUsd, usdJpyRate]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Peso {weightKg.toFixed(2)} kg · declarado ¥{Math.round(priceJpy).toLocaleString('es-CO')}</span>
        {loading && <Loader2 size={14} className="animate-spin text-kawa-green" />}
      </div>

      {missingWeight.length > 0 && (
        <p className="flex gap-1.5 text-[11px] text-yellow-400">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          Sin peso guardado: {missingWeight.join(', ')}. El envío puede salir más barato de lo real.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {weightKg <= 0 && !lines.length && <p className="text-xs text-gray-500">Agrega piezas para calcular el envío.</p>}

      {options.length > 0 && (
        <div className={`grid gap-1.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-1'}`}>
          {options.map(o => {
            const selected = o.name === method;
            return (
              <button
                key={o.name}
                type="button"
                onClick={() => onChange({ method: o.name, shippingUsd: toUsd(o.shipping_jpy).toFixed(2), carrier: carrierFromMethod(o.name) })}
                className={`flex justify-between items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors ${
                  selected ? 'border-kawa-green bg-kawa-green/10 text-white' : 'border-gray-700 bg-[#111] text-gray-300 hover:border-gray-500'
                }`}
              >
                <span className="font-semibold">{o.name}</span>
                <span className="font-mono">
                  ¥{o.shipping_jpy.toLocaleString('es-CO')} · <span className="text-blue-400">{formatUsd(toUsd(o.shipping_jpy))}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
