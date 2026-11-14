import { useEffect, useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Package, Copy, AlertTriangle, Undo2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { batchesService } from '../services/batchesService';
import { productService } from '../services/productService';
import type { BatchWithMetrics, BatchItem } from '../types/batch';
import type { Product } from '../types/product';
import { BATCH_STATUSES } from '../types/batch';
import BatchModal from '../components/BatchModal';
import ProductModal from '../components/ProductModal';

// Vendido = ya no está en la tienda y no llegó dañado; disponible = en tienda o en camino
const isSold = (item: BatchItem) => !item.damaged && !item.product.in_stock && !item.product.is_incoming;
const isAvailable = (item: BatchItem) => !item.damaged && (item.product.in_stock || item.product.is_incoming);

interface BatchInfoPageProps {
  batchId: string;
  onBack?: () => void;
  onDeleted?: () => void;
}

export default function BatchInfoPage({ batchId, onBack, onDeleted }: BatchInfoPageProps) {
  const [batch, setBatch] = useState<BatchWithMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'sold' | 'available' | 'damaged'>('all');
  // Unidad que se está marcando como dañada
  const [damageItem, setDamageItem] = useState<BatchItem | null>(null);
  const [damageAmount, setDamageAmount] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [damageSaving, setDamageSaving] = useState(false);

  useEffect(() => {
    if (batchId) {
      loadBatch();
    }
  }, [batchId]);

  const loadBatch = async () => {
    if (!batchId) return;
    
    try {
      setIsLoading(true);
      const data = await batchesService.getMetrics(batchId);
      setBatch(data);
    } catch (error) {
      console.error('Error loading batch:', error);
      onBack?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!batchId) return;
    
    try {
      await batchesService.delete(batchId);
      onDeleted?.();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar el lote');
      console.error('Error deleting batch:', error);
    }
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    loadBatch();
  };

  const handleProductEdit = async (productId: string) => {
    try {
      const product = await productService.getById(productId);
      setEditingProduct(product);
      setIsProductModalOpen(true);
    } catch (error) {
      console.error('Error loading product for edit:', error);
      alert('No se pudo cargar la información del producto para editar');
    }
  };

  const handleProductModalSuccess = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    loadBatch();
  };

  const handleBulkUpdate = async (updates: { in_stock?: boolean; is_incoming?: boolean }) => {
    if (!batch?.items?.length) return;
    
    if (!window.confirm(`¿Estás seguro de marcar todos los ${batch.items.length} productos con este estado?`)) {
      return;
    }

    try {
      // Las unidades dañadas no se tocan: no deben volver a la tienda
      const productIds = batch.items.filter(item => !item.damaged).map(item => item.product_id);
      await productService.batchUpdateProducts(productIds, updates);
      loadBatch(); // Recargar para ver los cambios
    } catch (error) {
      console.error('Error updating products:', error);
      alert('Hubo un error al actualizar los productos masivamente.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusInfo = (status: string) => {
    return BATCH_STATUSES.find(s => s.value === status) || BATCH_STATUSES[0];
  };

  const getFilteredItems = () => {
    if (!batch?.items) return [];
    
    switch (stockFilter) {
      case 'sold':
        return batch.items.filter(isSold);
      case 'available':
        return batch.items.filter(isAvailable);
      case 'damaged':
        return batch.items.filter(item => item.damaged);
      default:
        return batch.items;
    }
  };

  const handleCopyNameAndPrice = (item: any) => {
    const price = item.metrics?.selling_price || item.product.price || 0;
    const text = `${item.product.name}\t${price}`;
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const handleCopyAll = () => {
    const itemsToCopy = getFilteredItems();
    if (itemsToCopy.length === 0) {
      toast.error('No hay productos para copiar');
      return;
    }
    const text = itemsToCopy.map(item => {
      const price = item.metrics?.selling_price || item.product.price || 0;
      return `${item.product.name}\t${price}`;
    }).join('\n');
    
    navigator.clipboard.writeText(text);
    toast.success(`Copiados ${itemsToCopy.length} productos al portapapeles`);
  };

  const soldCount = batch?.items.filter(isSold).length || 0;
  const availableCount = batch?.items.filter(isAvailable).length || 0;
  const damagedCount = batch?.items.filter(item => item.damaged).length || 0;

  const openDamage = (item: BatchItem) => {
    setDamageItem(item);
    setDamageAmount('');
    setDamageNotes('');
  };

  const saveDamage = async () => {
    if (!batch || !damageItem) return;
    const amount = damageAmount.trim() === '' ? undefined : Number(damageAmount.replace(/\D/g, ''));
    setDamageSaving(true);
    try {
      await batchesService.markDamaged(batch.id, damageItem.id, { amount, notes: damageNotes.trim() || undefined });
      toast.success('Marcado como dañado. Ya no aparece en la tienda y su costo quedó como pérdida.');
      setDamageItem(null);
      await loadBatch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'No se pudo marcar como dañado');
    } finally {
      setDamageSaving(false);
    }
  };

  const undoDamage = async (item: BatchItem) => {
    if (!batch) return;
    if (!window.confirm('¿Quitar la marca de dañado? Se borra la pérdida y el producto vuelve a estar disponible en la tienda.')) return;
    try {
      await batchesService.unmarkDamaged(batch.id, item.id);
      toast.success('Listo, ya no está marcado como dañado');
      await loadBatch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'No se pudo deshacer');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <Package size={48} className="mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400 text-lg">Lote no encontrado</p>
      </div>
    );
  }

  const statusInfo = getStatusInfo(batch.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onBack?.()}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{batch.batch_number}</h1>
            <span className={`mt-2 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Edit2 size={18} />
            Editar
          </button>
          {deleteConfirm ? (
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-900 bg-opacity-30 p-4 rounded-lg border border-blue-800">
          <p className="text-sm text-gray-400">Total Productos</p>
          <p className="text-2xl font-bold text-white">{batch.metrics.total_products}</p>
        </div>
        <div className="bg-green-900 bg-opacity-30 p-4 rounded-lg border border-green-800">
          <p className="text-sm text-gray-400">Vendidos</p>
          <p className="text-2xl font-bold text-green-400">{batch.metrics.total_sold}</p>
        </div>
        <div className="bg-yellow-900 bg-opacity-30 p-4 rounded-lg border border-yellow-800">
          <p className="text-sm text-gray-400">Restantes</p>
          <p className="text-2xl font-bold text-yellow-400">{batch.metrics.remaining}</p>
          {!!batch.metrics.damaged && (
            <p className="text-xs text-orange-400 mt-1">{batch.metrics.damaged} {batch.metrics.damaged === 1 ? 'llegó dañado' : 'llegaron dañados'}</p>
          )}
        </div>
        <div className="bg-purple-900 bg-opacity-30 p-4 rounded-lg border border-purple-800">
          <p className="text-sm text-gray-400">Completado</p>
          <p className="text-2xl font-bold text-purple-400">
            {batch.metrics.completion_percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-kawa-black p-6 rounded-lg border border-gray-800">
          <p className="text-sm text-gray-400 mb-2">Inversión Total</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(batch.total_cost)}
          </p>
          {batch.summary && (
            <p className="text-xs text-gray-500 mt-2">
              Productos: {formatCurrency(batch.summary.total_product_cost)}<br />
              Envíos & Fees: {formatCurrency(batch.summary.total_shipping_and_fees)}
            </p>
          )}
        </div>
        <div className="bg-yellow-900 bg-opacity-30 p-6 rounded-lg border border-yellow-800">
          <p className="text-sm text-gray-400 mb-2">Potencial Total</p>
          <p className="text-2xl font-bold text-yellow-400">
            {batch.summary ? formatCurrency(batch.summary.total_potential_revenue) : formatCurrency(0)}
          </p>
          {batch.summary && (
            <p className="text-xs text-gray-500 mt-2">
              Margen: {batch.summary.average_margin_percentage}%
            </p>
          )}
        </div>
        <div className={`p-6 rounded-lg border ${batch.summary && parseFloat(batch.summary.roi_percentage) >= 0 ? 'bg-green-900 bg-opacity-30 border-green-800' : 'bg-red-900 bg-opacity-30 border-red-800'}`}>
          <p className="text-sm text-gray-400 mb-2">Ganancia Potencial</p>
          <p className={`text-2xl font-bold ${batch.summary && parseFloat(batch.summary.roi_percentage) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {batch.summary ? formatCurrency(batch.summary.total_potential_profit) : formatCurrency(0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            ROI: {batch.summary?.roi_percentage || '0.00'}%
          </p>
        </div>
      </div>

      {/* Sold Performance - Real vs Potential */}
      {batch.metrics && batch.metrics.total_sold > 0 && (
        <div className="bg-blue-900 bg-opacity-20 p-6 rounded-lg border border-blue-800">
          <h3 className="text-xl font-semibold text-white mb-4">Rendimiento de Ventas (Real)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Ingresos Generados</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(batch.metrics.revenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Ganancia Real</p>
              <p className={`text-2xl font-bold ${batch.metrics.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(batch.metrics.profit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">ROI Real</p>
              <p className="text-2xl font-bold text-blue-400">
                {batch.metrics.roi.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown */}
        <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
          <h3 className="text-xl font-semibold text-white mb-4">Desglose de Costos</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Costo de compra:</span>
              <span className="font-medium text-gray-200">{formatCurrency(batch.purchase_total_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Envío:</span>
              <span className="font-medium text-gray-200">{formatCurrency(batch.shipping_cost)}</span>
            </div>
            {batch.customs_fees && (
              <div className="flex justify-between">
                <span className="text-gray-400">Aduana:</span>
                <span className="font-medium text-gray-200">{formatCurrency(batch.customs_fees)}</span>
              </div>
            )}
            {batch.additional_fees && (
              <div className="flex justify-between">
                <span className="text-gray-400">Fees adicionales:</span>
                <span className="font-medium text-gray-200">{formatCurrency(batch.additional_fees)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-gray-700">
              <span className="font-semibold text-white text-base">Total:</span>
              <span className="font-bold text-kawa-green text-base">{formatCurrency(batch.total_cost)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
          <h3 className="text-xl font-semibold text-white mb-4">Timeline</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Fecha de compra:</span>
              <span className="font-medium text-gray-200">{formatDate(batch.purchase_date)}</span>
            </div>
            {batch.arrived_mailbox_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Llegó a casillero:</span>
                <span className="font-medium text-gray-200">{formatDate(batch.arrived_mailbox_at)}</span>
              </div>
            )}
            {batch.shipped_to_colombia_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Enviado a Colombia:</span>
                <span className="font-medium text-gray-200">{formatDate(batch.shipped_to_colombia_at)}</span>
              </div>
            )}
            {batch.delivered_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Entregado:</span>
                <span className="font-medium text-gray-200">{formatDate(batch.delivered_at)}</span>
              </div>
            )}
            {batch.mailbox_tracking && (
              <div className="flex justify-between pt-3 border-t border-gray-700">
                <span className="text-gray-400">Tracking:</span>
                <span className="font-medium text-gray-200">{batch.mailbox_tracking}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-semibold text-white">Productos en el Lote</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkUpdate({ is_incoming: true, in_stock: false })}
                className="px-3 py-1.5 text-xs bg-orange-600/20 text-orange-500 border border-orange-600/50 hover:bg-orange-600 hover:text-white rounded transition-colors flex items-center gap-1"
              >
                <Package size={14} /> Todo En Camino
              </button>
              <button
                onClick={() => handleBulkUpdate({ is_incoming: false, in_stock: true })}
                className="px-3 py-1.5 text-xs bg-green-600/20 text-green-500 border border-green-600/50 hover:bg-green-600 hover:text-white rounded transition-colors flex items-center gap-1"
              >
                <Package size={14} /> Todo Disponible
              </button>
              <button
                onClick={handleCopyAll}
                className="px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/50 hover:bg-blue-600 hover:text-white rounded transition-colors flex items-center gap-1"
              >
                <Copy size={14} /> Copiar Lista para Excel
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                stockFilter === 'all'
                  ? 'bg-kawa-green text-kawa-black font-semibold'
                  : 'bg-kawa-black text-gray-400 hover:text-white'
              }`}
            >
              Todos ({batch?.items.length || 0})
            </button>
            <button
              onClick={() => setStockFilter('sold')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                stockFilter === 'sold'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'bg-kawa-black text-gray-400 hover:text-white'
              }`}
            >
              Vendidos ({soldCount})
            </button>
            <button
              onClick={() => setStockFilter('available')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                stockFilter === 'available'
                  ? 'bg-green-600 text-white font-semibold'
                  : 'bg-kawa-black text-gray-400 hover:text-white'
              }`}
            >
              Disponibles ({availableCount})
            </button>
            {damagedCount > 0 && (
              <button
                onClick={() => setStockFilter('damaged')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  stockFilter === 'damaged'
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'bg-kawa-black text-gray-400 hover:text-white'
                }`}
              >
                Dañados ({damagedCount})
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {getFilteredItems().length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No hay productos {stockFilter === 'sold' ? 'vendidos' : stockFilter === 'available' ? 'disponibles' : stockFilter === 'damaged' ? 'dañados' : ''} en este lote
            </div>
          ) : (
            getFilteredItems().map((item) => (
            <div key={item.id} className="flex flex-col gap-3 p-4 bg-kawa-black rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-4">
                {item.product.product_images[0] && (
                  <img
                    src={item.product.product_images[0].url}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 group">
                      <p className="font-medium text-white">{item.product.name}</p>
                      <button
                        onClick={() => handleCopyNameAndPrice(item)}
                        className="text-gray-400 hover:text-kawa-green transition-all"
                        title="Copiar nombre y precio"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    {item.damaged ? (
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded bg-orange-950 text-orange-300 border border-orange-600 inline-flex items-center gap-1"
                        title={item.damaged.notes || undefined}
                      >
                        <AlertTriangle size={12} /> Dañado · pérdida {formatCurrency(item.damaged.amount)}
                      </span>
                    ) : (
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      item.product.is_incoming
                        ? 'bg-orange-900 bg-opacity-50 text-orange-400 border border-orange-700'
                        : item.product.in_stock
                        ? 'bg-green-900 bg-opacity-50 text-green-400 border border-green-700'
                        : 'bg-red-900 bg-opacity-50 text-red-400 border border-red-700'
                    }`}>
                      {item.product.is_incoming ? 'En Camino' : (item.product.in_stock ? 'Disponible' : 'Vendido')}
                    </span>
                    )}
                    {!item.damaged && !item.product.is_incoming && !item.product.in_stock && item.product.order_items && item.product.order_items.length > 0 && (
                      <a
                        href={`/orders/${item.product.order_items[0].order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs font-semibold rounded bg-blue-900 bg-opacity-50 text-blue-400 border border-blue-700 hover:bg-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Ver Orden"
                      >
                        {item.product.order_items[0].order.order_number}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Cantidad: {item.quantity} unidades
                  </p>
                  {item.damaged?.notes && (
                    <p className="text-xs text-orange-300/80 mt-1">Nota: {item.damaged.notes}</p>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Subtotal Costo</p>
                    <p className="font-bold text-white text-lg">
                      {formatCurrency(item.quantity * item.unit_cost)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleProductEdit(item.product_id)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                  {item.damaged ? (
                    <button
                      type="button"
                      onClick={() => undoDamage(item)}
                      className="flex items-center gap-1 ml-auto text-xs text-gray-400 hover:text-white"
                      title="Borra la pérdida y lo vuelve a poner disponible"
                    >
                      <Undo2 size={12} /> No estaba dañado
                    </button>
                  ) : isAvailable(item) && (
                    <button
                      type="button"
                      onClick={() => openDamage(item)}
                      className="flex items-center gap-1 ml-auto text-xs text-orange-400 hover:text-orange-300"
                      title="Llegó dañado: sale de la tienda y su costo queda como pérdida"
                    >
                      <AlertTriangle size={12} /> Llegó dañado
                    </button>
                  )}
                </div>
              </div>
              
              {/* Product Metrics */}
              {item.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500">Costo Unit.</p>
                    <p className="text-sm font-medium text-gray-300">{formatCurrency(item.metrics.cost_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Precio Venta</p>
                    <p className="text-sm font-medium text-white">{formatCurrency(item.metrics.selling_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ganancia/Unidad</p>
                    <p className={`text-sm font-medium ${item.metrics.profit_per_unit < 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(item.metrics.profit_per_unit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ganancia Total</p>
                    <p className={`text-sm font-bold ${item.metrics.potential_profit < 0 ? 'text-red-400' : 'text-kawa-green'}`}>{formatCurrency(item.metrics.potential_profit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Margen</p>
                    <p className={`text-sm font-bold ${item.metrics.margin_percentage < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{item.metrics.margin_percentage.toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </div>
          ))
          )}
        </div>
      </div>

      {/* Notes */}
      {batch.notes && (
        <div className="bg-yellow-900 bg-opacity-20 p-6 rounded-lg border border-yellow-800">
          <h3 className="text-xl font-semibold text-white mb-3">Notas</h3>
          <p className="text-gray-300">{batch.notes}</p>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && batch && (
        <BatchModal
          batch={batch}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Marcar como dañado */}
      {damageItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-kawa-gray rounded-xl max-w-md w-full border border-gray-800">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white inline-flex items-center gap-2">
                <AlertTriangle size={20} className="text-orange-400" /> Llegó dañado
              </h2>
              <button onClick={() => setDamageItem(null)} className="text-gray-400 hover:text-white">
                <X size={22} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-300">{damageItem.product.name}</p>
              <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
                <li>Sale de la tienda (queda agotado) para que nadie lo compre.</li>
                <li>Su costo se registra como pérdida "Producto dañado" y baja la ganancia en Finanzas.</li>
                <li>En el lote deja de contarse como pendiente por vender.</li>
              </ul>
              <div>
                <label className="block text-sm text-gray-300 mb-1">¿Cuánto perdiste?</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={damageAmount}
                  onChange={(e) => setDamageAmount(e.target.value)}
                  placeholder="Vacío = lo que costó puesto aquí"
                  className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si lo dejas vacío se usa el costo con envío y aduana incluidos. Si el vendedor te devolvió algo o lo vas a vender barato para repuestos, pon solo lo que de verdad perdiste.
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  placeholder="ej: vino con un imán suelto"
                  className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDamageItem(null)}
                  className="flex-1 py-2 border border-gray-700 rounded-lg text-white hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveDamage}
                  disabled={damageSaving}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-semibold disabled:opacity-50"
                >
                  {damageSaving ? 'Guardando...' : 'Marcar como dañado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProductModalOpen && editingProduct && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSuccess={handleProductModalSuccess}
        />
      )}
    </div>
  );
}
