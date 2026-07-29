import { useState, useEffect } from 'react';
import { Package, Search, Image as ImageIcon } from 'lucide-react';
import { productService } from '../services/productService';
import type { ResalePricingItem } from '../types/product';

export default function ResalePricingPage() {
  const [items, setItems] = useState<ResalePricingItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ResalePricingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await productService.getResalePricing();
      setItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error('Error loading resale pricing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.group_tag && item.group_tag.toLowerCase().includes(term))
    );
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  const handleCustomPriceChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setCustomPrices((prev) => ({
      ...prev,
      [id]: isNaN(num) ? 0 : num,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Simulador de Reventa</h1>
          <p className="text-gray-400 mt-1">Simula diferentes precios de venta y calcula al vuelo el margen de ganancia</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-kawa-gray p-4 rounded-lg shadow-sm border border-gray-800 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-kawa-gray rounded-lg shadow-sm border border-gray-800 overflow-hidden">
        
        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-kawa-black">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Costo Base
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Precio Kawadojo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Precio Venta
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-green-400 uppercase tracking-wider">
                  Margen Papá
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-green-400 uppercase tracking-wider">
                  % Margen
                </th>
              </tr>
            </thead>
            <tbody className="bg-kawa-gray divide-y divide-gray-800">
              {filteredItems.map((item) => {
                const salePrice = customPrices[item.id] !== undefined ? customPrices[item.id] : item.recommended_price;
                const papaProfit = salePrice - item.adjusted_kawadojo_price;
                const marginPercent = item.adjusted_kawadojo_price > 0 ? (papaProfit / item.adjusted_kawadojo_price) * 100 : 0;

                return (
                <tr key={item.id} className="hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {item.primary_image ? (
                        <img
                          src={item.primary_image}
                          alt={item.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-800 flex items-center justify-center">
                          <ImageIcon size={20} className="text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-white max-w-xs truncate" title={item.name}>
                          {item.name}
                        </div>
                        {item.group_tag && (
                          <div className="text-xs text-gray-500">{item.group_tag}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${
                        item.condition === 'nuevo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.condition}
                      </span>
                      {item.is_original && (
                        <span className="text-xs text-blue-400 font-medium">Original</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-400">
                    {formatCurrency(item.base_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-400">
                    {formatCurrency(item.adjusted_kawadojo_price)}
                    {item.adjusted_kawadojo_price !== item.kawadojo_price && (
                      <div className="text-xs text-gray-600 line-through">
                        {formatCurrency(item.kawadojo_price)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <input
                      type="number"
                      value={salePrice || ''}
                      onChange={(e) => handleCustomPriceChange(item.id, e.target.value)}
                      className="w-32 px-3 py-1 bg-kawa-black border border-gray-700 rounded text-white text-right focus:ring-2 focus:ring-kawa-green focus:border-transparent font-medium"
                    />
                    {salePrice !== item.recommended_price && (
                      <div className="text-xs text-gray-500 mt-1">Sugerido: {formatCurrency(item.recommended_price)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-kawa-green">
                      {formatCurrency(papaProfit)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-bold ${marginPercent >= 0 ? 'text-kawa-green' : 'text-red-500'}`}>
                      {marginPercent.toFixed(1)}%
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-gray-800">
          {filteredItems.map((item) => {
            const salePrice = customPrices[item.id] !== undefined ? customPrices[item.id] : item.recommended_price;
            const papaProfit = salePrice - item.adjusted_kawadojo_price;
            const marginPercent = item.adjusted_kawadojo_price > 0 ? (papaProfit / item.adjusted_kawadojo_price) * 100 : 0;

            return (
              <div key={item.id} className="p-4 space-y-4">
                <div className="flex items-start gap-4">
                  {item.primary_image ? (
                    <img
                      src={item.primary_image}
                      alt={item.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-800 flex items-center justify-center">
                      <ImageIcon size={24} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium line-clamp-2 leading-tight">{item.name}</h4>
                    {item.group_tag && (
                      <div className="text-xs text-gray-500 mt-1">{item.group_tag}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                       <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        item.condition === 'nuevo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.condition}
                      </span>
                      {item.is_original && (
                        <span className="text-[10px] text-blue-400 font-medium">Original</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-kawa-black rounded-lg text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block mb-0.5">Costo Base</span>
                    <span className="text-gray-300 font-medium">{formatCurrency(item.base_cost)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block mb-0.5">Precio Kawadojo</span>
                    <span className="text-gray-300 font-medium">
                      {formatCurrency(item.adjusted_kawadojo_price)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 pt-2">
                  <div>
                    <label className="text-gray-400 text-xs font-medium block mb-1">Precio de Venta</label>
                    <input
                      type="number"
                      value={salePrice || ''}
                      onChange={(e) => handleCustomPriceChange(item.id, e.target.value)}
                      className="w-full px-3 py-2.5 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent font-medium"
                      placeholder="Precio de venta"
                    />
                    {salePrice !== item.recommended_price && (
                      <div className="text-xs text-gray-500 mt-1.5 flex justify-between">
                        <span>Sugerido:</span>
                        <span>{formatCurrency(item.recommended_price)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                    <span className="text-gray-400 text-sm font-medium">Ganancia</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-kawa-green">
                        {formatCurrency(papaProfit)}
                      </div>
                      <div className={`text-sm font-bold ${marginPercent >= 0 ? 'text-kawa-green' : 'text-red-500'}`}>
                        {marginPercent.toFixed(1)}% Margen
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No hay productos disponibles para reventa.</p>
          </div>
        )}
      </div>
    </div>
  );
}