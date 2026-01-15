import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { productService } from '../services/productService';
import type { Product } from '../types/product';
import ProductModal from '../components/ProductModal';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await productService.delete(id);
      setProducts(products.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleModalSuccess = () => {
    loadProducts();
    handleModalClose();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Productos</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-kawa-green text-black font-medium rounded-lg hover:bg-kawa-green-light transition-colors"
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-kawa-gray border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-kawa-green transition-colors"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-kawa-gray rounded-xl border border-gray-800 overflow-hidden group"
          >
            {/* Image */}
            <div className="relative aspect-square">
              <img
                src={product.images[0]?.url || '/placeholder.png'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 bg-kawa-green rounded-lg text-black hover:bg-kawa-green-light transition-colors"
                >
                  <Pencil size={20} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(product.id)}
                  className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              {/* Status badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    product.in_stock
                      ? 'bg-green-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}
                >
                  {product.in_stock ? 'En Stock' : 'Agotado'}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    product.condition === 'nuevo'
                      ? 'bg-blue-500/90 text-white'
                      : 'bg-yellow-500/90 text-black'
                  }`}
                >
                  {product.condition === 'nuevo' ? 'Nuevo' : 'Usado'}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-xs text-kawa-green mb-1">{product.category_name}</p>
              <h3 className="text-white font-medium truncate">{product.name}</h3>
              <p className="text-xl font-bold text-kawa-green mt-2">
                ${product.price.toLocaleString()}
              </p>
              {product.compatible_models.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.compatible_models.slice(0, 2).map((model) => (
                    <span
                      key={model.id}
                      className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400"
                    >
                      {model.name}
                    </span>
                  ))}
                  {product.compatible_models.length > 2 && (
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                      +{product.compatible_models.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No se encontraron productos</p>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <ProductModal
          product={selectedProduct}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-kawa-gray rounded-xl p-6 max-w-md w-full border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Confirmar eliminación</h3>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-400 mb-6">
              ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 px-4 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
