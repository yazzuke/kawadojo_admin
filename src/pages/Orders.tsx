import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  DollarSign,
  ShoppingCart,
  Eye,
  Filter,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { orderService } from '../services/orderService';
import type { Order, SalesMetrics, OrderFilters } from '../types/order';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../types/order';
import type { User } from '../types/users';
import SelectUserModal from '../components/SelectUserModal';
import CreateUserModal from '../components/CreateUserModal';
import CreateOrderModal from '../components/CreateOrderModal';

// Estados que se pueden poner a varias órdenes a la vez (los que el servidor acepta)
const BULK_STATUSES = ORDER_STATUSES.filter((s) =>
  ['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(s.value)
);

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // El Dashboard puede abrir la lista ya filtrada: /orders?status=paid
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<OrderFilters>(() => {
    const status = searchParams.get('status');
    return status ? { status } : {};
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Selección para cambiar varias órdenes a la vez
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkComment, setBulkComment] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Modals state
  const [showSelectUser, setShowSelectUser] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [orderUser, setOrderUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, orders, searchTerm]);
  

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ordersData, metricsData] = await Promise.all([
        orderService.getAll(),
        orderService.getMetrics(),
      ]);
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.status) {
      filtered = filtered.filter((o) => o.status === filters.status);
    }

    if (filters.payment_method) {
      filtered = filtered.filter((o) => o.payments?.[0]?.payment_method === filters.payment_method);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((o) => 
        o.order_number.toLowerCase().includes(lowerSearch) ||
        (o.user?.name && o.user.name.toLowerCase().includes(lowerSearch))
      );
    }

    setFilteredOrders(filtered);
  };

  // Solo cuentan las seleccionadas que se ven con los filtros actuales
  const selectedOrders = filteredOrders.filter((o) => selected.has(o.id));
  const allVisibleSelected = filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(filteredOrders.map((o) => o.id)));
  };

  const clearSelection = () => {
    setSelected(new Set());
    setBulkStatus('');
    setBulkComment('');
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selectedOrders.length === 0) return;
    const label = getStatusInfo(bulkStatus).label;
    const toChange = selectedOrders.filter((o) => o.status !== bulkStatus);
    const already = selectedOrders.length - toChange.length;

    if (toChange.length === 0) {
      toast(`Las ${selectedOrders.length} órdenes ya están en "${label}"`);
      return;
    }

    const warning = bulkStatus === 'cancelled'
      ? '\n\nOjo: al cancelar, los productos de esas órdenes vuelven a quedar disponibles en la tienda.'
      : '';
    if (!window.confirm(`¿Cambiar ${toChange.length} órdenes a "${label}"?${warning}`)) return;

    setBulkProgress({ done: 0, total: toChange.length });
    const failed: string[] = [];
    // Una por una, igual que si lo hicieras desde el detalle de cada orden
    for (const [i, order] of toChange.entries()) {
      try {
        await orderService.updateStatus(order.id, {
          status: bulkStatus as Order['status'],
          comment: bulkComment.trim() || 'Cambio en grupo desde la lista de órdenes',
        });
      } catch {
        failed.push(order.order_number);
      }
      setBulkProgress({ done: i + 1, total: toChange.length });
    }
    setBulkProgress(null);

    const ok = toChange.length - failed.length;
    if (ok > 0) toast.success(`${ok} órdenes quedaron en "${label}"${already ? ` (${already} ya lo estaban)` : ''}`);
    if (failed.length) toast.error(`No se pudieron cambiar: ${failed.join(', ')}`, { duration: 8000 });

    clearSelection();
    await loadData();
  };

  const handleViewDetails = (order: Order) => {
    navigate(`/orders/${order.id}`);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES.find((s) => s.value === status) || ORDER_STATUSES[0];
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Órdenes</h1>
          <p className="text-gray-400 mt-1">Administra todas las órdenes y métricas de ventas</p>
        </div>
        <button
          onClick={() => setShowSelectUser(true)}
          className="bg-kawa-green text-black font-bold py-2 px-4 rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Orden
        </button>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Órdenes</p>
                  <p className="text-3xl font-bold text-white mt-1">{metrics.total_orders}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.paid_orders} pagadas
                  </p>
                </div>
                <ShoppingCart className="text-kawa-green" size={40} />
              </div>
            </div>

            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(metrics.total_revenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Promedio: {formatCurrency(metrics.average_order_value)}
                  </p>
                </div>
                <DollarSign className="text-yellow-500" size={40} />
              </div>
            </div>

            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Items Vendidos</p>
                  <p className="text-3xl font-bold text-white mt-1">{metrics.total_items_sold}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.total_orders} órdenes
                  </p>
                </div>
                <Package className="text-blue-500" size={40} />
              </div>
            </div>

            <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pendientes</p>
                  <p className="text-3xl font-bold text-white mt-1">{metrics.pending_orders}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.cancelled_orders} canceladas
                  </p>
                </div>
                <Clock className="text-orange-500" size={40} />
              </div>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
            <h3 className="text-white font-semibold mb-4">Órdenes por Estado</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {ORDER_STATUSES.map((status) => (
                <div key={status.value} className="text-center">
                  <div className={`${status.color} text-white rounded-lg p-3 mb-2`}>
                    <p className="text-2xl font-bold">
                      {(metrics.orders_by_status && metrics.orders_by_status[status.value as keyof typeof metrics.orders_by_status]) || 0}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">{status.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-kawa-gray p-6 rounded-lg shadow-sm border border-gray-800">
            <h3 className="text-white font-semibold mb-4">Métodos de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PAYMENT_METHODS.map((method) => {
                const count = (metrics.orders_by_payment_method && metrics.orders_by_payment_method[method.value as keyof typeof metrics.orders_by_payment_method]) || 0;
                const percentage = metrics.total_orders > 0 ? ((count / metrics.total_orders) * 100).toFixed(1) : '0';
                
                return (
                  <div key={method.value} className="bg-kawa-black p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{method.label}</span>
                      <CreditCard className="text-kawa-green" size={20} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">{count}</span>
                      <span className="text-sm text-gray-400">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Filters */}
      <div className="bg-kawa-gray p-4 rounded-lg shadow-sm border border-gray-800">
        <div className="flex flex-col lg:flex-row items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <Filter size={20} className="text-gray-400 hidden sm:block" />
            
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              className="px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent w-full sm:w-auto"
            >
              <option value="">Todos los estados</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={filters.payment_method || ''}
              onChange={(e) => setFilters({ ...filters, payment_method: e.target.value || undefined })}
              className="px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent w-full sm:w-auto"
            >
              <option value="">Todos los métodos de pago</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            {(filters.status || filters.payment_method) && (
              <button
                onClick={() => setFilters({})}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors w-full sm:w-auto"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="relative w-full lg:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar orden o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Barra para cambiar varias órdenes a la vez */}
      {selectedOrders.length > 0 && (
        <div className="sticky top-2 z-20 bg-kawa-black border border-kawa-green/60 rounded-lg p-3 flex flex-wrap items-center gap-3 shadow-lg">
          <span className="text-white font-semibold text-sm">
            {selectedOrders.length} {selectedOrders.length === 1 ? 'orden seleccionada' : 'órdenes seleccionadas'}
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            disabled={!!bulkProgress}
            className="px-3 py-2 bg-kawa-gray border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-kawa-green focus:border-transparent"
          >
            <option value="">Cambiar estado a...</option>
            {BULK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={bulkComment}
            onChange={(e) => setBulkComment(e.target.value)}
            disabled={!!bulkProgress}
            placeholder="Nota (opcional), ej: enviadas por Interrapidísimo"
            className="flex-1 min-w-[200px] px-3 py-2 bg-kawa-gray border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-kawa-green focus:border-transparent"
          />
          <button
            onClick={applyBulkStatus}
            disabled={!bulkStatus || !!bulkProgress}
            className="bg-kawa-green text-black font-bold text-sm py-2 px-4 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkProgress ? `Cambiando ${bulkProgress.done}/${bulkProgress.total}...` : 'Aplicar'}
          </button>
          <button
            onClick={clearSelection}
            disabled={!!bulkProgress}
            className="text-gray-400 hover:text-white text-sm inline-flex items-center gap-1 disabled:opacity-40"
          >
            <X size={16} /> Quitar selección
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-kawa-gray rounded-lg shadow-sm border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-kawa-black">
              <tr>
                <th className="pl-6 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    title="Seleccionar todas las que se ven"
                    className="w-4 h-4 accent-kawa-green cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Orden
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-kawa-gray divide-y divide-gray-800">
              {filteredOrders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const itemsCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                const payment = order.payments?.[0];
                const paymentMethod = payment?.payment_method || 'N/A';
                const paymentStatus = payment?.status || 'N/A';

                return (
                  <tr key={order.id} className={selected.has(order.id) ? 'bg-kawa-green/10 hover:bg-gray-800' : 'hover:bg-gray-800'}>
                    <td className="pl-6 pr-2 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        aria-label={`Seleccionar ${order.order_number}`}
                        className="w-4 h-4 accent-kawa-green cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">{order.order_number}</div>
                      <div className="text-sm text-gray-400">{itemsCount} items</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white">{order.user?.name || 'N/A'}</div>
                      <div className="text-sm text-gray-400">{order.user?.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white text-sm">{getPaymentMethodLabel(paymentMethod)}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {paymentStatus === 'paid' ? (
                          <CheckCircle size={14} className="text-green-400" />
                        ) : (
                          <XCircle size={14} className="text-yellow-400" />
                        )}
                        <span className="text-xs text-gray-400">{paymentStatus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                        title="Ver detalles"
                      >
                        <Eye size={18} />
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No hay órdenes para mostrar</p>
            <p className="text-gray-500 text-sm mt-1">
              {filters.status || filters.payment_method
                ? 'Prueba con otros filtros'
                : 'Las órdenes aparecerán aquí'}
            </p>
          </div>
        )}
      </div>

      <SelectUserModal
        isOpen={showSelectUser}
        onClose={() => setShowSelectUser(false)}
        onSelectUser={(user) => {
          setOrderUser(user);
        }}
        onCreateNew={() => {
          setShowCreateUser(true);
        }}
      />

      <CreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onSuccess={(newUser) => {
          setOrderUser(newUser); // Open create order directly with new user
        }}
      />

      <CreateOrderModal
        isOpen={orderUser !== null}
        onClose={() => setOrderUser(null)}
        user={orderUser}
        onSuccess={() => {
          loadData(); // Refresh orders list
        }}
      />
    </div>
  );
}
