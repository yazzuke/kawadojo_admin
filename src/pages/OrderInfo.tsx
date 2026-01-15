import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  Clock,
  Truck,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import type { Order, OrderStatus } from '../types/order';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../types/order';

export default function OrderInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [adminNote, setAdminNote] = useState('');
  
  // Payment verification states
  const [isVerifyingTransfer, setIsVerifyingTransfer] = useState(false);
  const [isVerifyingCash, setIsVerifyingCash] = useState(false);
  const [transferData, setTransferData] = useState({
    transfer_reference: '',
    transfer_bank: '',
    transfer_date: '',
    admin_notes: '',
  });
  const [cashData, setCashData] = useState({
    cash_received: 0,
    admin_notes: '',
  });

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const data = await orderService.getById(id!);
      setOrder(data);
      setTrackingNumber(data.tracking_number || '');
      setNewStatus(data.status);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!order || !newStatus) return;

    try {
      await orderService.updateStatus(order.id, {
        status: newStatus as OrderStatus,
        comment: statusComment,
      });
      await loadOrder();
      setIsEditingStatus(false);
      setStatusComment('');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handleUpdateTracking = async () => {
    if (!order || !trackingNumber.trim()) return;

    try {
      await orderService.updateTracking(order.id, trackingNumber);
      await loadOrder();
      setIsEditingTracking(false);
    } catch (error) {
      console.error('Error updating tracking:', error);
      alert('Error al actualizar el tracking');
    }
  };

  const handleVerifyTransfer = async () => {
    if (!order) return;

    try {
      await orderService.verifyTransfer(order.id, transferData);
      await loadOrder();
      setIsVerifyingTransfer(false);
      setTransferData({
        transfer_reference: '',
        transfer_bank: '',
        transfer_date: '',
        admin_notes: '',
      });
    } catch (error) {
      console.error('Error verifying transfer:', error);
      alert('Error al verificar la transferencia');
    }
  };

  const handleVerifyCash = async () => {
    if (!order) return;

    try {
      await orderService.verifyCash(order.id, cashData);
      await loadOrder();
      setIsVerifyingCash(false);
      setCashData({ cash_received: 0, admin_notes: '' });
    } catch (error) {
      console.error('Error verifying cash:', error);
      alert('Error al verificar el efectivo');
    }
  };

  const handleAddNote = async () => {
    if (!order || !adminNote.trim()) return;

    try {
      await orderService.addNote(order.id, adminNote);
      await loadOrder();
      setAdminNote('');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error al agregar nota');
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
      month: 'long',
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

  const getPaymentStatusInfo = (status: string) => {
    return PAYMENT_STATUSES.find((s) => s.value === status) || PAYMENT_STATUSES[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package size={48} className="mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400 text-lg">Orden no encontrada</p>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const payment = order.payments?.[0];
  const paymentStatusInfo = payment ? getPaymentStatusInfo(payment.status) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{order.order_number}</h1>
            <p className="text-gray-400 mt-1">
              Creada el {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-lg text-white font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-kawa-green" size={20} />
              <h2 className="text-xl font-semibold text-white">Información del Cliente</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Nombre</p>
                <p className="text-white font-medium">{order.user?.name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white font-medium">{order.user?.email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Teléfono</p>
                <p className="text-white font-medium">{order.user?.phone || 'No especificado'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-kawa-green" size={20} />
              <h2 className="text-xl font-semibold text-white">Dirección de Envío</h2>
            </div>
            {order.address ? (
              <div className="space-y-2">
                <p className="text-white font-medium">{order.address.label}</p>
                <p className="text-gray-300">
                  {order.address.street} #{order.address.number}
                  {order.address.apartment && ` - ${order.address.apartment}`}
                </p>
                <p className="text-gray-300">
                  {order.address.city}, {order.address.state}
                </p>
                <p className="text-gray-300">{order.address.zip_code}</p>
                <p className="text-gray-300">Tel: {order.address.phone}</p>
              </div>
            ) : (
              <p className="text-gray-400">No hay dirección registrada</p>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Package className="text-kawa-green" size={20} />
              <h2 className="text-xl font-semibold text-white">Productos</h2>
            </div>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 bg-kawa-black rounded-lg">
                  {item.product?.product_images?.[0] && (
                    <img
                      src={item.product.product_images[0].url}
                      alt={item.product_name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{item.product_name}</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Cantidad: {item.quantity} × {formatCurrency(item.product_price)}
                    </p>
                    {item.product?.condition && (
                      <p className="text-gray-500 text-xs mt-1">
                        Condición: {item.product.condition}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-6 border-t border-gray-700 space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Envío:</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-gray-700">
                <span>Total:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              {order.total_cost > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Costo:</span>
                  <span>{formatCurrency(order.total_cost)}</span>
                </div>
              )}
              {order.profit > 0 && (
                <div className="flex justify-between text-sm text-kawa-green">
                  <span>Ganancia:</span>
                  <span>{formatCurrency(order.profit)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status History */}
          <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-kawa-green" size={20} />
              <h2 className="text-xl font-semibold text-white">Historial de Estados</h2>
            </div>
            <div className="space-y-3">
              {order.status_history?.map((history) => {
                const historyStatusInfo = getStatusInfo(history.status);
                return (
                  <div key={history.id} className="flex gap-3 p-3 bg-kawa-black rounded-lg">
                    <div className={`w-2 rounded-full ${historyStatusInfo.color}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{historyStatusInfo.label}</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(history.created_at)}
                        </span>
                      </div>
                      {history.comment && (
                        <p className="text-gray-400 text-sm mt-1">{history.comment}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Status Management */}
          <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Gestionar Estado</h3>
            {!isEditingStatus ? (
              <button
                onClick={() => setIsEditingStatus(true)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Edit size={18} />
                Cambiar Estado
              </button>
            ) : (
              <div className="space-y-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Comentario (opcional)"
                  className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateStatus}
                    className="flex-1 flex items-center justify-center gap-2 bg-kawa-green hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Save size={18} />
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingStatus(false);
                      setNewStatus(order.status);
                      setStatusComment('');
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Info */}
          {payment && (
            <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="text-kawa-green" size={20} />
                <h3 className="text-lg font-semibold text-white">Información de Pago</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Método</p>
                  <p className="text-white font-medium">
                    {getPaymentMethodLabel(payment.payment_method)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Estado</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${paymentStatusInfo?.color}`}>
                    {paymentStatusInfo?.label}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Monto</p>
                  <p className="text-white font-bold text-lg">{formatCurrency(payment.amount)}</p>
                </div>

                {/* Verify Transfer */}
                {payment.payment_method === 'transfer' && payment.status === 'pending' && !isVerifyingTransfer && (
                  <button
                    onClick={() => setIsVerifyingTransfer(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Verificar Transferencia
                  </button>
                )}

                {isVerifyingTransfer && (
                  <div className="space-y-3 pt-3 border-t border-gray-700">
                    <input
                      type="text"
                      value={transferData.transfer_reference}
                      onChange={(e) => setTransferData({ ...transferData, transfer_reference: e.target.value })}
                      placeholder="Referencia"
                      className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white"
                    />
                    <input
                      type="text"
                      value={transferData.transfer_bank}
                      onChange={(e) => setTransferData({ ...transferData, transfer_bank: e.target.value })}
                      placeholder="Banco"
                      className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white"
                    />
                    <input
                      type="date"
                      value={transferData.transfer_date}
                      onChange={(e) => setTransferData({ ...transferData, transfer_date: e.target.value })}
                      className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white"
                    />
                    <textarea
                      value={transferData.admin_notes}
                      onChange={(e) => setTransferData({ ...transferData, admin_notes: e.target.value })}
                      placeholder="Notas (opcional)"
                      className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleVerifyTransfer}
                        className="flex-1 bg-kawa-green hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setIsVerifyingTransfer(false)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Verify Cash */}
                {payment.payment_method === 'cash' && payment.status === 'pending' && !isVerifyingCash && (
                  <button
                    onClick={() => setIsVerifyingCash(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Verificar Pago en Efectivo
                  </button>
                )}

                {isVerifyingCash && (
                  <div className="space-y-3 pt-3 border-t border-gray-700">
                    <input
                      type="number"
                      value={cashData.cash_received}
                      onChange={(e) => setCashData({ ...cashData, cash_received: parseFloat(e.target.value) })}
                      placeholder="Efectivo recibido"
                      className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white"
                    />
                    <textarea
                      value={cashData.admin_notes}
                      onChange={(e) => setCashData({ ...cashData, admin_notes: e.target.value })}
                      placeholder="Notas (opcional)"
                      className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleVerifyCash}
                        className="flex-1 bg-kawa-green hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setIsVerifyingCash(false)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tracking */}
          <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="text-kawa-green" size={20} />
              <h3 className="text-lg font-semibold text-white">Tracking</h3>
            </div>
            {!isEditingTracking ? (
              <div className="space-y-3">
                {order.tracking_number ? (
                  <div className="p-3 bg-kawa-black rounded-lg">
                    <p className="text-gray-400 text-sm">Número de seguimiento</p>
                    <p className="text-white font-medium">{order.tracking_number}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Sin tracking asignado</p>
                )}
                <button
                  onClick={() => setIsEditingTracking(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit size={18} />
                  {order.tracking_number ? 'Actualizar' : 'Agregar'} Tracking
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Número de tracking"
                  className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateTracking}
                    className="flex-1 flex items-center justify-center gap-2 bg-kawa-green hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Save size={18} />
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTracking(false);
                      setTrackingNumber(order.tracking_number || '');
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin Notes */}
          <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Notas de Administración</h3>
            {order.admin_notes && (
              <div className="mb-4 p-3 bg-kawa-black rounded-lg">
                <p className="text-gray-300 text-sm">{order.admin_notes}</p>
              </div>
            )}
            <div className="space-y-3">
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Agregar nota..."
                className="w-full px-3 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white resize-none"
                rows={3}
              />
              <button
                onClick={handleAddNote}
                disabled={!adminNote.trim()}
                className="w-full bg-kawa-green hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Agregar Nota
              </button>
            </div>
          </div>

          {/* Customer Notes */}
          {order.customer_notes && (
            <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-3">Notas del Cliente</h3>
              <p className="text-gray-300 text-sm">{order.customer_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
