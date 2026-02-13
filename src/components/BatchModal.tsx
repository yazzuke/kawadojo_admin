import { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { batchesService } from '../services/batchesService';
import { productService } from '../services/productService';
import type { Batch, CreateBatchData, UpdateBatchData } from '../types/batch';
import type { Product } from '../types/product';
import { BATCH_STATUSES } from '../types/batch';
import ProductSelectorModal from './ProductSelectorModal';

interface BatchModalProps {
  batch: Batch | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface BatchItemForm {
  product_id: string;
  product?: any;
  quantity: number;
  unit_cost: number;
}

export default function BatchModal({ batch, onClose, onSuccess }: BatchModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);

  const [formData, setFormData] = useState({
    batch_number: '',
    purchase_date: '',
    purchase_total_cost: '',
    shipping_cost: '',
    customs_fees: '',
    additional_fees: '',
    mailbox_tracking: '',
    notes: '',
    status: 'ordered' as string,
  });

  const [items, setItems] = useState<BatchItemForm[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (batch) {
      setFormData({
        batch_number: batch.batch_number,
        purchase_date: new Date(batch.purchase_date).toISOString().split('T')[0],
        purchase_total_cost: batch.purchase_total_cost.toString(),
        shipping_cost: batch.shipping_cost.toString(),
        customs_fees: batch.customs_fees?.toString() || '',
        additional_fees: batch.additional_fees?.toString() || '',
        mailbox_tracking: batch.mailbox_tracking || '',
        notes: batch.notes || '',
        status: batch.status,
      });

      const batchItems = batch.items.map(item => ({
        product_id: item.product_id,
        product: item.product,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      }));
      setItems(batchItems);
    } else {
      // Set default date to today
      setFormData(prev => ({
        ...prev,
        purchase_date: new Date().toISOString().split('T')[0],
      }));
    }
  }, [batch]);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const openProductSelector = () => {
    setShowProductSelector(true);
  };

  const handleProductsSelected = (selectedItems: Array<{ product_id: string; quantity: number; unit_cost: number; product: any }>) => {
    setItems(selectedItems);
    setShowProductSelector(false);
  };

  const calculateItemsTotal = () => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unit_cost) || 0;
      return sum + (quantity * unitCost);
    }, 0);
  };

  const calculateTotalCost = () => {
    const purchase = Number(formData.purchase_total_cost) || 0;
    const shipping = Number(formData.shipping_cost) || 0;
    const customs = Number(formData.customs_fees) || 0;
    const additional = Number(formData.additional_fees) || 0;
    return purchase + shipping + customs + additional;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (items.length === 0) {
      setError('Debes agregar al menos un producto al lote');
      return;
    }

    setIsLoading(true);

    try {
      if (batch) {
        // Update existing batch
        const updateData: UpdateBatchData = {
          purchase_total_cost: Number(formData.purchase_total_cost) || 0,
          shipping_cost: Number(formData.shipping_cost) || 0,
          customs_fees: Number(formData.customs_fees) || 0,
          additional_fees: Number(formData.additional_fees) || 0,
          mailbox_tracking: formData.mailbox_tracking || undefined,
          notes: formData.notes || undefined,
        };
        await batchesService.update(batch.id, updateData);

        // Handle item changes
        const currentItemProductIds = items.map(item => item.product_id);
        const originalItemProductIds = batch.items.map(item => item.product_id);

        // Find items to delete (items that were removed)
        const itemsToDelete = batch.items
          .filter(item => !currentItemProductIds.includes(item.product_id))
          .map(item => item.id);

        if (itemsToDelete.length > 0) {
          try {
            await batchesService.deleteItems(batch.id, itemsToDelete, false);
          } catch (error: any) {
            // Si hay items vendidos, preguntar al usuario si quiere forzar
            if (error.response?.data?.message?.includes('ya se han vendido')) {
              const forceDelete = window.confirm(
                `${error.response.data.message}\n\n¿Deseas eliminar estos items de todas formas? Esto no afectará las ventas existentes.`
              );
              if (forceDelete) {
                await batchesService.deleteItems(batch.id, itemsToDelete, true);
              } else {
                throw error; // Re-lanzar el error si el usuario no confirma
              }
            } else {
              throw error;
            }
          }
        }

        // Find items to add (new products)
        const itemsToAdd = items
          .filter(item => !originalItemProductIds.includes(item.product_id))
          .map(item => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost),
          }));

        if (itemsToAdd.length > 0) {
          await batchesService.addItems(batch.id, itemsToAdd);
        }

        // Update quantities for existing items
        for (const item of items) {
          const originalItem = batch.items.find(i => i.product_id === item.product_id);
          if (originalItem && originalItem.quantity !== item.quantity) {
            await batchesService.updateItemQuantity(batch.id, originalItem.id, Number(item.quantity));
          }
        }

        // Update status if changed
        if (formData.status !== batch.status) {
          await batchesService.updateStatus(batch.id, {
            status: formData.status,
            customs_fees: Number(formData.customs_fees) || 0,
            additional_fees: Number(formData.additional_fees) || 0,
            mailbox_tracking: formData.mailbox_tracking || undefined,
          });
        }
      } else {
        // Create new batch
        const createData: CreateBatchData = {
          batch_number: formData.batch_number || undefined,
          purchase_date: new Date(formData.purchase_date),
          purchase_total_cost: Number(formData.purchase_total_cost),
          shipping_cost: formData.shipping_cost ? Number(formData.shipping_cost) : undefined,
          customs_fees: formData.customs_fees ? Number(formData.customs_fees) : undefined,
          additional_fees: formData.additional_fees ? Number(formData.additional_fees) : undefined,
          mailbox_tracking: formData.mailbox_tracking || undefined,
          notes: formData.notes || undefined,
          items: items.map(item => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost),
          })),
        };
        await batchesService.create(createData);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el lote');
      console.error('Error saving batch:', err);
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

  const itemsTotal = calculateItemsTotal();
  const totalCost = calculateTotalCost();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-kawa-black rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-kawa-black border-b border-gray-800 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            {batch ? 'Editar Lote' : 'Crear Nuevo Lote'}
          </h2>
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

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Lote (opcional)
              </label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white placeholder-gray-400"
                placeholder="Se generará automáticamente si no se especifica"
                disabled={!!batch}
              />
              <p className="text-xs text-gray-400 mt-1">
                Formato: LOTE-2026-001
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Fecha de Compra *
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white"
                required
                disabled={!!batch}
              />
            </div>

            {batch && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white"
                >
                  {BATCH_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tracking del Casillero
              </label>
              <input
                type="text"
                value={formData.mailbox_tracking}
                onChange={(e) => setFormData({ ...formData, mailbox_tracking: e.target.value })}
                className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white placeholder-gray-400"
                placeholder="Ej: 1234567890"
              />
            </div>
          </div>

          {/* Cost Information */}
          <div className="bg-kawa-gray/50 p-4 rounded-lg space-y-4 border border-gray-800">
            <h3 className="font-semibold text-white">Información de Costos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Costo Total de Compra *
                </label>
                <input
                  type="number"
                  value={formData.purchase_total_cost}
                  onChange={(e) => setFormData({ ...formData, purchase_total_cost: e.target.value })}
                  className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white placeholder-gray-400"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Costo de Envío
                </label>
                <input
                  type="number"
                  value={formData.shipping_cost}
                  onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
                  className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white placeholder-gray-400"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tarifas de Aduana
                </label>
                <input
                  type="number"
                  value={formData.customs_fees}
                  onChange={(e) => setFormData({ ...formData, customs_fees: e.target.value })}
                  className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white placeholder-gray-400"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tarifas Adicionales
                </label>
                <input
                  type="number"
                  value={formData.additional_fees}
                  onChange={(e) => setFormData({ ...formData, additional_fees: e.target.value })}
                  className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white placeholder-gray-400"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="bg-kawa-black p-4 rounded border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-white">Costo Total del Lote:</span>
                <span className="text-2xl font-bold text-kawa-green">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white">Productos del Lote</h3>
              <button
                type="button"
                onClick={openProductSelector}
                className="flex items-center gap-2 px-4 py-2 bg-kawa-green text-black font-semibold rounded-lg hover:bg-green-600 transition-colors"
              >
                <Plus size={20} />
                {items.length === 0 ? 'Seleccionar Productos' : 'Modificar Productos'}
              </button>
            </div>

              {items.length === 0 ? (
                <div className="text-center py-8 bg-kawa-gray/50 rounded-lg border border-gray-800">
                  <p className="text-gray-400">No hay productos en el lote</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Haz clic en "Seleccionar Productos" para comenzar
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-kawa-gray/50 border border-gray-800 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-kawa-black">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Producto</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Cantidad</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Costo Unit.</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {items.map((item, index) => {
                          const product = item.product || products.find(p => p.id === item.product_id);
                          return (
                            <tr key={index} className="hover:bg-kawa-gray/30">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {product?.product_images?.[0]?.url && (
                                    <img
                                      src={product.product_images[0].url}
                                      alt={product.name}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-white">{product?.name}</p>
                                    <p className="text-xs text-gray-400">{product?.categories?.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-white">{item.quantity}</td>
                              <td className="px-4 py-3 text-right text-white">{formatCurrency(item.unit_cost)}</td>
                              <td className="px-4 py-3 text-right font-medium text-kawa-green">
                                {formatCurrency(Number(item.quantity) * Number(item.unit_cost))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-kawa-green/10 p-4 rounded-lg border border-kawa-green/30">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">Total de Items:</span>
                      <span className="text-xl font-bold text-kawa-green">
                        {formatCurrency(itemsTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 bg-kawa-gray border border-gray-700 rounded-lg focus:ring-2 focus:ring-kawa-green focus:border-transparent text-white placeholder-gray-400"
              rows={3}
              placeholder="Notas adicionales sobre el lote..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
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
                  <Loader2 size={20} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                batch ? 'Actualizar Lote' : 'Crear Lote'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <ProductSelectorModal
          products={products}
          selectedProducts={items}
          onClose={() => setShowProductSelector(false)}
          onConfirm={handleProductsSelected}
        />
      )}
    </div>
  );
}
