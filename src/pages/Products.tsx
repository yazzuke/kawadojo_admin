import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, Copy } from 'lucide-react';
import { productService } from '../services/productService';
import type { Product } from '../types/product';
import ProductModal from '../components/ProductModal';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);
  const [batchTagValue, setBatchTagValue] = useState('');
  const [isTagging, setIsTagging] = useState(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'sold_out'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [duplicateData, setDuplicateData] = useState<Partial<Product> | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && product.in_stock) ||
        (stockFilter === 'sold_out' && !product.in_stock);
        
      const matchesTag = 
        tagFilter === 'all' ||
        (tagFilter === 'untagged' && !product.group_tag) ||
        (tagFilter === product.group_tag);
        
      return matchesSearch && matchesStock && matchesTag;
    });
    setFilteredProducts(filtered);
  }, [searchTerm, stockFilter, tagFilter, products]);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
            const tagsData = await productService.getTags();
      setAvailableTags(tagsData);
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
    setDuplicateData(undefined);
    setIsModalOpen(true);
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const handleDuplicate = (product: Product) => {
    // Strip existing -NN suffix to get base name
    const suffixMatch = product.name.match(/^(.*?)-(\d{2,})$/);
    const baseName = suffixMatch ? suffixMatch[1] : product.name;

    // Find the highest existing number for this base name
    const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingNums = products
      .map((p) => {
        if (p.name === baseName) return 1;
        const m = p.name.match(new RegExp(`^${escapedBase}-(\\d+)$`));
        return m ? parseInt(m[1]) : null;
      })
      .filter((n): n is number => n !== null);

    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 1;
    const newName = `${baseName}-${String(maxNum + 1).padStart(2, '0')}`;

    setSelectedProduct(null);
    setDuplicateData({
      ...product,
      name: newName,
      slug: generateSlug(newName),
    });
    setIsModalOpen(true);
  };

    const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const submitBatchTag = async () => {
    if (!batchTagValue.trim()) {
      alert('Por favor ingresa un tag v�lido');
      return;
    }
    try {
      setIsTagging(true);
      await productService.batchTagProducts(selectedIds, batchTagValue.trim());
      await loadProducts();
      setSelectedIds([]);
      setIsBatchTagModalOpen(false);
      setBatchTagValue('');
    } catch (error) {
      console.error('Error al aplicar tag masivo:', error);
      alert('Hubo un error al aplicar el tag');
    } finally {
      setIsTagging(false);
    }
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
    setDuplicateData(undefined);
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
      {/* Datalist global para tags */}
      <datalist id="available-group-tags">
        {availableTags.map(tag => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Productos</h1>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setIsBatchTagModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Tag ({selectedIds.length})
            </button>
          )}
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-kawa-green text-black font-medium rounded-lg hover:bg-kawa-green-light transition-colors"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-kawa-gray border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-kawa-green transition-colors"
          />
        </div>
                        <div className="flex items-center gap-1 bg-kawa-gray border border-gray-800 rounded-lg p-1">
          <select 
            value={tagFilter} 
            onChange={(e) => setTagFilter(e.target.value)}
            className="bg-transparent text-gray-400 hover:text-white px-3 py-2 text-sm font-medium focus:outline-none cursor-pointer appearance-none"
          >
            <option value="all" className="bg-kawa-gray">Todos los Tags</option>
            <option value="untagged" className="bg-kawa-gray">Sin Tag</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag} className="bg-kawa-gray">{tag}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 bg-kawa-gray border border-gray-800 rounded-lg p-1">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              stockFilter === 'all'
                ? 'bg-kawa-green text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              stockFilter === 'in_stock'
                ? 'bg-green-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            En Stock
          </button>
          <button
            onClick={() => setStockFilter('sold_out')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              stockFilter === 'sold_out'
                ? 'bg-red-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Agotado
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <input 
          type="checkbox" 
          id="selectAll"
          checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
          onChange={handleSelectAll}
          className="w-4 h-4 accent-kawa-green cursor-pointer rounded border-gray-600 bg-black/50"
        />
        <label htmlFor="selectAll" className="text-sm text-gray-400 cursor-pointer select-none">
          Seleccionar todos ({filteredProducts.length})
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-kawa-gray rounded-xl border border-gray-800 overflow-hidden group"
          >
            {/* Image */}
            <div className="relative aspect-square">
              {/* Checkbox de Selección Masiva */}
              <div className="absolute top-2 right-2 z-20">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(product.id)}
                  onChange={() => handleToggleSelect(product.id)}
                  className="w-6 h-6 border-2 border-white rounded-md cursor-pointer checked:bg-kawa-green checked:border-kawa-green shadow-md transition-all appearance-none flex items-center justify-center after:content-[''] checked:after:content-['✓'] checked:after:text-black checked:after:font-bold checked:after:text-sm bg-black/40 backdrop-blur-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

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
                  title="Editar"
                >
                  <Pencil size={20} />
                </button>
                <button
                  onClick={() => handleDuplicate(product)}
                  className="p-2 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-colors"
                  title="Duplicar"
                >
                  <Copy size={20} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(product.id)}
                  className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                  title="Eliminar"
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
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs text-kawa-green">{product.category_name}</p>
                {product.group_tag && (
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                    {product.group_tag}
                  </span>
                )}
              </div>
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
          initialData={duplicateData}
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

      {/* Batch Tag Modal */}
      {isBatchTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-kawa-gray rounded-xl p-6 w-full max-w-md border border-[#333] shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Etiquetado Masivo</h2>
            <p className="text-gray-400 text-sm mb-4">
              Vas a aplicarle un Tag de Grupo a <strong>{selectedIds.length}</strong> productos seleccionados.
            </p>
            <input
               type="text"
               value={batchTagValue}
               onChange={(e) => setBatchTagValue(e.target.value)}
               placeholder="Ej: motorarranquen300"
               className="w-full bg-[#111] text-white rounded-lg border border-[#333] px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mt-2 mb-6"
            />
            <div className="flex gap-4">
               <button 
                 onClick={() => setIsBatchTagModalOpen(false)}
                 className="flex-1 py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg transition-colors font-semibold"
                 disabled={isTagging}
               >
                 Cancelar
               </button>
               <button 
                 onClick={submitBatchTag}
                 className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 flex justify-center items-center"
                 disabled={isTagging}
               >
                 {isTagging ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 ) : (
                   'Aplicar Tag'
                 )}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
