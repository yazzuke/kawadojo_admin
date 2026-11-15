import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, MessageCircle, ShoppingCart, X } from 'lucide-react';
import { apiError } from '../services/productMasterService';
import {
  EVENT_LABELS, SOURCE_LABELS, analyticsService, customerWhatsapp, followUpMessage, formatCop, formatWhen, pageLabel,
  type CustomerActivity,
} from '../services/analyticsService';

const STORE = 'https://kawadojo.com';

interface Props {
  userId: string | null;
  onClose: () => void;
}

// Lo que ha hecho un cliente en kawadojo.com (solo cuando entra con su cuenta)
export default function CustomerActivityModal({ userId, onClose }: Props) {
  // Se guarda junto con el id: al abrir otro cliente no se muestra lo del anterior
  const [result, setResult] = useState<{ id: string; data?: CustomerActivity; error?: string } | null>(null);
  const current = result && result.id === userId ? result : null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    analyticsService
      .customer(userId)
      .then((d) => alive && setResult({ id: userId, data: d }))
      .catch((err) => alive && setResult({ id: userId, error: apiError(err, 'No se pudo leer la actividad') }));
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userId, onClose]);

  if (!userId) return null;

  const top = data ? (data.cart[0] ? { ...data.cart[0], in_cart: true } : data.products[0]) : undefined;
  const wa = data ? customerWhatsapp(data.user.phone, followUpMessage(data.user.name, top)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-white">Actividad de {data?.user.name ?? 'cliente'}</h2>
            {data && (
              <p className="text-xs text-gray-400 mt-1">
                {data.user.phone ?? 'Sin teléfono'}{data.user.moto ? ` · ${data.user.moto}` : ''} · {data.user.orders_count} {data.user.orders_count === 1 ? 'orden' : 'órdenes'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-semibold bg-[#25D366] text-black px-3 py-1.5 rounded-lg hover:brightness-110">
                <MessageCircle size={15} /> Escribirle
              </a>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1" aria-label="Cerrar"><X size={22} /></button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {!data && !error && (
            <div className="flex items-center gap-2 text-gray-400 py-10 justify-center"><Loader2 className="animate-spin" size={18} /> Cargando...</div>
          )}

          {data && data.summary.visits === 0 && data.cart.length === 0 && (
            <p className="text-sm text-gray-400 bg-black/30 border border-gray-800 rounded-lg p-4">
              Todavía no hay actividad. Solo se ve lo que hace cuando entra a kawadojo.com con su cuenta, y se empezó a
              contar en noviembre de 2026.
            </p>
          )}

          {data && (data.summary.visits > 0 || data.cart.length > 0) && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['Visitas', data.summary.visits],
                  ['Piezas que abrió', data.summary.product_views],
                  ['Clics a WhatsApp', data.summary.whatsapp_clicks],
                  ['Al carrito', data.summary.add_to_cart],
                ].map(([label, value]) => (
                  <div key={label} className="bg-black/30 border border-gray-800 rounded-lg p-3">
                    <p className="text-[11px] text-gray-400">{label}</p>
                    <p className="text-lg font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 -mt-3">
                Última visita: {formatWhen(data.summary.last_seen)}{data.summary.first_seen && data.summary.first_seen !== data.summary.last_seen ? ` · primera: ${formatWhen(data.summary.first_seen)}` : ''}
              </p>

              {data.cart.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><ShoppingCart size={15} className="text-kawa-green" /> Tiene en el carrito</h3>
                  <ul className="space-y-1.5">
                    {data.cart.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3 text-sm bg-kawa-green/10 border border-kawa-green/30 rounded-lg px-3 py-2">
                        <span className="text-gray-100">{p.quantity > 1 ? `${p.quantity} × ` : ''}{p.name}{p.in_stock ? '' : <span className="text-xs text-amber-400"> · agotada</span>}</span>
                        <span className="text-gray-300 whitespace-nowrap">{p.price ? formatCop(p.price) : ''}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.products.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-white mb-2">Piezas que le interesaron</h3>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500">
                      <tr>
                        <th className="text-left font-normal py-1">Pieza</th>
                        <th className="text-right font-normal py-1 px-2">Veces</th>
                        <th className="text-right font-normal py-1 px-2">WhatsApp</th>
                        <th className="text-right font-normal py-1">Carrito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => (
                        <tr key={p.id} className="border-t border-gray-800/60">
                          <td className="py-1.5 pr-2">
                            {p.path ? (
                              <a href={`${STORE}${p.path}`} target="_blank" rel="noopener noreferrer" className="text-gray-100 hover:text-kawa-green inline-flex items-center gap-1">
                                {p.name} <ExternalLink size={11} className="text-gray-500" />
                              </a>
                            ) : <span className="text-gray-100">{p.name}</span>}
                            <span className="ml-2 text-xs text-gray-500">{p.price ? formatCop(p.price) : ''}{p.in_stock ? '' : ' · agotada'}</span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-white">{p.views}</td>
                          <td className="py-1.5 px-2 text-right text-gray-300">{p.whatsapp_clicks || '—'}</td>
                          <td className="py-1.5 text-right text-gray-300">{p.add_to_cart || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {data.searches.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-white mb-2">Lo que buscó</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.searches.map((s) => (
                      <span key={s.query} className="text-xs bg-black/40 border border-gray-700 text-gray-200 rounded-full px-2.5 py-1">
                        {s.query}{s.count > 1 ? ` (${s.count})` : ''}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {data.visits.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-white mb-2">Visitas, paso a paso</h3>
                  <div className="space-y-3">
                    {data.visits.map((v) => (
                      <div key={v.start} className="border border-gray-800 rounded-lg">
                        <p className="px-3 py-2 text-xs text-gray-400 border-b border-gray-800 bg-black/20">
                          {formatWhen(v.start)} · llegó por {SOURCE_LABELS[v.source] ?? v.source} · {v.device === 'mobile' ? 'celular' : v.device === 'desktop' ? 'computador' : 'aparato sin dato'}
                        </p>
                        <ol className="px-3 py-2 space-y-1">
                          {v.events.map((e, i) => (
                            <li key={`${e.at}-${i}`} className="flex gap-3 text-sm">
                              <span className="text-xs text-gray-500 w-16 shrink-0 pt-0.5">
                                {new Date(e.at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                              </span>
                              <span className={e.type === 'page_view' ? 'text-gray-400' : e.type === 'product_view' ? 'text-gray-100' : 'text-kawa-green font-medium'}>
                                {EVENT_LABELS[e.type] ?? e.type}{' '}
                                {e.type === 'search' ? `"${e.query}"` : e.product ?? (e.type === 'page_view' ? pageLabel(e.path) : '')}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
