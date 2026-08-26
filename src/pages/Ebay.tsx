import { useState, useEffect } from 'react';
import { EbayNavbar } from '../components/EbayNavbar';
import api from '../services/api';
import { ShoppingBag, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface EbayItem {
  ebay_item_id: string;
  title: string;
  description: string;
  price: number;
  shipping: number;
  currency: string;
  listing_url: string;
  condition: string;
  location: string;
  image_url: string;
  seller_id: string;
  last_synced_at: string;
  first_seen_at?: string;
}

export default function EbayPage() {
  const [items, setItems] = useState<EbayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerSearch, setSellerSearch] = useState('');
  const [sort, setSort] = useState('newest'); // Local sorting state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [salePrices, setSalePrices] = useState<Record<string, string>>({});
  const [trm, setTrm] = useState<number>(4000); // Default TRM
  const [cart, setCart] = useState<EbayItem[]>([]);
  const [savedSellers, setSavedSellers] = useState<any[]>([]);
  const [motoModel, setMotoModel] = useState('ninja300'); // New state for model selection
  
  const [interestKeywords, setInterestKeywords] = useState(() => {
    return localStorage.getItem('kawa_interest_keywords') || 'shock, radiator, Starter Motor, Regulator Rectifier,Fan, Cooling Fan';
  });

  const toggleCart = (item: EbayItem) => {
    if (cart.find(c => c.ebay_item_id === item.ebay_item_id)) {
      setCart(cart.filter(c => c.ebay_item_id !== item.ebay_item_id));
    } else {
      setCart([...cart, item]);
    }
  };

  const cartTotalUSD = cart.reduce((acc, item) => acc + item.price + (item.shipping || 0) + (item.price * 0.07), 0);
  const cartTotalCOP = cartTotalUSD * trm;
  const isOverLimit = cartTotalUSD > 200;

  const cartSaleTotalCOP = cart.reduce((acc, item) => {
    return acc + (Number(salePrices[item.ebay_item_id]) || 0);
  }, 0);
  const cartProfitCOP = cartSaleTotalCOP > 0 ? cartSaleTotalCOP - cartTotalCOP : 0;

  const fetchSellers = async () => {
    try {
      const res = await api.get('/ebay/sellers');
      setSavedSellers(res.data);
    } catch (e) {
      console.error('Error fetching sellers', e);
    }
  };

  const saveSeller = async (username: string) => {
    try {
      await api.post('/ebay/sellers', { username });
      fetchSellers();
      toast.success(`Vendedor ${username} guardado en tu base de datos!`);
    } catch (e) {
      console.error('Error saving seller', e);
      toast.error('Error guardando vendedor');
    }
  };

  const hideItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Optimizacion: Quitarlo inmediatamente de la UI
      setItems(prev => prev.filter(item => item.ebay_item_id !== id));
      toast.success('Repuesto ocultado. No volverá a salir.');
      
      // Llamar al backend para guardarlo en BD como oculto
      await api.post(`/ebay/hide/${id}`);
    } catch (error) {
      console.error('Error hiding item', error);
      toast.error('Error al ocultar el repuesto');
    }
  };

  useEffect(() => {
    fetchItems(true);
    fetchSellers();
  }, []); 

  // Re-fetch when model changes
  useEffect(() => {
    fetchItems(true);
  }, [motoModel]);

  // Add dependency on offset to load more
  useEffect(() => {
    if (offset > 0) {
      fetchItems(false);
    }
  }, [offset]);

  const fetchItems = async (isNewSearch = true) => {
    try {
      if (isNewSearch) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const params: Record<string, string> = {};
      if (searchTerm) params.q = searchTerm;
      if (sellerSearch) params.seller = sellerSearch;
      if (sort !== 'newest') params.sort = sort;
      if (!isNewSearch) params.offset = offset.toString();
      params.model = motoModel; // Pass selected model to backend

      const response = await api.get('/ebay', { params });
      const data = response.data;
      
      if (data.length < 48) {
        setHasMore(false); // If we got less than requested limit, we're at the end
      } else {
        setHasMore(true);
      }

      if (isNewSearch) {
        setItems(data);
      } else {
        setItems(prev => [...prev, ...data]);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(true);
  };

  const sortedItems = [...items].sort((a, b) => {
    if (sort === "priceAsc") return a.price - b.price;
    if (sort === "priceDesc") return b.price - a.price;
    return 0; // 'newest' keeps the original eBay API order (which is newlyListed)
  });

  const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInterestKeywords(e.target.value);
    localStorage.setItem('kawa_interest_keywords', e.target.value);
  };

  const isHighInterest = (title: string) => {
    const lowerTitle = title.toLowerCase();
    const keywords = interestKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    return keywords.some(kw => lowerTitle.includes(kw));
  };

  const highInterestItems = sortedItems.filter(item => isHighInterest(item.title));
  const otherItems = sortedItems.filter(item => !isHighInterest(item.title));

  const getDaysAgo = (dateString?: string) => {
    if (!dateString) return 'Hoy';
    const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  };

  const renderItemCard = (item: any) => {
    const totalCostUSD = item.price + (item.shipping || 0) + (item.price * 0.07);
    const totalCostCOP = totalCostUSD * trm;
    const salePriceCOP = Number(salePrices[item.ebay_item_id]) || 0;
    const profitCOP = salePriceCOP > 0 ? salePriceCOP - totalCostCOP : 0;
    const isInCart = cart.some(c => c.ebay_item_id === item.ebay_item_id);

    return (
      <div key={item.ebay_item_id} className={`bg-[#111] rounded-xl overflow-hidden border flex flex-col group hover:border-gray-500 transition-colors ${isInCart ? 'border-kawa-green' : 'border-gray-800'}`}>
        <div className="aspect-square w-full relative bg-black overflow-hidden flex items-center justify-center">
          <img
            src={item.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}
            alt={item.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white border border-gray-700 shadow-lg">
            {item.condition}
          </div>

          <button 
            onClick={(e) => hideItem(item.ebay_item_id, e)}
            className="absolute top-10 right-2 bg-red-900/80 hover:bg-red-600 px-2 py-1 rounded text-[10px] font-bold text-white border border-red-700 shadow-lg transition-colors z-10"
            title="Ocultar para siempre"
          >
            ✕ Ocultar
          </button>
          
          <button 
            onClick={() => toggleCart(item)}
            className={`absolute top-2 left-2 p-2 rounded-full border shadow-lg transition-colors z-10 ${
              isInCart 
                ? 'bg-kawa-green border-kawa-green text-black' 
                : 'bg-black/80 border-gray-700 text-white hover:bg-gray-800 hover:scale-110'
            }`}
          >
            <ShoppingBag size={16} />
          </button>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="text-[10px] text-kawa-green mb-1 font-bold tracking-wide uppercase">
            Apareció: {getDaysAgo(item.first_seen_at)}
          </div>
          <h3 className="text-white font-medium line-clamp-2 mb-2 leading-tight" title={item.title}>
            {item.title}
          </h3>
          
          {/* Cost Calculation */}
          <div className="bg-black/50 p-3 rounded-lg mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Precio eBay:</span>
              <span>${item.price.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
              <span>Envío (USA): $</span>
              <input
                type="number"
                placeholder="Ej: 8.50"
                defaultValue={item.shipping || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  item.shipping = val;
                  setItems([...items]);
                }}
                className="w-16 bg-black border border-gray-600 rounded px-1 py-0.5 text-white text-right focus:outline-none focus:border-kawa-green"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Tax Estimado (7%):</span>
              <span>${(item.price * 0.07).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between items-end text-sm font-bold text-white border-t border-gray-700 mt-2 pt-2">
              <span>Costo Total:</span>
              <div className="text-right">
                <div>${totalCostUSD.toFixed(2)} USD</div>
                <div className="text-kawa-green text-xs">${new Intl.NumberFormat('es-CO').format(Math.round(totalCostCOP))} COP</div>
              </div>
            </div>
          </div>

          <div className="text-gray-400 text-xs mb-3 flex items-center justify-between">
            <div>Vendedor: <span className="text-gray-300 font-medium">{item.seller_id}</span></div>
            {item.seller_id && !savedSellers.find(s => s.username === item.seller_id) && (
              <button 
                onClick={() => saveSeller(item.seller_id)}
                className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-white border border-gray-600 transition-colors"
              >
                + Guardar
              </button>
            )}
            {savedSellers.find(s => s.username === item.seller_id) && (
              <span className="text-[10px] bg-kawa-green/20 text-kawa-green px-2 py-1 rounded border border-kawa-green/30">
                Guardado ✓
              </span>
            )}
          </div>
          
          <div className="mt-auto space-y-3">
            {/* Profit Calculator */}
            <div className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-700 p-2 rounded-lg">
              <span className="text-xs text-gray-400">Venta (COP): $</span>
              <input
                type="number"
                placeholder="Ej: 150000"
                value={salePrices[item.ebay_item_id] || ''}
                onChange={(e) => setSalePrices({ ...salePrices, [item.ebay_item_id]: e.target.value })}
                className="w-24 bg-black border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-kawa-green text-right"
              />
            </div>
            
            {salePriceCOP > 0 && (
              <div className={`text-sm font-bold text-center ${profitCOP >= 0 ? 'text-kawa-green' : 'text-red-500'}`}>
                Ganancia: ${new Intl.NumberFormat('es-CO').format(Math.round(profitCOP))} COP
              </div>
            )}

            <a
              href={item.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
            >
              Ver en eBay <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full pb-32">
      <EbayNavbar 
        trm={trm}
        setTrm={setTrm}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sellerSearch={sellerSearch}
        setSellerSearch={setSellerSearch}
        sort={sort}
        setSort={setSort}
        interestKeywords={interestKeywords}
        onKeywordsChange={handleKeywordsChange}
        onSearch={handleSearchSubmit}
        savedSellers={savedSellers}
        motoModel={motoModel}
        setMotoModel={setMotoModel}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {loading && offset === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-kawa-green" />
          <p className="text-gray-400">Buscando en eBay...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {highInterestItems.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-kawa-green mb-4 border-b border-kawa-green/30 pb-3 flex items-center gap-2">
                🔥 Búsqueda según interés
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {highInterestItems.map(renderItemCard)}
              </div>
            </div>
          )}

          {otherItems.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-3 flex items-center gap-2">
                📦 Otros Repuestos Recientes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {otherItems.map(renderItemCard)}
              </div>
            </div>
          )}

          {items.length === 0 && !error && (
            <div className="col-span-full text-center py-24 text-gray-400 bg-[#111] rounded-xl border border-gray-800 border-dashed">
              No se encontraron repuestos en eBay para tu búsqueda.
            </div>
          )}
          
          {items.length > 0 && hasMore && (
            <div className="flex justify-center pt-8">
              <button
                onClick={() => setOffset(prev => prev + 48)}
                disabled={loadingMore}
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cargando más...
                  </>
                ) : (
                  'Cargar más repuestos'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cart Sticky Footer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-[250px] right-0 bg-[#0a0a0a] border-t border-gray-800 p-4 shadow-2xl z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-400 block text-xs">Repuestos en Lote</span>
                <span className="text-white font-bold text-lg">{cart.length} items</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Costo Total USD</span>
                <span className="text-white font-bold text-lg">${cartTotalUSD.toFixed(2)} USD</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Costo Total COP</span>
                <span className="text-white font-bold text-lg">${new Intl.NumberFormat('es-CO').format(Math.round(cartTotalCOP))} COP</span>
              </div>
              
              {cartSaleTotalCOP > 0 && (
                <div className="pl-6 border-l border-gray-700">
                  <span className="text-kawa-green/80 block text-xs">Ganancia Esperada</span>
                  <span className="text-kawa-green font-bold text-xl">${new Intl.NumberFormat('es-CO').format(Math.round(cartProfitCOP))} COP</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {isOverLimit && (
                <div className="text-amber-500 text-sm font-medium bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">
                  ⚠️ Supera $200 USD (Aplica Arancel)
                </div>
              )}
              <div className="bg-gray-800 text-gray-300 text-sm px-4 py-2 rounded-lg border border-gray-700">
                Calculadora de Lote
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
