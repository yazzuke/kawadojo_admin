import { useEffect, useState } from 'react';
import { Tags } from 'lucide-react';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types/product';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Categorías</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-kawa-gray rounded-xl p-6 border border-gray-800 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-kawa-green/10 rounded-lg flex items-center justify-center">
              <Tags className="text-kawa-green" size={24} />
            </div>
            <div>
              <h3 className="text-white font-medium">{category.name}</h3>
              <p className="text-gray-400 text-sm">{category.slug}</p>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay categorías</p>
        </div>
      )}
    </div>
  );
}
