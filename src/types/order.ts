export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_cost: number;
  quantity: number;
  subtotal: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    condition?: string;
    product_images?: Array<{
      id: string;
      url: string;
      alt_text: string;
      is_primary: boolean;
    }>;
  };
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  comment: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  payment_method: string;
  amount: number;
  status: string;
  transfer_reference: string | null;
  transfer_bank: string | null;
  transfer_date: string | null;
  cash_received: number | null;
  verified_at: string | null;
  paid_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderAddress {
  id: string;
  user_id: string;
  label: string;
  street: string;
  number: string;
  apartment: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  is_default: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  address_id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  total_cost: number;
  profit: number;
  
  // Tracking
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  
  // Notes
  customer_notes: string | null;
  admin_notes: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
  payments?: OrderPayment[];
  address?: OrderAddress;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
}

export type OrderStatus = 
  | 'pending'
  | 'payment_pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 
  | 'transfer'
  | 'cash'
  | 'online';

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface OrderFilters {
  user_id?: string;
  status?: string;
  payment_method?: string;
  from_date?: Date;
  to_date?: Date;
}

export interface SalesMetrics {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  total_items_sold: number;
  orders_by_status: Record<OrderStatus, number>;
  orders_by_payment_method: Record<PaymentMethod, number>;
  paid_orders: number;
  pending_orders: number;
  cancelled_orders: number;
}

export interface SalesByPeriod {
  period: string;
  total_orders: number;
  total_revenue: number;
  total_items: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
  product_image?: string;
}

export interface OrdersByStatus {
  status: OrderStatus;
  count: number;
  total_revenue: number;
}

export interface UpdateOrderStatusData {
  status: OrderStatus;
  comment?: string;
}

export interface VerifyTransferData {
  transfer_reference: string;
  transfer_bank: string;
  transfer_date: string;
  admin_notes?: string;
}

export interface VerifyCashData {
  cash_received: number;
  admin_notes?: string;
}

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pendiente', color: 'bg-gray-500' },
  { value: 'payment_pending', label: 'Pago Pendiente', color: 'bg-yellow-500' },
  { value: 'paid', label: 'Pagado', color: 'bg-green-500' },
  { value: 'processing', label: 'Procesando', color: 'bg-blue-500' },
  { value: 'shipped', label: 'Enviado', color: 'bg-purple-500' },
  { value: 'delivered', label: 'Entregado', color: 'bg-teal-500' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-500' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'online', label: 'En Línea' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-500' },
  { value: 'paid', label: 'Pagado', color: 'bg-green-500' },
  { value: 'failed', label: 'Fallido', color: 'bg-red-500' },
  { value: 'refunded', label: 'Reembolsado', color: 'bg-gray-500' },
] as const;
