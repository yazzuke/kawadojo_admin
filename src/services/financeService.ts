import api from './api';

export type AccountKind = 'banco' | 'efectivo' | 'billetera' | 'tarjeta' | 'prestamo' | 'persona';

export interface FinanceAccount {
  id: string;
  name: string;
  kind: AccountKind;
  opening_balance: number;
  opening_date: string | null;
  credit_limit: number | null;
  active: boolean;
  sort_order: number;
  notes: string | null;
  balance: number;
  movements_count: number;
  is_debt: boolean;
}

export interface FundReport {
  id: string;
  name: string;
  kind: 'propio' | 'prestamo';
  account_id: string | null;
  opened_at: string | null;
  closed_at: string | null;
  notes: string | null;
  is_default: boolean;
  lots: string[];
  units: number;
  units_sold: number;
  invested: number;
  cost_sold: number;
  sales: number;
  stock_units: number;
  stock_cost: number;
  stock_value: number;
  received: number;
  loan_left: number | null;
  transfers_in: number;
  transfers_out: number;
  installments: number;
  interest: number;
  expenses: number;
  personal: number;
  other_in: number;
  lot_payments: number;
  expenses_by_category: Record<string, number>;
  net_sales: number;
  net_cash: number;
  profit: number;
  loan_balance: number | null;
  loan_name: string | null;
}

export interface MonthFlow {
  month: string;
  ingresos: number;
  lotes: number;
  negocio: number;
  personal: number;
  intereses: number;
  deudas: number;
  otros: number;
}

export interface FinanceOverview {
  cutover: string | null;
  totals: {
    cash: number;
    debt: number;
    receivable: number;
    stock_cost: number;
    stock_sale_value: number;
    stock_units: number;
    net_worth: number;
    net_worth_at_sale_price: number;
  };
  accounts: FinanceAccount[];
  funds: FundReport[];
  monthly: MonthFlow[];
  categories: Array<{ category: string; total: number }>;
  needs_review: number;
}

interface Ref { id: string; name: string }

export interface Movement {
  id: string;
  date: string;
  kind: string;
  amount: number;
  description: string;
  category: string | null;
  account_id: string | null;
  to_account_id: string | null;
  fund_id: string | null;
  to_fund_id: string | null;
  interest_amount: number | null;
  order_id: string | null;
  batch_id: string | null;
  source: 'manual' | 'sheet' | 'auto';
  source_ref: string | null;
  needs_review: boolean;
  notes: string | null;
  account: (Ref & { kind: string }) | null;
  to_account: (Ref & { kind: string }) | null;
  fund: Ref | null;
  to_fund: Ref | null;
  order: { id: string; order_number: string } | null;
  batch: { id: string; batch_number: string } | null;
}

export interface MovementList {
  items: Movement[];
  total: number;
  total_in: number;
  total_out: number;
}

export interface MovementFilters {
  from?: string;
  to?: string;
  kind?: string;
  account_id?: string;
  fund_id?: string;
  source?: string;
  category?: string;
  needs_review?: string;
  q?: string;
  limit?: number;
}

export type MovementPayload = Partial<Pick<Movement,
  'date' | 'kind' | 'amount' | 'description' | 'category' | 'account_id' | 'to_account_id' |
  'fund_id' | 'to_fund_id' | 'interest_amount' | 'batch_id' | 'notes' | 'needs_review'>>;

export type PaymentStatus = 'pagado' | 'parcial' | 'sin_pagar' | 'historico';

export interface BatchFinance {
  id: string;
  batch_number: string;
  purchase_date: string;
  status_shipping: string;
  total_cost: number;
  parts: { compra_lote: number; envio_lote: number; aduana_lote: number };
  paid_by_kind: Record<string, number>;
  paid: number;
  pending: number;
  payment_status: PaymentStatus;
  paid_with: Array<{ id: string; name: string; kind: string; balance: number }>;
  owed_on: string[];
  fund_id: string | null;
  fund_name: string | null;
  effective_fund_id: string | null;
  units: number;
  sold_units: number;
  sales: number;
  mixed_funds: boolean;
  items: Array<{
    id: string; product_id: string; name: string; quantity: number; unit_cost: number;
    landed_cost: number; fund_id: string | null; sold: number;
  }>;
  movements: Array<{ id: string; kind: string; amount: number; date: string; account_id: string | null; description: string }>;
}

export const financeService = {
  async overview(): Promise<FinanceOverview> {
    return (await api.get('/finance/overview', { timeout: 60_000 })).data.data;
  },
  async movements(filters: MovementFilters): Promise<MovementList> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined));
    return (await api.get('/finance/movements', { params })).data.data;
  },
  async createMovement(payload: MovementPayload) {
    return (await api.post('/finance/movements', payload)).data.data as Movement;
  },
  async updateMovement(id: string, payload: MovementPayload) {
    return (await api.put(`/finance/movements/${id}`, payload)).data.data as Movement;
  },
  async deleteMovement(id: string) {
    await api.delete(`/finance/movements/${id}`);
  },
  async markReviewed(ids: string[]): Promise<number> {
    return (await api.post('/finance/movements/reviewed', { ids })).data.data;
  },
  async syncSales(accounts: Record<string, string>): Promise<{ created: number; updated: number; removed: number; since: string }> {
    return (await api.post('/finance/sync-sales', { accounts }, { timeout: 60_000 })).data.data;
  },
  async createAccount(payload: Partial<FinanceAccount>) {
    return (await api.post('/finance/accounts', payload)).data.data as FinanceAccount;
  },
  async updateAccount(id: string, payload: Partial<FinanceAccount>) {
    return (await api.put(`/finance/accounts/${id}`, payload)).data.data as FinanceAccount;
  },
  async deleteAccount(id: string) {
    await api.delete(`/finance/accounts/${id}`);
  },
  async createFund(payload: Partial<FundReport>) {
    return (await api.post('/finance/funds', payload)).data.data;
  },
  async updateFund(id: string, payload: Partial<FundReport>) {
    return (await api.put(`/finance/funds/${id}`, payload)).data.data;
  },
  async deleteFund(id: string) {
    await api.delete(`/finance/funds/${id}`);
  },
  async batches(): Promise<BatchFinance[]> {
    return (await api.get('/finance/batches', { timeout: 60_000 })).data.data;
  },
  async setBatchFund(batchId: string, fundId: string | null) {
    await api.put(`/finance/batches/${batchId}/fund`, { fund_id: fundId });
  },
  async setItemFund(itemId: string, fundId: string | null) {
    await api.put(`/finance/batch-items/${itemId}/fund`, { fund_id: fundId });
  },
  async payBatch(batchId: string, payload: { account_id: string; fund_id?: string | null; date: string; notes?: string; parts: Record<string, number> }) {
    return (await api.post(`/finance/batches/${batchId}/pay`, payload)).data.data;
  },
};

// ===== Textos y formato =====

export const money = (n: number | null | undefined) => {
  const v = Math.round(n || 0);
  return `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('es-CO')}`;
};

export const KIND_LABELS: Record<string, string> = {
  venta: 'Venta',
  otro_ingreso: 'Otro ingreso',
  ajuste_entrada: 'Ajuste (entra)',
  compra_lote: 'Compra de lote',
  envio_lote: 'Envío de lote',
  aduana_lote: 'Aduana / impuestos',
  gasto_negocio: 'Gasto del negocio',
  retiro_personal: 'Personal',
  interes: 'Interés',
  comision: 'Comisión',
  perdida: 'Pérdida',
  ajuste_salida: 'Ajuste (sale)',
  traslado: 'Traslado / pago de deuda',
  traslado_fondo: 'Traslado entre fondos',
};

export const IN_KINDS = ['venta', 'otro_ingreso', 'ajuste_entrada'];
export const TRANSFER_KINDS = ['traslado', 'traslado_fondo'];
export const KIND_GROUPS: Array<{ label: string; kinds: string[] }> = [
  { label: 'Entra plata', kinds: IN_KINDS },
  { label: 'Sale plata', kinds: ['compra_lote', 'envio_lote', 'aduana_lote', 'gasto_negocio', 'retiro_personal', 'interes', 'comision', 'perdida', 'ajuste_salida'] },
  { label: 'Mover', kinds: TRANSFER_KINDS },
];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  banco: 'Banco',
  efectivo: 'Efectivo',
  billetera: 'Billetera (Nequi, MP...)',
  tarjeta: 'Tarjeta de crédito',
  prestamo: 'Préstamo',
  persona: 'Persona (le debo / me debe)',
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; cls: string }> = {
  pagado: { label: 'Pagado', cls: 'bg-kawa-green/15 text-kawa-green border-kawa-green/30' },
  parcial: { label: 'Pagado en parte', cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  sin_pagar: { label: 'Sin pagar', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  historico: { label: 'Antes de la caja', cls: 'bg-gray-500/15 text-gray-300 border-gray-500/30' },
};

export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');
// Mediodía en Colombia para que la fecha no cambie de día por la zona horaria
export const inputToIso = (d: string) => (d ? `${d}T12:00:00-05:00` : '');
export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
