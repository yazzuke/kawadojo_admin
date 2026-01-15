import { useEffect, useState } from 'react';
import { Package, DollarSign, Archive, TrendingUp } from 'lucide-react';
import { productService } from '../services/productService';
import type { Product } from '../types/product';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats: StatCard[] = [
    {
      title: 'Total Productos',
      value: products.length,
      icon: <Package size={24} />,
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      title: 'En Stock',
      value: products.filter((p) => p.in_stock).length,
      icon: <Archive size={24} />,
      color: 'bg-green-500/10 text-green-400',
    },
    {
      title: 'Valor Total',
      value: `$${products.reduce((acc, p) => acc + p.price, 0).toLocaleString()}`,
      icon: <DollarSign size={24} />,
      color: 'bg-yellow-500/10 text-yellow-400',
    },
    {
      title: 'Productos Nuevos',
      value: products.filter((p) => p.condition === 'nuevo').length,
      icon: <TrendingUp size={24} />,
      color: 'bg-purple-500/10 text-purple-400',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-kawa-gray rounded-xl p-6 border border-gray-800"
          >
            <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <p className="text-gray-400 text-sm">{stat.title}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Products */}
      <div className="bg-kawa-gray rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Todos los Productos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm">
                <th className="p-4">Imagen</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-gray-800">
                  <td className="p-4">
                    <img
                      src={product.images[0]?.url || '/placeholder.png'}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  </td>
                  <td className="p-4 text-white">{product.name}</td>
                  <td className="p-4 text-gray-400">{product.category_name}</td>
                  <td className="p-4 text-kawa-green font-medium">
                    ${product.price.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.in_stock
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {product.in_stock ? 'En Stock' : 'Agotado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
