import { useState } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import type { OrderItem } from '../types/order';

interface EditItemPriceModalProps {
  item: OrderItem;
  onClose: () => void;
  onSave: (itemId: string, newPrice: number) => Promise<void>;
}

export default function EditItemPriceModal({ item, onClose, onSave }: EditItemPriceModalProps) {
  const [price, setPrice] = useState(item.product_price.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const newPrice = Number(price);
    if (isNaN(newPrice) || newPrice <= 0) {
      setError('El precio debe ser un número mayor a 0');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(item.id, newPrice);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar el precio');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const newTotal = Number(price) * item.quantity;
  const oldTotal = item.product_price * item.quantity;
  const difference = newTotal - oldTotal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-kawa-black rounded-lg max-w-md w-full border border-gray-800">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Editar Precio del Item</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Product Info */}
          <div className="bg-kawa-gray p-4 rounded-lg">
            <p className="text-white font-medium">{item.product_name}</p>
            <p className="text-sm text-gray-400 mt-1">
              Cantidad: {item.quantity} {item.quantity > 1 ? 'unidades' : 'unidad'}
            </p>
          </div>

          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Nuevo Precio Unitario *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign size={18} className="text-gray-400" />
              </div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white"
                placeholder="290000"
                required
                min="0"
                step="1000"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Precio actual: {formatCurrency(item.product_price)}
            </p>
          </div>

          {/* Summary */}
          {price && !isNaN(Number(price)) && (
            <div className="bg-kawa-gray p-4 rounded-lg space-y-2 border border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal anterior:</span>
                <span className="text-gray-300">{formatCurrency(oldTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Nuevo subtotal:</span>
                <span className="text-white font-medium">{formatCurrency(newTotal)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                <span className="text-gray-400">Diferencia:</span>
                <span className={`font-bold ${difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                </span>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ Esto actualizará automáticamente el subtotal y total de la orden, así como el profit calculado.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-kawa-gray hover:text-white transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-kawa-green hover:bg-green-600 text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
