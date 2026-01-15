import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import type { Product } from '../types/product';

interface ProductSelectorModalProps {
  products: Product[];
  selectedProducts: Array<{ product_id: string; quantity: number; unit_cost: number }>;
  onClose: () => void;
  onConfirm: (selectedItems: Array<{ product_id: string; quantity: number; unit_cost: number; product: Product }>) => void;
}

interface SelectedProduct {
  product: Product;
  quantity: number;
}

export default function ProductSelectorModal({ 
  products, 
  selectedProducts,
  onClose, 
  onConfirm 
}: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Map<string, SelectedProduct>>(new Map());

  useEffect(() => {
    // Pre-select already selected products
    const initialSelected = new Map<string, SelectedProduct>();
    selectedProducts.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        initialSelected.set(product.id, { product, quantity: item.quantity });
      }
    });
    setSelected(initialSelected);
  }, [selectedProducts, products]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleProduct = (product: Product) => {
    const newSelected = new Map(selected);
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id);
    } else {
      newSelected.set(product.id, { product, quantity: 1 });
    }
    setSelected(newSelected);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const newSelected = new Map(selected);
    const item = newSelected.get(productId);
    if (item) {
      item.quantity = Math.max(1, quantity);
      newSelected.set(productId, item);
      setSelected(newSelected);
    }
  };

  const handleConfirm = () => {
    const items = Array.from(selected.values()).map(({ product, quantity }) => ({
      product_id: product.id,
      quantity,
      unit_cost: product.cost || 0,
      product,
    }));
    onConfirm(items);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalSelected = selected.size;
  const totalCost = Array.from(selected.values()).reduce(
    (sum, { product, quantity }) => sum + (product.cost || 0) * quantity,
    0
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-60">
      <div className="bg-kawa-black rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Seleccionar Productos</h2>
            <p className="text-sm text-gray-400 mt-1">
              {totalSelected} producto{totalSelected !== 1 ? 's' : ''} seleccionado{totalSelected !== 1 ? 's' : ''} · {formatCurrency(totalCost)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 pb-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-kawa-gray border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-kawa-green transition-colors"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map(product => {
              const isSelected = selected.has(product.id);
              const selectedItem = selected.get(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => toggleProduct(product)}
                  className={`
                    relative bg-kawa-gray rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-kawa-green shadow-lg shadow-kawa-green/20' 
                      : 'border-gray-800 hover:border-gray-700'
                    }
                  `}
                >
                  {/* Checkbox overlay */}
                  <div className="absolute top-2 left-2 z-10">
                    <div className={`
                      w-6 h-6 rounded border-2 flex items-center justify-center transition-colors
                      ${isSelected 
                        ? 'bg-kawa-green border-kawa-green' 
                        : 'bg-kawa-black border-gray-600'
                      }
                    `}>
                      {isSelected && <Check size={16} className="text-black" />}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 shrink-0 bg-gray-900 rounded overflow-hidden">
                        <img
                          src={product.images[0]?.url || '/placeholder.png'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-kawa-green mb-1">{product.category_name}</p>
                        <h3 className="text-sm font-medium text-white truncate">{product.name}</h3>
                        <p className="text-sm font-bold text-gray-300 mt-1">
                          Costo: {formatCurrency(product.cost || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Input */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-700" onClick={e => e.stopPropagation()}>
                        <label className="block text-xs font-medium text-white mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={selectedItem?.quantity || 1}
                          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 bg-kawa-black border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-kawa-green"
                          onClick={e => e.stopPropagation()}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Subtotal: {formatCurrency((product.cost || 0) * (selectedItem?.quantity || 1))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No se encontraron productos</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-kawa-gray/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Total seleccionado</p>
              <p className="text-2xl font-bold text-kawa-green">{formatCurrency(totalCost)}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-kawa-gray hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={totalSelected === 0}
                className="px-6 py-2 bg-kawa-green hover:bg-green-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar {totalSelected} producto{totalSelected !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
