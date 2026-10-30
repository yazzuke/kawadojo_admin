import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Search, X, Plus, Check, Trash2, AlertTriangle, GitCompare } from 'lucide-react';
import { impexService } from '../services/Impex';
import type { SavedImpexPart, ImpexQuote } from '../types/impex';
import QuoteComparator, { type QuoteDraft } from './QuoteComparator';
import QuoteHistory from './QuoteHistory';
import OrderBuilder from './OrderBuilder';
import ImpexShippingPicker, { ShippingModeToggle } from './ImpexShippingPicker';
import {
  buildQuotePayload, computeShipment, formatCop, formatUsd, newDraftId, TAX_FREE_LIMIT_USD,
  type Carrier, type QuoteRates, type ShippingMode,
} from '../Utils/impexQuoteCalc';

interface CartItem extends SavedImpexPart {
  quantity: number;
}

type View = 'create' | 'builder' | 'compare' | 'list';

const DRAFTS_KEY = 'kawadojo.impex.quoteDrafts';

const inputClass =
  'w-full bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1.5 text-right text-white text-sm focus:border-kawa-green outline-none';

const QuotesTab = ({
  exchangeRate,
  usdExchangeRate
}: {
  exchangeRate: number | string;
  usdExchangeRate: number | string;
}) => {
  const [savedParts, setSavedParts] = useState<SavedImpexPart[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingUsd, setShippingUsd] = useState<number | string>('');
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<ImpexQuote[]>([]);
  const [view, setView] = useState<View>('create');
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Cotizaciones del comparador: se quedan en este navegador hasta que las guardes o las borres
  const [drafts, setDrafts] = useState<QuoteDraft[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* sin storage */ }
  }, [drafts]);

  const [carrier, setCarrier] = useState<Carrier>('DHL');
  const [shippingMode, setShippingMode] = useState<ShippingMode>('manual');
  const [shippingMethod, setShippingMethod] = useState<string | undefined>();
  const [customsTrm, setCustomsTrm] = useState<number | string>(4000);
  const [shippingTrm, setShippingTrm] = useState<number | string>(4000);
  const [piezasTrm, setPiezasTrm] = useState<number | string>(() => Math.round(Number(usdExchangeRate) * Number(exchangeRate)));
  const [searchPartTerm, setSearchPartTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [partsRes, quotesRes] = await Promise.all([
        impexService.getSavedParts(),
        impexService.getQuotes()
      ]);
      if (partsRes.success) setSavedParts(partsRes.data);
      if (quotesRes.success) setQuotes(quotesRes.data);
    } catch {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (part: SavedImpexPart) => {
    if (cart.find(c => c.id === part.id)) return;
    setCart([...cart, { ...part, quantity: 1 }]);
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const updateQuantity = (id: number, qty: number) => {
    if (qty < 1) return;
    setCart(cart.map(c => c.id === id ? { ...c, quantity: qty } : c));
  };

  const filteredSavedParts = savedParts.filter(part => {
    const term = searchPartTerm.toLowerCase();
    return (
      (part.name_es?.toLowerCase() || '').includes(term) ||
      (part.name_en?.toLowerCase() || '').includes(term) ||
      (part.name_ja?.toLowerCase() || '').includes(term) ||
      (part.part_no?.toLowerCase() || '').includes(term)
    );
  });

  // Cálculos
  const rates: QuoteRates = useMemo(() => ({
    piezasTrm: Number(piezasTrm) || Math.round(Number(usdExchangeRate) * Number(exchangeRate)),
    shippingTrm: Number(shippingTrm) || 4000,
    customsTrm: Number(customsTrm) || 4000,
  }), [piezasTrm, shippingTrm, customsTrm, usdExchangeRate, exchangeRate]);

  const cartLines = useMemo(() => cart.map(part => ({ part, quantity: part.quantity })), [cart]);
  const shippingVal = Number(shippingUsd) || 0;
  const calc = computeShipment(cartLines, shippingVal, carrier, rates);

  const handleSaveQuote = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    try {
      const payload = buildQuotePayload(cartLines, shippingVal, carrier, rates, Number(usdExchangeRate), calc);
      const res = await impexService.createQuote(payload);
      if (res.success) {
        toast.success('Cotización guardada');
        setCart([]);
        setShippingUsd('');
        fetchData();
        setView('list');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error guardando cotización');
    }
  };

  // Copia la cotización actual al comparador y deja el carrito listo para armar la siguiente
  const sendToComparator = () => {
    if (cart.length === 0) return;
    setDrafts(prev => [...prev, {
      id: newDraftId(),
      name: `Cotización ${prev.length + 1}`,
      carrier,
      shippingUsd: String(shippingUsd ?? ''),
      shippingMode,
      shippingMethod,
      items: cart.map(item => ({ partId: String(item.id), quantity: item.quantity })),
    }]);
    setCart([]);
    toast.success('Agregada al comparador. Arma la siguiente o ve a Comparar.');
  };

  const handleConvertQuote = async (id: string) => {
    try {
      setIsConverting(id);
      const res = await impexService.convertQuoteToBatch(id);
      if (res.success) {
        toast.success(`Lote creado con éxito: ${res.data.batch_number}`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error convirtiendo a lote');
    } finally {
      setIsConverting(null);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cotización del historial?')) return;
    try {
      setIsDeleting(id);
      const res = await impexService.deleteQuote(id);
      if (res.success) {
        toast.success('Cotización eliminada');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error eliminando cotización');
    } finally {
      setIsDeleting(null);
    }
  };

  // Abre una cotización guardada como borrador en el comparador para ajustarla
  const editQuoteInComparator = (quote: ImpexQuote) => {
    setDrafts(prev => [...prev, {
      id: newDraftId(),
      name: `${quote.quote_number} (editada)`,
      carrier: (quote.carrier as Carrier) || 'DHL',
      shippingUsd: String(quote.shipping_usd || ''),
      shippingMode: 'manual',
      items: quote.items.map(it => ({ partId: String(it.impex_part_id), quantity: it.quantity })),
    }]);
    setView('compare');
    toast.success(`${quote.quote_number} abierta en el comparador`);
  };

  if (loading) {
    return <div className="p-10 text-center text-kawa-green">Cargando...</div>;
  }

  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const tabs: Array<{ id: View; label: string }> = [
    { id: 'create', label: 'Nueva Cotización' },
    { id: 'builder', label: 'Armador US$ 200' },
    { id: 'compare', label: `Comparar (${drafts.length})` },
    { id: 'list', label: `Historial (${quotes.length})` },
  ];

  return (
    <div className="bg-kawa-gray rounded-xl border border-gray-800 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-800 bg-[#2a2a2a] flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${view === tab.id ? 'bg-kawa-green text-black' : 'text-gray-400 hover:bg-[#1e1e1e]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'create' && (
        <div className="p-4 md:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
          {/* Columna principal */}
          <div className="space-y-6 min-w-0">
            {/* Catálogo */}
            <section className="bg-[#161616] border border-gray-800 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white">Piezas disponibles <span className="text-gray-500 font-normal text-sm">({filteredSavedParts.length})</span></h3>
                <div className="relative sm:w-72">
                  <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={searchPartTerm}
                    onChange={e => setSearchPartTerm(e.target.value)}
                    className="bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg focus:border-kawa-green outline-none block w-full pl-8 pr-8 py-2"
                  />
                  {searchPartTerm && (
                    <button onClick={() => setSearchPartTerm('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-white">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2 p-3 max-h-[280px] overflow-y-auto">
                {filteredSavedParts.map(part => {
                  const inCart = !!cart.find(c => c.id === part.id);
                  return (
                    <button
                      key={part.id}
                      onClick={() => inCart ? removeFromCart(part.id) : addToCart(part)}
                      className={`flex items-center gap-3 text-left p-3 rounded-lg border transition-colors ${inCart ? 'border-kawa-green/50 bg-kawa-green/10' : 'border-gray-800 bg-[#1e1e1e] hover:border-gray-600'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm leading-tight truncate" title={part.name_es || part.name_en || ''}>
                          {part.name_es || part.name_en || part.name_ja || 'Sin nombre'}
                        </p>
                        <p className="text-gray-500 text-xs font-mono mt-1">{part.part_no}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-blue-400 font-mono text-xs">{formatUsd(part.price_usd || 0)}</p>
                        <span className={`inline-flex items-center justify-center w-6 h-6 mt-1 rounded ${inCart ? 'bg-kawa-green text-black' : 'bg-gray-800 text-white'}`}>
                          {inCart ? <Check size={14} /> : <Plus size={14} />}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {filteredSavedParts.length === 0 && <p className="text-gray-500 text-sm p-2">No hay piezas que coincidan.</p>}
              </div>
            </section>

            {/* Piezas en la cotización */}
            <section className="bg-[#161616] border border-gray-800 rounded-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white">
                  Piezas en la cotización <span className="text-gray-500 font-normal text-sm">({totalUnits} uds)</span>
                </h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-xs text-gray-400 hover:text-red-400">Vaciar</button>
                )}
              </div>
              {cart.length === 0 ? (
                <p className="text-gray-500 p-6 text-center text-sm">Toca una pieza de arriba para agregarla.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                        <th className="p-3 font-semibold">Pieza</th>
                        <th className="p-3 font-semibold text-center">Cant</th>
                        <th className="p-3 font-semibold text-right">US$ c/u</th>
                        <th className="p-3 font-semibold text-right">Venta c/u</th>
                        <th className="p-3 font-semibold text-right" title="Pieza + su parte de envío, impuestos y manejo">Costo puesto c/u</th>
                        <th className="p-3 font-semibold text-right">Utilidad c/u</th>
                        <th className="p-3 font-semibold text-right">Margen</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.lines.map(line => {
                        const item = line.part as CartItem;
                        return (
                          <tr key={item.id} className="border-t border-gray-800 hover:bg-[#1e1e1e]">
                            <td className="p-3 min-w-[180px]">
                              <p className="text-white font-semibold leading-tight">{item.name_es || item.name_en || item.name_ja || 'Sin nombre'}</p>
                              <p className="text-gray-500 text-xs font-mono mt-0.5">{item.part_no}</p>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="bg-gray-800 w-6 h-6 rounded text-white">−</button>
                                <span className="text-white w-6 text-center font-bold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="bg-gray-800 w-6 h-6 rounded text-white">+</button>
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono text-blue-400 whitespace-nowrap">{(item.price_usd || 0).toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-kawa-green whitespace-nowrap">{formatCop(item.kawadojo_price || 0)}</td>
                            <td className="p-3 text-right font-mono text-yellow-500 whitespace-nowrap" title={`Solo la pieza: ${formatCop(line.unitPieceCop)}`}>
                              {formatCop(line.unitLandedCop)}
                            </td>
                            <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${line.unitProfitCop >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>
                              {formatCop(line.unitProfitCop)}
                            </td>
                            <td className={`p-3 text-right font-bold whitespace-nowrap ${line.marginPct >= 0 ? 'text-gray-200' : 'text-red-400'}`}>
                              {line.marginPct.toFixed(0)}%
                            </td>
                            <td className="p-3 text-right">
                              <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-400" title="Quitar">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-800">
                    El costo puesto incluye la parte de envío, IVA, arancel y manejo que le toca a cada pieza según su valor.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Columna lateral */}
          <aside className="space-y-4 xl:sticky xl:top-6 h-fit">
            <section className="bg-[#161616] border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Parámetros</h3>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                <label className="space-y-1">
                  <span>TRM piezas (banco)</span>
                  <input type="number" value={piezasTrm} onChange={e => setPiezasTrm(e.target.value)} placeholder="3350" className={inputClass} />
                </label>
                <label className="space-y-1">
                  <span>Envío (USD){shippingMode === 'api' && ' · API'}</span>
                  <input
                    type="number"
                    value={shippingUsd}
                    onChange={e => setShippingUsd(e.target.value)}
                    readOnly={shippingMode === 'api'}
                    placeholder="0.00"
                    className={`${inputClass} ${shippingMode === 'api' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </label>
                <label className="space-y-1">
                  <span>TRM envío (banco)</span>
                  <input type="number" value={shippingTrm} onChange={e => setShippingTrm(e.target.value)} placeholder="4000" className={inputClass} />
                </label>
                <label className="space-y-1">
                  <span>TRM aduana</span>
                  <input type="number" value={customsTrm} onChange={e => setCustomsTrm(e.target.value)} placeholder="4000" className={inputClass} />
                </label>
                <label className="space-y-1 col-span-2">
                  <span>Transportadora</span>
                  <select value={carrier} onChange={e => setCarrier(e.target.value as Carrier)} className={inputClass}>
                    <option value="DHL">DHL</option>
                    <option value="FEDEX">FedEx</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
              </div>

              {/* Cómo se calcula el envío: a mano o con la calculadora de Impex */}
              <div className="mt-4 pt-3 border-t border-gray-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Envío Japón → Colombia</span>
                  <ShippingModeToggle mode={shippingMode} onChange={setShippingMode} />
                </div>
                {shippingMode === 'api' && (
                  <ImpexShippingPicker
                    lines={cartLines}
                    usdJpyRate={Number(usdExchangeRate)}
                    method={shippingMethod}
                    shippingUsd={String(shippingUsd)}
                    onChange={({ method, shippingUsd: usd, carrier: c }) => {
                      setShippingMethod(method);
                      setShippingUsd(usd);
                      setCarrier(c);
                    }}
                  />
                )}
              </div>
            </section>

            <section className="bg-[#161616] border border-gray-800 rounded-xl p-4 text-sm text-gray-300 space-y-2">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Costos</h3>
              <div className="flex justify-between">
                <span>Piezas ({formatUsd(calc.subtotalUsd)})</span>
                <span className="font-mono">{formatCop(calc.piezasCop)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío casillero</span>
                <span className="font-mono">{formatCop(calc.envioCop)}</span>
              </div>
              {calc.requiresTaxes && (
                <div className="flex justify-between text-red-300">
                  <span>Arancel (10%)</span>
                  <span className="font-mono">{formatCop(calc.arancelCop)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>IVA (19%)</span>
                <span className="font-mono">{formatCop(calc.ivaCop)}</span>
              </div>
              {calc.carrierFeesCop > 0 && (
                <div className="flex justify-between">
                  <span>Manejo {carrier}</span>
                  <span className="font-mono">{formatCop(calc.carrierFeesCop)}</span>
                </div>
              )}

              {/* Valor vs límite de arancel */}
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className={calc.requiresTaxes ? 'text-red-400 font-semibold' : 'text-gray-500'}>
                    {calc.requiresTaxes ? `Pasa US$ ${TAX_FREE_LIMIT_USD}: paga arancel` : `Debajo de US$ ${TAX_FREE_LIMIT_USD}: sin arancel`}
                  </span>
                  <span className="font-mono text-gray-400">{formatUsd(calc.subtotalUsd)}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${calc.requiresTaxes ? 'bg-red-500' : 'bg-kawa-green'}`}
                    style={{ width: `${Math.min(100, (calc.subtotalUsd / TAX_FREE_LIMIT_USD) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-3 border-t border-gray-800 text-white">
                <span className="font-bold">Total</span>
                <span className="text-right">
                  <span className="block text-xl font-bold text-kawa-green">{formatCop(calc.totalCop)}</span>
                  <span className="block text-xs text-gray-500">{formatUsd(calc.totalUsd)} · {totalUnits ? formatCop(calc.totalCop / totalUnits) : '$ 0'} / ud</span>
                </span>
              </div>
            </section>

            <section className="bg-[#161616] border border-gray-800 rounded-xl p-4 text-sm text-gray-300 space-y-2">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Proyección</h3>
              <div className="flex justify-between">
                <span>Venta estimada</span>
                <span className="font-mono text-kawa-green">{formatCop(calc.ventasCop)}</span>
              </div>
              <div className="flex justify-between">
                <span>Costo total</span>
                <span className="font-mono text-red-400">− {formatCop(calc.totalCop)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-gray-800">
                <span className="text-white font-bold">Utilidad</span>
                <span className={`text-xl font-bold ${calc.utilidadCop >= 0 ? 'text-kawa-green' : 'text-red-500'}`}>
                  {formatCop(calc.utilidadCop)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Margen</span>
                <span className={calc.margenPct >= 0 ? 'text-kawa-green' : 'text-red-500'}>{calc.margenPct.toFixed(1)}%</span>
              </div>

              {cart.length > 0 && calc.utilidadCop < 0 && (
                <p className="flex gap-2 text-xs text-red-300 bg-red-900/20 border border-red-900/50 rounded p-2 mt-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  Con estas cantidades el manejo e impuestos se comen la ganancia. Agrega más piezas al envío o júntalo con otro pedido.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-3">
                <button
                  onClick={sendToComparator}
                  disabled={cart.length === 0}
                  title="Agrega esta cotización al comparador para ponerla al lado de otras"
                  className="flex items-center justify-center gap-1.5 bg-[#1e1e1e] border border-gray-700 text-white text-sm py-2.5 rounded-lg hover:border-kawa-green hover:text-kawa-green disabled:opacity-50"
                >
                  <GitCompare size={15} /> Al comparador
                </button>
                <button
                  onClick={handleSaveQuote}
                  disabled={cart.length === 0}
                  className="bg-kawa-green text-black font-bold text-sm py-2.5 rounded-lg hover:bg-kawa-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Guardar
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      {view === 'builder' && (
        <div className="p-4 md:p-6">
          <OrderBuilder
            parts={savedParts}
            quotes={quotes}
            rates={rates}
            usdJpyRate={Number(usdExchangeRate)}
            carrier={carrier}
            onSendToCart={lines => {
              if (cart.length && !confirm('Esto reemplaza las piezas que tienes en Nueva Cotización. ¿Continuar?')) return;
              setCart(lines.map(l => ({ ...l.part, quantity: l.quantity })));
              setShippingMode('api');
              setView('create');
              toast.success('Pedido cargado. El envío se calcula con la API de Impex.');
            }}
            onSendToComparator={(lines, name) => {
              setDrafts(prev => [...prev, {
                id: newDraftId(),
                name,
                carrier,
                shippingUsd: '',
                shippingMode: 'api',
                items: lines.map(l => ({ partId: String(l.part.id), quantity: l.quantity })),
              }]);
              toast.success('Agregado al comparador');
            }}
          />
        </div>
      )}

      {view === 'compare' && (
        <div className="p-4 md:p-6">
          <QuoteComparator
            drafts={drafts}
            setDrafts={setDrafts}
            parts={savedParts}
            rates={rates}
            usdJpyRate={Number(usdExchangeRate)}
            defaultCarrier={carrier}
            onSaved={fetchData}
          />
        </div>
      )}

      {view === 'list' && (
        <div className="p-4 md:p-6">
          <QuoteHistory
            quotes={quotes}
            isDeleting={isDeleting}
            isConverting={isConverting}
            onDelete={handleDeleteQuote}
            onConvert={handleConvertQuote}
            onEdit={editQuoteInComparator}
          />
        </div>
      )}
    </div>
  );
};

export default QuotesTab;
