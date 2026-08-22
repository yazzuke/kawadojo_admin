import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { impexService } from '../services/Impex';
import type { SavedImpexPart, ImpexQuote } from '../types/impex';

interface CartItem extends SavedImpexPart {
  quantity: number;
}

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
  const [view, setView] = useState<'create' | 'list'>('create');
  
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
    } catch (err: any) {
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

  const [carrier, setCarrier] = useState<'DHL' | 'FEDEX' | 'OTHER'>('DHL');
  const [customsTrm, setCustomsTrm] = useState<number | string>(4000);
  const [shippingTrm, setShippingTrm] = useState<number | string>(4000);

  // Calculations
  const subtotalYen = cart.reduce((sum, item) => sum + ((item.price_yen || 0) * item.quantity), 0);
  const subtotalUsd = cart.reduce((sum, item) => sum + ((item.price_usd || 0) * item.quantity), 0);
  const shippingVal = Number(shippingUsd) || 0;
  
  // Impex Total (Japón)
  const rateUsdCop = Number(usdExchangeRate) * Number(exchangeRate);
  const piezasCop = Math.round(subtotalUsd * rateUsdCop);
  
  // Envío Casillero
  const envioCop = Math.round(shippingVal * (Number(shippingTrm) || 4000));
  
  // Total Pagado a Impex/Casillero
  const totalImpexCop = piezasCop + envioCop;

  // Aduana / Transportadora (Destino)
  const seguroUsd = subtotalUsd * 0.005; // Seguro estimado 0.5%
  const cifUsd = subtotalUsd + shippingVal + seguroUsd;
  const trm = Number(customsTrm) || 4000;
  const cifCop = Math.round(cifUsd * trm);

  const requiresTaxes = subtotalUsd > 200;
  let arancelCop = 0;
  let ivaCop = 0;

  if (requiresTaxes) {
    arancelCop = Math.round(cifCop * 0.10);
  }
  // IVA es 19% sobre (CIF + Arancel)
  ivaCop = Math.round((cifCop + arancelCop) * 0.19);

  let manejoCop = 0;
  let cargoImpuestosCop = 0;

  if (carrier === 'DHL') {
    manejoCop = 112621;
    cargoImpuestosCop = requiresTaxes ? 94158 : 0;
  } else if (carrier === 'FEDEX') {
    // Manejo FedEx: 89,664 COP con IVA incluido. 
    // Calculamos la base (89664 / 1.19 = ~75348) para que el IVA luego cuadre perfecto.
    manejoCop = 75348;
    cargoImpuestosCop = 0; // Sin factura de >$200 de FedEx, asumimos 0 por ahora.
  } else {
    manejoCop = 0;
    cargoImpuestosCop = 0;
  }

  const ivaHonorariosCop = Math.round((manejoCop + cargoImpuestosCop) * 0.19);
  const carrierFeesCop = manejoCop + cargoImpuestosCop + ivaHonorariosCop;
  
  const totalDhlCop = arancelCop + ivaCop + carrierFeesCop;
  const granTotalCop = totalImpexCop + totalDhlCop;
  const granTotalUsd = granTotalCop / rateUsdCop; // Proyección de todo a USD para guardarlo unificado

  // Proyección de Ventas (Kawadojo)
  const totalVentasCop = cart.reduce((sum, item) => sum + ((item.kawadojo_price || 0) * item.quantity), 0);
  const utilidadNetaCop = totalVentasCop - granTotalCop;
  const margenPorcentaje = totalVentasCop > 0 ? (utilidadNetaCop / totalVentasCop) * 100 : 0;

  const handleSaveQuote = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    try {
      const payload: ImpexQuote = {
        exchange_rate_jpy_cop: Number(exchangeRate),
        exchange_rate_usd_jpy: Number(usdExchangeRate),
        subtotal_yen: subtotalYen,
        subtotal_usd: subtotalUsd,
        shipping_usd: shippingVal,
        shipping_trm: Number(shippingTrm) || 4000,
        carrier,
        customs_trm: trm,
        carrier_fees_cop: carrierFeesCop,
        requires_taxes: requiresTaxes,
        iva_usd: ivaCop / trm,
        arancel_usd: arancelCop / trm,
        total_usd: granTotalUsd,
        total_cop: granTotalCop,
        items: cart.map(item => ({
          impex_part_id: item.id.toString(), // Wait, impex_part_id is UUID string in DB, but SavedImpexPart id is number in types? Wait, Prisma id is UUID String!
          quantity: item.quantity,
          unit_price_yen: item.price_yen || 0,
          unit_price_usd: item.price_usd || 0
        }))
      };
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

  if (loading) {
    return <div className="p-10 text-center text-kawa-green">Cargando...</div>;
  }

  return (
    <div className="bg-kawa-gray rounded-xl border border-gray-800 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-800 bg-[#2a2a2a] flex gap-4">
        <button 
          onClick={() => setView('create')} 
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${view === 'create' ? 'bg-kawa-green text-black' : 'text-gray-400 hover:bg-[#1e1e1e]'}`}
        >
          Nueva Cotización
        </button>
        <button 
          onClick={() => setView('list')} 
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${view === 'list' ? 'bg-kawa-green text-black' : 'text-gray-400 hover:bg-[#1e1e1e]'}`}
        >
          Historial de Cotizaciones
        </button>
      </div>

      {view === 'create' && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Piezas Disponibles</h3>
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-lg max-h-[300px] overflow-y-auto p-2">
              {savedParts.map(part => (
                <div key={part.id} className="flex justify-between items-center p-3 border-b border-gray-800 hover:bg-[#2a2a2a] rounded">
                  <div className="flex-1 mr-2">
                    <p className="text-white font-bold text-sm leading-tight">{part.name_es || part.name_en || part.name_ja || 'Sin nombre'}</p>
                    <p className="text-gray-400 text-xs font-mono mt-1">{part.part_no}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-blue-400 font-mono text-sm">US$ {part.price_usd?.toFixed(2)}</p>
                    <button 
                      onClick={() => addToCart(part)}
                      disabled={!!cart.find(c => c.id === part.id)}
                      className="bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 disabled:opacity-50"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold text-white mb-4 mt-8">Piezas en la Cotización</h3>
            {cart.length === 0 ? (
              <p className="text-gray-500">No hay piezas agregadas.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.id} className="bg-[#1e1e1e] border border-gray-800 rounded-lg p-3 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 mr-2">
                        <p className="text-white font-bold text-sm leading-tight">{item.name_es || item.name_en || item.name_ja || 'Sin nombre'}</p>
                        <p className="text-gray-500 text-xs font-mono mt-1">{item.part_no}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="bg-gray-800 w-6 h-6 rounded text-white">-</button>
                        <span className="text-white w-6 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="bg-gray-800 w-6 h-6 rounded text-white">+</button>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">US$ {item.price_usd?.toFixed(2)} c/u</p>
                        <p className="text-blue-400 font-bold text-sm">US$ {((item.price_usd || 0) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 h-fit sticky top-6">
            <h3 className="text-xl font-bold text-white mb-6">Resumen de Costos</h3>
            
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Subtotal Piezas ({cart.length})</span>
                <span className="font-mono text-white">US$ {subtotalUsd.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Envío Casillero (USD)</span>
                <input 
                  type="number" 
                  value={shippingUsd}
                  onChange={e => setShippingUsd(e.target.value)}
                  placeholder="0.00"
                  className="w-24 bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1 text-right text-white focus:border-kawa-green outline-none"
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span>TRM Envío (Banco)</span>
                <input 
                  type="number" 
                  value={shippingTrm}
                  onChange={e => setShippingTrm(e.target.value)}
                  placeholder="4000"
                  className="w-24 bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1 text-right text-white focus:border-kawa-green outline-none"
                />
              </div>

              <div className="flex justify-between items-center mt-2 border-t border-gray-800 pt-2">
                <span>Transportadora</span>
                <select 
                  value={carrier}
                  onChange={e => setCarrier(e.target.value as any)}
                  className="w-24 bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1 text-right text-white focus:border-kawa-green outline-none"
                >
                  <option value="DHL">DHL</option>
                  <option value="FEDEX">FedEx</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="flex justify-between items-center mt-2 pb-2 border-b border-gray-800">
                <span>TRM Aduana</span>
                <input 
                  type="number" 
                  value={customsTrm}
                  onChange={e => setCustomsTrm(e.target.value)}
                  placeholder="4000"
                  className="w-24 bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1 text-right text-white focus:border-kawa-green outline-none"
                />
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-500 font-bold mb-2">PAGO IMPEX (JAPÓN)</p>
                <div className="flex justify-between">
                  <span>Piezas</span>
                  <span className="font-mono text-kawa-green">$ {piezasCop.toLocaleString('es-CO')}</span>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-xs text-gray-500 font-bold mb-2">PAGO ENVÍO (Casillero/Flete)</p>
                <div className="flex justify-between">
                  <span>Costo Envío</span>
                  <span className="font-mono text-blue-400">$ {envioCop.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-500 font-bold mb-2">PAGO TRANSPORTADORA (DESTINO)</p>
                <div className="p-3 bg-[#1a1a1a] border border-gray-800 rounded-lg space-y-2 mb-3">
                  {requiresTaxes ? (
                    <p className="text-red-400 text-xs font-bold mb-1">⚠️ Pedido {'>'} $200 USD (Aplica IVA y Arancel)</p>
                  ) : (
                    <p className="text-gray-400 text-xs mb-1">Pedido {'<'} $200 USD (Aplica IVA, sin Arancel)</p>
                  )}
                  
                  {requiresTaxes && (
                    <div className="flex justify-between text-red-300 text-xs">
                      <span>Arancel (10%)</span>
                      <span className="font-mono">$ {arancelCop.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-300 text-xs">
                    <span>IVA (19%)</span>
                    <span className="font-mono">$ {ivaCop.toLocaleString('es-CO')}</span>
                  </div>
                </div>
                
                {carrierFeesCop > 0 && (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>Honorarios y Manejo ({carrier})</span>
                      <span className="font-mono">$ {carrierFeesCop.toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between mt-2 border-t border-gray-800 pt-2 text-white">
                  <span>Total Aduanas y Manejo</span>
                  <span className="font-mono text-blue-400">$ {totalDhlCop.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-lg font-bold text-white">
                  <span>GRAN TOTAL (COP)</span>
                  <span className="text-kawa-green">$ {granTotalCop.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Equivalente en USD</span>
                  <span>US$ {granTotalUsd.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#161616] border border-gray-800 rounded-xl p-6 h-fit sticky top-6">
            <h3 className="text-xl font-bold text-white mb-6">Proyección de Ventas</h3>
            
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Venta Estimada (Precio Público)</span>
                <span className="font-mono text-kawa-green">$ {totalVentasCop.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span>Costos Operativos (Cotización)</span>
                <span className="font-mono text-red-400">- $ {granTotalCop.toLocaleString('es-CO')}</span>
              </div>
              
              <div className="border-t border-gray-800 pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-lg font-bold text-white">
                  <span>Utilidad Neta</span>
                  <span className={utilidadNetaCop >= 0 ? "text-kawa-green" : "text-red-500"}>
                    $ {utilidadNetaCop.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Margen de Ganancia</span>
                  <span className={margenPorcentaje >= 0 ? "text-kawa-green" : "text-red-500"}>
                    {margenPorcentaje.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveQuote}
              disabled={cart.length === 0}
              className="w-full mt-8 bg-kawa-green text-black font-bold py-3 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(110,231,183,0.2)]"
            >
              Guardar Cotización
            </button>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="p-6">
          {quotes.length === 0 ? (
            <p className="text-gray-500 text-center">No hay cotizaciones guardadas.</p>
          ) : (
            <div className="space-y-4">
              {quotes.map(quote => (
                <div key={quote.id} className="bg-[#1e1e1e] border border-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-3">
                    <div>
                      <h4 className="text-white font-bold text-lg">{quote.quote_number}</h4>
                      <p className="text-xs text-gray-500">{new Date(quote.created_at || '').toLocaleString('es-CO')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-bold">US$ {quote.total_usd?.toFixed(2)}</p>
                      <p className="text-kawa-green font-bold">$ {quote.total_cop?.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Piezas: {quote.items.reduce((sum, it) => sum + it.quantity, 0)} unidades</p>
                    <p>Subtotal: US$ {quote.subtotal_usd?.toFixed(2)} | Envío: US$ {quote.shipping_usd?.toFixed(2)}</p>
                    {quote.requires_taxes && (
                      <p className="text-red-400 text-xs mt-1">Incluye IVA (US$ {quote.iva_usd?.toFixed(2)}) y Arancel (US$ {quote.arancel_usd?.toFixed(2)})</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuotesTab;
