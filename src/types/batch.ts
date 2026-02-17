export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  cost: number | null;
  in_stock: boolean;
  product_images: Array<{
    id: string;
    url: string;
    alt_text: string;
    is_primary: boolean;
    sort_order: number;
  }>;
  categories: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface BatchItem {
  id: string;
  batch_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
  product: Product;
  metrics?: {
    profit_per_unit: number;
    potential_profit: number;
    margin_percentage: number;
    selling_price: number;
    cost_price: number;
  };
}

export interface Batch {
  id: string;
  batch_number: string;
  purchase_date: string;
  purchase_total_cost: number;
  shipping_cost: number;
  customs_fees: number | null;
  additional_fees: number | null;
  total_cost: number;
  status: 'ordered' | 'in_mailbox' | 'in_transit' | 'customs' | 'delivered' | 'completed';
  mailbox_tracking: string | null;
  notes: string | null;
  arrived_mailbox_at: string | null;
  shipped_to_colombia_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  items: BatchItem[];
}

export interface BatchMetrics {
  total_products: number;
  total_sold: number;
  remaining: number;
  completion_percentage: number;
  revenue: number;
  profit: number;
  roi: number;
}

export interface BatchWithMetrics extends Batch {
  metrics: BatchMetrics;
  summary?: {
    total_items: number;
    total_units: number;
    total_product_cost: number;
    total_shipping_and_fees: number;
    total_investment: number;
    total_potential_revenue: number;
    total_potential_profit: number;
    average_margin_percentage: string;
    roi_percentage: string;
  };
}

export interface CreateBatchData {
  batch_number?: string;
  purchase_date: Date | string;
  purchase_total_cost: number;
  shipping_cost?: number;
  customs_fees?: number;
  additional_fees?: number;
  mailbox_tracking?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_cost: number;
  }>;
}

export interface UpdateBatchData {
  purchase_total_cost?: number;
  shipping_cost?: number;
  customs_fees?: number;
  additional_fees?: number;
  mailbox_tracking?: string;
  notes?: string;
}

export interface UpdateBatchStatusData {
  status: string;
  customs_fees?: number;
  additional_fees?: number;
  mailbox_tracking?: string;
}

export interface BatchSummary {
  overview: {
    total_batches: number;
    active_batches: number;
    completed_batches: number;
    total_products_count: number;
    total_units: number;
  };
  financial: {
    total_investment: number;
    total_purchase_cost: number;
    total_shipping_cost: number;
    total_customs_fees: number;
    total_additional_fees: number;
  };
  potential: {
    total_potential_revenue: number;
    total_potential_profit: number;
    average_roi: string;
    total_potential_profit_net: number;
    net_roi: string;
  };
  actual: {
    total_sold_units: number;
    remaining_units: number;
    total_actual_revenue: number;
    total_outflows: number;
    real_profit: number;
    sales_margin: string;
    profit_vs_investment: number;
    actual_roi: string;
    completion_percentage: string;
  };
  expenses: {
    total: number;
    count: number;
  };
  interests: {
    total: number;
    count: number;
    by_source: Array<{
      source: string;
      total: number;
      count: number;
    }>;
  };
  losses: {
    total: number;
    count: number;
    by_reason: Array<{
      reason: string;
      total: number;
      count: number;
    }>;
  };
  outflows_summary: {
    expenses: number;
    interests: number;
    losses: number;
    total: number;
  };
  by_status: {
    ordered: number;
    in_mailbox: number;
    in_transit: number;
    customs: number;
    delivered: number;
    completed: number;
  };
}

export const BATCH_STATUSES = [
  { value: 'ordered', label: 'Ordenado', color: 'bg-blue-500' },
  { value: 'in_mailbox', label: 'En Casillero', color: 'bg-purple-500' },
  { value: 'in_transit', label: 'En Tránsito', color: 'bg-yellow-500' },
  { value: 'customs', label: 'En Aduana', color: 'bg-orange-500' },
  { value: 'delivered', label: 'Entregado', color: 'bg-green-500' },
  { value: 'completed', label: 'Completado', color: 'bg-gray-500' },
] as const;
