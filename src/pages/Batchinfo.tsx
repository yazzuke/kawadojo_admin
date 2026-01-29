import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Package } from 'lucide-react';
import { batchesService } from '../services/batchesService';
import type { BatchWithMetrics } from '../types/batch';
import { BATCH_STATUSES } from '../types/batch';
import BatchModal from '../components/BatchModal';

export default function BatchInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<BatchWithMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'sold' | 'available'>('all');

  useEffect(() => {
    if (id) {
      loadBatch();
    }
  }, [id]);

  const loadBatch = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const data = await batchesService.getMetrics(id);
      setBatch(data);
    } catch (error) {
      console.error('Error loading batch:', error);
      navigate('/batches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await batchesService.delete(id);
      navigate('/batches');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar el lote');
      console.error('Error deleting batch:', error);
    }
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    loadBatch();
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
        return batch.items.filter(item => !item.product.in_stock);
      case 'available':
        return batch.items.filter(item => item.product.in_stock);
      default:
        return batch.items;
    }
  };

  const soldCount = batch?.items.filter(item => !item.product.in_stock).length || 0;
  const availableCount = batch?.items.filter(item => item.product.in_stock).length || 0;

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
            onClick={() => navigate('/batches')}
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
          <h3 className="text-xl font-semibold text-white">Productos en el Lote</h3>
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
          </div>
        </div>
        <div className="space-y-3">
          {getFilteredItems().length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No hay productos {stockFilter === 'sold' ? 'vendidos' : stockFilter === 'available' ? 'disponibles' : ''} en este lote
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
                    <p className="font-medium text-white">{item.product.name}</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      item.product.in_stock
                        ? 'bg-green-900 bg-opacity-50 text-green-400 border border-green-700'
                        : 'bg-red-900 bg-opacity-50 text-red-400 border border-red-700'
                    }`}>
                      {item.product.in_stock ? 'Disponible' : 'Vendido'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Cantidad: {item.quantity} unidades
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Subtotal Costo</p>
                  <p className="font-bold text-white text-lg">
                    {formatCurrency(item.quantity * item.unit_cost)}
                  </p>
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
                    <p className="text-sm font-medium text-green-400">{formatCurrency(item.metrics.profit_per_unit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ganancia Total</p>
                    <p className="text-sm font-bold text-kawa-green">{formatCurrency(item.metrics.potential_profit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Margen</p>
                    <p className="text-sm font-bold text-yellow-400">{item.metrics.margin_percentage.toFixed(1)}%</p>
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
    </div>
  );
}
