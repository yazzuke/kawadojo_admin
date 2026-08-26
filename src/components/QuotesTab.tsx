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
  const [isConverting, setIsConverting] = useState<string | null>(null);
  
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
  const [piezasTrm, setPiezasTrm] = useState<number | string>(() => Math.round(Number(usdExchangeRate) * Number(exchangeRate)));
  const [searchPartTerm, setSearchPartTerm] = useState('');

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCart = [...cart];
    const temp = newCart[index];
    newCart[index] = newCart[index - 1];
    newCart[index - 1] = temp;
    setCart(newCart);
  };

  const moveDown = (index: number) => {
    if (index === cart.length - 1) return;
    const newCart = [...cart];
    const temp = newCart[index];
    newCart[index] = newCart[index + 1];
    newCart[index + 1] = temp;
    setCart(newCart);
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

  // Calculations
  const subtotalYen = cart.reduce((sum, item) => sum + ((item.price_yen || 0) * item.quantity), 0);
  const subtotalUsd = cart.reduce((sum, item) => sum + ((item.price_usd || 0) * item.quantity), 0);
  const shippingVal = Number(shippingUsd) || 0;
  
  // Impex Total (Japón)
  const rateUsdCop = Number(piezasTrm) || Math.round(Number(usdExchangeRate) * Number(exchangeRate));
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
        exchange_rate_jpy_cop: rateUsdCop / Number(usdExchangeRate),
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

  const handleConvertQuote = async (id: string) => {
    try {
      setIsConverting(id);
      const res = await impexService.convertQuoteToBatch(id);
      if (res.success) {
        toast.success(`Lote creado con éxito: ${res.data.batch_number}`);
        // Optionally fetch data if needed, or redirect to batches tab
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error convirtiendo a lote');
    } finally {
      setIsConverting(null);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Piezas Disponibles</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar pieza..."
                  value={searchPartTerm}
                  onChange={e => setSearchPartTerm(e.target.value)}
                  className="bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg focus:ring-kawa-green focus:border-kawa-green block w-full pl-3 pr-8 py-1.5"
                />
                {searchPartTerm && (
                  <button onClick={() => setSearchPartTerm('')} className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-lg max-h-[300px] overflow-y-auto p-2">
              {filteredSavedParts.map(part => (
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
                {cart.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="bg-[#1e1e1e] border border-gray-800 rounded-lg p-3 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 mr-2">
                        <p className="text-white font-bold text-sm leading-tight">{item.name_es || item.name_en || item.name_ja || 'Sin nombre'}</p>
                        <p className="text-gray-500 text-xs font-mono mt-1">{item.part_no}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveUp(index)} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500" title="Mover arriba">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={() => moveDown(index)} disabled={index === cart.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500" title="Mover abajo">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-400 ml-1" title="Eliminar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
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
                      
                      {/* Detalles en COP y Ganancia */}
                      <div className="flex flex-col gap-1 border-t border-gray-800 pt-2 mt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Venta Pública (Und):</span>
                          <span className="text-kawa-green font-mono">${(item.kawadojo_price || 0).toLocaleString('es-CO')}</span>
                        </div>
                        {item.quantity > 1 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Venta Pública Total (x{item.quantity}):</span>
                            <span className="text-kawa-green font-bold font-mono">${((item.kawadojo_price || 0) * item.quantity).toLocaleString('es-CO')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-400">Costo Base (Sin flete/imp):</span>
                          <span className="text-yellow-500 font-mono">${Math.round((item.price_usd || 0) * rateUsdCop).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-300">Utilidad Bruta / Und:</span>
                          <span className="text-blue-400 font-mono">${((item.kawadojo_price || 0) - Math.round((item.price_usd || 0) * rateUsdCop)).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold bg-black/50 p-1 rounded mt-1">
                          <span className="text-gray-300">Utilidad Total (x{item.quantity}):</span>
                          <span className="text-blue-400 font-mono">${(((item.kawadojo_price || 0) - Math.round((item.price_usd || 0) * rateUsdCop)) * item.quantity).toLocaleString('es-CO')}</span>
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
                <span>TRM Piezas (Banco)</span>
                <input 
                  type="number" 
                  value={piezasTrm}
                  onChange={e => setPiezasTrm(e.target.value)}
                  placeholder="3350"
                  className="w-24 bg-[#1e1e1e] border border-gray-700 rounded px-2 py-1 text-right text-white focus:border-kawa-green outline-none"
                />
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
                <div key={quote.id} className="bg-[#1e1e1e] border border-gray-800 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center bg-[#252525] p-4 border-b border-gray-800">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-bold text-lg">{quote.quote_number}</h4>
                        <span className="bg-gray-700 text-xs text-white px-2 py-1 rounded">{quote.carrier || 'N/A'}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{new Date(quote.created_at || '').toLocaleString('es-CO')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-bold text-lg">US$ {quote.total_usd?.toFixed(2)}</p>
                      <p className="text-kawa-green font-bold text-xl">$ {quote.total_cop?.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Col 1: Repuestos */}
                    <div className="lg:col-span-2 space-y-2">
                      <h5 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Repuestos ({quote.items.reduce((sum, it) => sum + it.quantity, 0)} unidades)
                      </h5>
                      <div className="max-h-40 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {quote.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-800 pb-1">
                            <div className="flex gap-2 items-center text-gray-300">
                              <span className="bg-gray-800 px-2 py-0.5 rounded text-xs">{it.quantity}x</span>
                              <span className="truncate max-w-[200px] lg:max-w-[400px]" title={it.impex_part?.name_es || it.impex_part?.part_no}>
                                {it.impex_part?.name_es || it.impex_part?.name_en || it.impex_part?.part_no}
                              </span>
                            </div>
                            <span className="text-blue-400 font-mono text-xs">US$ {it.unit_price_usd?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Col 2: Desglose */}
                    <div className="bg-[#151515] p-3 rounded-lg text-sm">
                      <h5 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Desglose de Costos</h5>
                      <div className="space-y-1.5 text-gray-300">
                        <div className="flex justify-between">
                          <span>Piezas:</span>
                          <span>US$ {quote.subtotal_usd?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Envío Casillero:</span>
                          <span>US$ {quote.shipping_usd?.toFixed(2)}</span>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-800"></div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>TRM Piezas:</span>
                          <span>${quote.exchange_rate_jpy_cop ? Math.round((quote.exchange_rate_jpy_cop || 0) * (quote.exchange_rate_usd_jpy || 0)).toLocaleString('es-CO') : 4000}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>TRM Envío:</span>
                          <span>${quote.shipping_trm?.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>TRM Aduana:</span>
                          <span>${quote.customs_trm?.toLocaleString('es-CO')}</span>
                        </div>
                        
                        {(((quote.iva_usd || 0) + (quote.arancel_usd || 0)) > 0 || (quote.carrier_fees_cop && quote.carrier_fees_cop > 0)) && (
                          <div className="mt-2 pt-2 border-t border-gray-800"></div>
                        )}
                        {(quote.iva_usd && quote.iva_usd > 0) ? (
                          <div className="flex justify-between text-red-400">
                            <span>IVA (19%):</span>
                            <span>$ {Math.round(quote.iva_usd * (quote.customs_trm || 4000)).toLocaleString('es-CO')}</span>
                          </div>
                        ) : null}
                        {(quote.arancel_usd && quote.arancel_usd > 0) ? (
                          <div className="flex justify-between text-red-400">
                            <span>Arancel (10%):</span>
                            <span>$ {Math.round(quote.arancel_usd * (quote.customs_trm || 4000)).toLocaleString('es-CO')}</span>
                          </div>
                        ) : null}
                        {(quote.carrier_fees_cop && quote.carrier_fees_cop > 0) ? (
                          <div className="flex justify-between text-orange-400">
                            <span>Manejo ({quote.carrier}):</span>
                            <span>$ {quote.carrier_fees_cop.toLocaleString('es-CO')}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#252525] p-4 border-t border-gray-800 flex justify-between items-center">
                    <button 
                      onClick={() => handleDeleteQuote(quote.id as string)}
                      disabled={isDeleting === quote.id || isConverting === quote.id}
                      className="text-red-500 hover:text-red-400 font-medium text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      {isDeleting === quote.id ? 'Eliminando...' : 'Eliminar Cotización'}
                    </button>
                    <button 
                      onClick={() => handleConvertQuote(quote.id as string)}
                      disabled={isConverting === quote.id || isDeleting === quote.id}
                      className="bg-kawa-green text-black font-bold px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      {isConverting === quote.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Convirtiendo...
                        </>
                      ) : (
                        'Convertir a Lote (Auto)'
                      )}
                    </button>
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
