import { useState, useEffect } from 'react';
import { X, Search, Package } from 'lucide-react';
import type { OrderItem } from '../types/order';
import { productService } from '../services/productService';
import type { Product } from '../types/product';

interface ChangeProductModalProps {
  item: OrderItem;
  onClose: () => void;
  onSave: (itemId: string, newProductId: string) => Promise<void>;
}

export default function ChangeProductModal({ item, onClose, onSave }: ChangeProductModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await productService.getAll();
      // Only show products in stock
      setProducts(data.filter(p => p.in_stock));
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Error al cargar los productos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Selecciona un producto para cambiar');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave(item.id, selectedProductId);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al cambiar el producto');
      setIsSaving(false); // only toggle false on error since success will unmount modal
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-kawa-gray rounded-lg max-w-2xl w-full border border-gray-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">Cambiar Producto</h2>
            <p className="text-sm text-gray-400 mt-1">Reemplazando: {item.product_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4 flex-shrink-0">
              {error}
            </div>
          )}

          <div className="mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, categoría o slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px] border border-gray-800 rounded-lg p-2 bg-kawa-black">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kawa-green"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package size={32} className="mx-auto mb-2" />
                <p>No se encontraron productos en stock</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedProductId === product.id
                        ? 'bg-kawa-green/20 border border-kawa-green'
                        : 'hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center">
                        <Package size={20} className="text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-400">
                        {product.category_name} {product.condition ? `• ${product.condition}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 flex-shrink-0 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-kawa-green hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={!selectedProductId || isSaving}
            >
              {isSaving ? 'Guardando...' : 'Cambiar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}