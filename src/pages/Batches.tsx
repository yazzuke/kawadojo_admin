import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, DollarSign, Eye, Trash2, Edit2, Filter, ShoppingCart, Archive } from 'lucide-react';
import { batchesService } from '../services/batchesService';
import type { Batch, BatchSummary } from '../types/batch';
import { BATCH_STATUSES } from '../types/batch';
import BatchModal from '../components/BatchModal';

export default function BatchesPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredBatches(batches);
    } else {
      setFilteredBatches(batches.filter(b => b.status === filterStatus));
    }
  }, [filterStatus, batches]);

  const loadBatches = async () => {
    try {
      setIsLoading(true);
      const [batchesData, summaryData] = await Promise.all([
        batchesService.getAll(),
        batchesService.getSummary()
      ]);
      setBatches(batchesData);
      setFilteredBatches(batchesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading batches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (batch: Batch) => {
    navigate(`/batches/${batch.id}`);
  };

  const handleCreate = () => {
    setEditingBatch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await batchesService.delete(id);
      setBatches(batches.filter(b => b.id !== id));
      setDeleteConfirm(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar el lote');
      console.error('Error deleting batch:', error);
    }
  };

  const handleModalSuccess = () => {
    loadBatches();
    setIsModalOpen(false);
    setEditingBatch(null);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Lotes</h1>
          <p className="text-gray-400 mt-1">Administra tus lotes de productos y métricas</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-kawa-green hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nuevo Lote
        </button>
      </div>

      {/* Stats Cards */}
      {summary && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Lotes</p>
                  <p className="text-3xl font-bold text-white mt-1">{summary.overview.total_batches}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.overview.active_batches} activos
                  </p>
                </div>
                <Package className="text-kawa-green" size={40} />
              </div>
            </div>

            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Productos</p>
                  <p className="text-3xl font-bold text-white mt-1">{summary.overview.total_products_count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.overview.total_units} unidades
                  </p>
                </div>
                <ShoppingCart className="text-blue-500" size={40} />
              </div>
            </div>

            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Inversión Total</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(summary.financial.total_investment)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Compras: {formatCurrency(summary.financial.total_purchase_cost)}
                  </p>
                </div>
                <DollarSign className="text-yellow-500" size={40} />
              </div>
            </div>

            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Inventario</p>
                  <p className="text-3xl font-bold text-white mt-1">{summary.actual.remaining_units}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.actual.total_sold_units} vendidos
                  </p>
                </div>
                <Archive className="text-purple-500" size={40} />
              </div>
            </div>
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div>
                <p className="text-gray-400 text-sm mb-2">Potencial</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-white text-sm">Ingresos:</span>
                    <span className="text-green-400 font-medium">
                      {formatCurrency(summary.potential.total_potential_revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white text-sm">Ganancia Bruta:</span>
                    <span className="text-green-400 font-medium">
                      {formatCurrency(summary.potential.total_potential_profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white text-sm">ROI Bruto:</span>
                    <span className="text-kawa-green font-bold">{summary.potential.average_roi}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-700">
                    <span className="text-white text-sm">Ganancia Neta:</span>
                    <span className={`font-medium ${summary.potential.total_potential_profit_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(summary.potential.total_potential_profit_net)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white text-sm">ROI Neto:</span>
                    <span className={`font-bold ${parseFloat(summary.potential.net_roi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {summary.potential.net_roi}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div>
                <p className="text-gray-400 text-sm mb-2">Real</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-white text-sm">Ingresos:</span>
                    <span className="text-blue-400 font-medium">
                      {formatCurrency(summary.actual.total_actual_revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white text-sm">Egresos:</span>
                    <span className="text-red-400 font-medium">
                      {formatCurrency(summary.actual.total_outflows)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white text-sm">Ganancia:</span>
                    <span className={`font-medium ${
                      summary.actual.real_profit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(summary.actual.real_profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white text-sm">vs Inversión:</span>
                    <span className={`font-medium ${
                      summary.actual.profit_vs_investment >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(summary.actual.profit_vs_investment)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white text-sm">Margen:</span>
                    <span className="text-kawa-green font-bold">
                      {summary.actual.sales_margin}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white text-sm">ROI:</span>
                    <span className={`font-bold ${
                      parseFloat(summary.actual.actual_roi) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {summary.actual.actual_roi}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div>
                <p className="text-gray-400 text-sm mb-2">Progreso</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">Completado</span>
                      <span className="text-kawa-green font-bold">{summary.actual.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-kawa-green h-2 rounded-full transition-all"
                        style={{ width: `${summary.actual.completion_percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Compras:</span>
                        <span>{formatCurrency(summary.financial.total_purchase_cost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Envíos:</span>
                        <span>{formatCurrency(summary.financial.total_shipping_cost)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Outflows Breakdown */}
          <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
            <h3 className="text-white font-semibold mb-4">Desglose de Egresos</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-kawa-black p-4 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Gastos Operativos</p>
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(summary.outflows_summary.expenses)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary.expenses.count} registros</p>
              </div>
              <div className="bg-kawa-black p-4 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Intereses</p>
                <p className="text-lg font-bold text-yellow-400">
                  {formatCurrency(summary.outflows_summary.interests)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary.interests.count} registros</p>
              </div>
              <div className="bg-kawa-black p-4 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Pérdidas</p>
                <p className="text-lg font-bold text-orange-400">
                  {formatCurrency(summary.outflows_summary.losses)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary.losses.count} registros</p>
              </div>
              <div className="bg-kawa-black p-4 rounded-lg border border-red-800">
                <p className="text-xs text-gray-400 mb-1">Total Egresos</p>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(summary.outflows_summary.total)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* By Status */}
      {summary && (
        <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
          <h3 className="text-white font-semibold mb-4">Lotes por Estado</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {BATCH_STATUSES.map(status => (
              <div key={status.value} className="text-center">
                <div className={`${status.color} text-white rounded-lg p-3 mb-2`}>
                  <p className="text-2xl font-bold">
                    {summary.by_status[status.value as keyof typeof summary.by_status]}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{status.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-kawa-gray p-4 rounded-lg shadow-sm border border-gray-800">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            {BATCH_STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-kawa-gray rounded-lg shadow-sm border border-gray-800 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-kawa-black">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lote
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Compra
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Costo Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-kawa-gray divide-y divide-gray-800">
            {filteredBatches.map((batch) => {
              const statusInfo = getStatusInfo(batch.status);
              const totalItems = batch.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <tr key={batch.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-white">{batch.batch_number}</div>
                    {batch.mailbox_tracking && (
                      <div className="text-sm text-gray-400">
                        Tracking: {batch.mailbox_tracking}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(batch.purchase_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {totalItems} productos
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {formatCurrency(batch.total_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(batch)}
                        className="text-blue-400 hover:text-blue-300"
                        title="Ver detalles"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(batch)}
                        className="text-yellow-400 hover:text-yellow-300"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      {deleteConfirm === batch.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(batch.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-400 hover:text-gray-300 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(batch.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredBatches.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No hay lotes para mostrar</p>
            <p className="text-gray-500 text-sm mt-1">
              {filterStatus !== 'all' 
                ? 'Prueba con otro filtro o crea un nuevo lote' 
                : 'Comienza creando tu primer lote'}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Batch Modal */}
      {isModalOpen && (
        <BatchModal
          batch={editingBatch}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBatch(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
