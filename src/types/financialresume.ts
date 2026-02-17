// ============ Financial Summary Types ============

export interface PaymentMethodBreakdown {
  orders: number;
  revenue: number;
  fees?: number;
  net?: number;
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  expense_date: string;
  notes: string | null;
}

export interface InterestItem {
  id: string;
  name: string;
  amount: number;
  source: string;
  creditor: string;
  payment_date: string;
  notes: string | null;
}

export interface LossItem {
  id: string;
  name: string;
  amount: number;
  reason: string;
  loss_date: string;
  notes: string | null;
  order: { id: string; order_number: string; total: number } | null;
}

export interface OrderListItem {
  id: string;
  order_number: string;
  status: string;
  total: number;
  total_cost: number;
  profit: number;
  shipping_cost: number;
  discount: number;
  payment_method: string | null;
  payment_status: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    product_name: string;
    price: number;
    cost: number;
    quantity: number;
    subtotal: number;
  }>;
  tracking_number: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface FinancialSummaryData {
  year: number;
  period: { from: string; to: string };

  summary: {
    total_revenue: number;
    total_outflows: number;
    net_profit: number;
    net_margin: string;
    total_orders: number;
    avg_order_value: number;
    total_investment: number;
  };

  income: {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    gross_profit: number;
    by_payment_method: {
      mercadopago: PaymentMethodBreakdown;
      transfer: PaymentMethodBreakdown;
      cash: PaymentMethodBreakdown;
    };
    by_status: Record<string, number>;
  };

  outflows: {
    total: number;
    expenses: {
      total: number;
      count: number;
      items: ExpenseItem[];
    };
    interests: {
      total: number;
      count: number;
      by_source: Record<string, { total: number; count: number }>;
      items: InterestItem[];
    };
    losses: {
      total: number;
      count: number;
      by_reason: Record<string, { total: number; count: number }>;
      items: LossItem[];
    };
    mp_fees: { total: number };
  };

  investment: {
    total: number;
    purchase_cost: number;
    shipping_cost: number;
    customs_fees: number;
    additional_fees: number;
    batches_count: number;
    units_purchased: number;
    potential_revenue: number;
    potential_profit: number;
  };

  profitability: {
    gross_profit: number;
    mp_fees: number;
    expenses: number;
    interests: number;
    losses: number;
    net_profit: number;
    net_margin: string;
    roi: string;
  };

  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;

  orders_list: OrderListItem[];
}

// ============ Monthly Summary Types ============

export interface MonthData {
  month: number;
  month_name: string;
  revenue: number;
  orders_count: number;
  gross_profit: number;
  outflows: {
    expenses: number;
    interests: number;
    losses: number;
    mp_fees: number;
    total: number;
  };
  net_profit: number;
  net_margin: string;
  investment: {
    total: number;
    batches: number;
  };
}

export interface MonthlySummaryData {
  year: number;
  months: MonthData[];
  annual: {
    total_revenue: number;
    total_orders: number;
    total_gross_profit: number;
    total_outflows: number;
    total_net_profit: number;
    total_investment: number;
    total_expenses: number;
    total_interests: number;
    total_losses: number;
    total_mp_fees: number;
  };
}
