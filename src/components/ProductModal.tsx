import { useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { modelService } from '../services/modelService';
import type { Product, Category, CompatibleModel, CreateProductData } from '../types/product';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<CompatibleModel[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: '',
    cost: '',
    description: '',
    condition: 'usado' as 'nuevo' | 'usado',
    in_stock: true,
    is_original: true,
    source: '',
    category_id: '',
    compatible_models: [] as string[],
  });

  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        price: product.price.toString(),
        cost: product.cost?.toString() || '',
        description: product.description,
        condition: product.condition,
        in_stock: product.in_stock,
        is_original: product.is_original,
        source: product.source,
        category_id: product.category_id,
        compatible_models: product.compatible_models.map((m) => m.id),
      });
      setPreviewUrls(product.images.map((img) => img.url));
    }
  }, [product]);

  const loadData = async () => {
    try {
      const [categoriesData, modelsData] = await Promise.all([
        categoryService.getAll(),
        modelService.getAll(),
      ]);
      setCategories(categoriesData);
      setModels(modelsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages([...images, ...files]);

    // Generate preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...previewUrls];
    
    // Revoke URL to free memory
    if (newPreviews[index].startsWith('blob:')) {
      URL.revokeObjectURL(newPreviews[index]);
    }
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImages(newImages);
    setPreviewUrls(newPreviews);
  };

  const toggleModel = (modelId: string) => {
    const current = formData.compatible_models;
    if (current.includes(modelId)) {
      setFormData({
        ...formData,
        compatible_models: current.filter((id) => id !== modelId),
      });
    } else {
      setFormData({
        ...formData,
        compatible_models: [...current, modelId],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data: CreateProductData = {
        name: formData.name,
        slug: formData.slug,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        description: formData.description,
        condition: formData.condition,
        in_stock: formData.in_stock,
        is_original: formData.is_original,
        source: formData.source,
        category_id: formData.category_id,
        compatible_models: formData.compatible_models,
        images: images,
      };

      if (product) {
        await productService.update(product.id, data);
      } else {
        await productService.create(data);
      }

      onSuccess();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error.response?.data?.message || 'Error al guardar el producto');
      } else {
        setError('Error al guardar el producto');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-kawa-gray rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-kawa-gray p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
              />
            </div>
          </div>

          {/* Price, Cost & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Precio *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Costo
              </label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="Costo de compra"
                className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categoría *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
                required
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green resize-none"
              required
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fuente/Origen
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="ej: ninja 400 2019 8000mph"
              className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
            />
          </div>

          {/* Condition & Stock & Original */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Condición
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as 'nuevo' | 'usado' })}
                className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
              >
                <option value="usado">Usado</option>
                <option value="nuevo">Nuevo</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.in_stock}
                  onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-700 bg-kawa-black text-kawa-green focus:ring-kawa-green"
                />
                <span className="text-gray-300">En Stock</span>
              </label>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_original}
                  onChange={(e) => setFormData({ ...formData, is_original: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-700 bg-kawa-black text-kawa-green focus:ring-kawa-green"
                />
                <span className="text-gray-300">Original</span>
              </label>
            </div>
          </div>

          {/* Compatible Models */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Modelos Compatibles
            </label>
            <div className="flex flex-wrap gap-2">
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => toggleModel(model.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    formData.compatible_models.includes(model.id)
                      ? 'bg-kawa-green text-black'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Imágenes
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="aspect-square border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-kawa-green transition-colors">
                <Upload size={24} className="text-gray-500 mb-1" />
                <span className="text-xs text-gray-500">Subir</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-kawa-green text-black font-bold rounded-lg hover:bg-kawa-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
