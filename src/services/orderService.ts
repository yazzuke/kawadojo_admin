import api from './api';
import type {
  Order,
  OrderFilters,
  SalesMetrics,
  SalesByPeriod,
  TopProduct,
  OrdersByStatus,
  UpdateOrderStatusData,
  UpdateOrderData,
  VerifyTransferData,
  VerifyCashData,
} from '../types/order';

export const orderService = {
  // Listar todas las órdenes con filtros
  async getAll(filters?: OrderFilters): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.payment_method) params.append('payment_method', filters.payment_method);
    if (filters?.from_date) params.append('from_date', filters.from_date.toISOString());
    if (filters?.to_date) params.append('to_date', filters.to_date.toISOString());

    const response = await api.get<Order[]>(`/orders?${params.toString()}`);
    return response.data;
  },

  // Obtener orden por ID
  async getById(id: string): Promise<Order> {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data;
  },

  // Obtener orden por número
  async getByOrderNumber(orderNumber: string): Promise<Order> {
    const response = await api.get<Order>(`/orders/number/${orderNumber}`);
    return response.data;
  },

  // Obtener órdenes de un usuario
  async getByUserId(userId: string): Promise<Order[]> {
    const response = await api.get<Order[]>(`/orders/user/${userId}`);
    return response.data;
  },

  // Obtener métricas de ventas
  async getMetrics(fromDate?: Date, toDate?: Date): Promise<SalesMetrics> {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate.toISOString());
    if (toDate) params.append('to_date', toDate.toISOString());

    const response = await api.get<SalesMetrics>(`/orders/metrics?${params.toString()}`);
    return response.data;
  },

  // Obtener ventas por período
  async getSalesByPeriod(period: 'day' | 'week' | 'month' = 'month', limit: number = 12): Promise<SalesByPeriod[]> {
    const params = new URLSearchParams();
    params.append('period', period);
    params.append('limit', limit.toString());

    const response = await api.get<SalesByPeriod[]>(`/orders/metrics/period?${params.toString()}`);
    return response.data;
  },

  // Obtener top productos
  async getTopProducts(limit: number = 10): Promise<TopProduct[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    const response = await api.get<TopProduct[]>(`/orders/metrics/top-products?${params.toString()}`);
    return response.data;
  },

  // Obtener órdenes por estado
  async getOrdersByStatus(): Promise<OrdersByStatus[]> {
    const response = await api.get<OrdersByStatus[]>('/orders/metrics/by-status');
    return response.data;
  },

  // Actualizar estado de orden
  async updateStatus(id: string, data: UpdateOrderStatusData): Promise<Order> {
    const response = await api.patch<Order>(`/orders/${id}/status`, data);
    return response.data;
  },

  // Verificar pago por transferencia
  async verifyTransfer(id: string, data: VerifyTransferData): Promise<Order> {
    const response = await api.post<Order>(`/orders/${id}/verify-transfer`, data);
    return response.data;
  },

  // Verificar pago en efectivo
  async verifyCash(id: string, data: VerifyCashData): Promise<Order> {
    const response = await api.post<Order>(`/orders/${id}/verify-cash`, data);
    return response.data;
  },

  // Actualizar tracking
  async updateTracking(id: string, trackingNumber: string): Promise<Order> {
    const response = await api.patch<Order>(`/orders/${id}/tracking`, {
      tracking_number: trackingNumber,
    });
    return response.data;
  },

  // Agregar nota de admin
  async addNote(id: string, note: string): Promise<Order> {
    const response = await api.post<Order>(`/orders/${id}/notes`, { note });
    return response.data;
  },

  // Actualizar precio de un item
  async updateItemPrice(orderId: string, itemId: string, productPrice: number): Promise<Order> {
    const response = await api.put<Order>(`/orders/${orderId}/items/${itemId}`, {
      product_price: productPrice,
    });
    return response.data;
  },

  // Actualizar datos de la orden (envío, descuento, etc.)
  async updateOrder(id: string, data: UpdateOrderData): Promise<Order> {
    const response = await api.patch<Order>(`/orders/${id}`, data);
    return response.data;
  },
};
