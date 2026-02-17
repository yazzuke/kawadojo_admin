import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  CreditCard,
  Banknote,
  Wallet,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShoppingBag,
  Calendar,
  User,
  Eye,
  X,
} from 'lucide-react';
import { financialService } from '../services/financialresumeService';
import type { FinancialSummaryData, MonthlySummaryData, MonthData, OrderListItem } from '../types/financialresume';

export default function FinancialResumePage() {
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly'>('overview');

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [summaryData, monthlyData] = await Promise.all([
        financialService.getSummary(year),
        financialService.getMonthlySummary(year),
      ]);
      setSummary(summaryData);
      setMonthly(monthlyData);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: string) => {
    // If it already has %, return as-is
    if (value.includes('%')) return value;
    return `${value}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  if (!summary || !monthly) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400 text-lg">No se pudo cargar el resumen financiero</p>
      </div>
    );
  }

  // Find max revenue month for bar chart scaling
  const maxMonthlyRevenue = Math.max(...monthly.months.map(m => m.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Resumen Financiero</h1>
          <p className="text-gray-400 mt-1">Análisis completo de ingresos, egresos y rentabilidad</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-2 bg-kawa-gray border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xl font-bold text-white min-w-15 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-2 bg-kawa-gray border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            disabled={year >= new Date().getFullYear()}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 rounded-t-lg font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-kawa-gray text-kawa-green border-b-2 border-kawa-green'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Resumen General
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-5 py-2.5 rounded-t-lg font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'bg-kawa-gray text-kawa-green border-b-2 border-kawa-green'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Mes a Mes
        </button>
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab
          summary={summary}
          monthly={monthly}
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
          maxMonthlyRevenue={maxMonthlyRevenue}
        />
      ) : (
        <MonthlyTab
          monthly={monthly}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

// ============ Overview Tab ============
function OverviewTab({
  summary,
  monthly,
  formatCurrency,
  formatPercent,
  maxMonthlyRevenue,
}: {
  summary: FinancialSummaryData;
  monthly: MonthlySummaryData;
  formatCurrency: (n: number) => string;
  formatPercent: (s: string) => string;
  maxMonthlyRevenue: number;
}) {
  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<DollarSign size={24} />}
          iconColor="text-green-400"
          bgColor="bg-green-900/30"
          borderColor="border-green-800"
          label="Ingresos Totales"
          value={formatCurrency(summary.summary.total_revenue)}
          sub={`${summary.summary.total_orders} órdenes`}
        />
        <SummaryCard
          icon={<TrendingDown size={24} />}
          iconColor="text-red-400"
          bgColor="bg-red-900/30"
          borderColor="border-red-800"
          label="Total Egresos"
          value={formatCurrency(summary.summary.total_outflows)}
          sub="gastos + intereses + pérdidas"
        />
        <SummaryCard
          icon={<TrendingUp size={24} />}
          iconColor={summary.summary.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}
          bgColor={summary.summary.net_profit >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'}
          borderColor={summary.summary.net_profit >= 0 ? 'border-green-800' : 'border-red-800'}
          label="Ganancia Neta"
          value={formatCurrency(summary.summary.net_profit)}
          sub={`Margen: ${formatPercent(summary.summary.net_margin)}`}
        />
        <SummaryCard
          icon={<Package size={24} />}
          iconColor="text-blue-400"
          bgColor="bg-blue-900/30"
          borderColor="border-blue-800"
          label="Inversión Total"
          value={formatCurrency(summary.summary.total_investment)}
          sub={`Ticket prom: ${formatCurrency(summary.summary.avg_order_value)}`}
        />
      </div>

      {/* Revenue Chart (mini bar chart) */}
      <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Ingresos Mensuales</h3>
        <div className="flex items-end gap-2 h-40">
          {monthly.months.map((m) => {
            const height = maxMonthlyRevenue > 0 ? (m.revenue / maxMonthlyRevenue) * 100 : 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-kawa-black border border-gray-700 rounded px-3 py-2 text-xs whitespace-nowrap z-10">
                  <p className="text-white font-medium">{m.month_name}</p>
                  <p className="text-green-400">{formatCurrency(m.revenue)}</p>
                  <p className="text-gray-400">{m.orders_count} órdenes</p>
                </div>
                <div
                  className={`w-full rounded-t transition-all ${
                    m.revenue > 0 ? 'bg-kawa-green hover:bg-green-400' : 'bg-gray-700'
                  }`}
                  style={{ height: `${Math.max(height, 2)}%`, minHeight: '4px' }}
                />
                <span className="text-[10px] text-gray-500">{m.month_name.substring(0, 3)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-green-400" />
            Ingresos
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Ingresos Totales:</span>
              <span className="text-green-400 font-bold">{formatCurrency(summary.income.total_revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ganancia Bruta:</span>
              <span className="text-green-400 font-medium">{formatCurrency(summary.income.gross_profit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Órdenes:</span>
              <span className="text-white font-medium">{summary.income.total_orders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ticket Promedio:</span>
              <span className="text-white font-medium">{formatCurrency(summary.income.avg_order_value)}</span>
            </div>

            <div className="pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Por Método de Pago</p>
              <div className="space-y-2">
                <PaymentMethodRow
                  icon={<CreditCard size={16} />}
                  label="MercadoPago"
                  orders={summary.income.by_payment_method.mercadopago.orders}
                  revenue={summary.income.by_payment_method.mercadopago.revenue}
                  formatCurrency={formatCurrency}
                  extra={
                    <span className="text-red-400 text-xs">
                      Fee: {formatCurrency(summary.income.by_payment_method.mercadopago.fees || 0)}
                    </span>
                  }
                />
                <PaymentMethodRow
                  icon={<Banknote size={16} />}
                  label="Transferencia"
                  orders={summary.income.by_payment_method.transfer.orders}
                  revenue={summary.income.by_payment_method.transfer.revenue}
                  formatCurrency={formatCurrency}
                />
                <PaymentMethodRow
                  icon={<Wallet size={16} />}
                  label="Efectivo"
                  orders={summary.income.by_payment_method.cash.orders}
                  revenue={summary.income.by_payment_method.cash.revenue}
                  formatCurrency={formatCurrency}
                />
              </div>
            </div>

            {Object.keys(summary.income.by_status).length > 0 && (
              <div className="pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Por Estado</p>
                <div className="space-y-1">
                  {Object.entries(summary.income.by_status).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{status}</span>
                      <span className="text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Outflows Breakdown */}
        <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown size={20} className="text-red-400" />
            Egresos
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Egresos:</span>
              <span className="text-red-400 font-bold">{formatCurrency(summary.outflows.total)}</span>
            </div>

            <div className="pt-3 border-t border-gray-700 space-y-3">
              {/* Expenses */}
              <OutflowSection
                label="Gastos Operativos"
                total={summary.outflows.expenses.total}
                count={summary.outflows.expenses.count}
                color="text-red-400"
                formatCurrency={formatCurrency}
                items={summary.outflows.expenses.items.map(e => ({
                  name: e.name,
                  amount: e.amount,
                  date: e.expense_date,
                  detail: e.notes || undefined,
                }))}
              />

              {/* MP Fees */}
              <OutflowCategory
                label="Comisiones MercadoPago"
                total={summary.outflows.mp_fees.total}
                color="text-orange-400"
                formatCurrency={formatCurrency}
              />

              {/* Interests */}
              <OutflowSection
                label="Intereses"
                total={summary.outflows.interests.total}
                count={summary.outflows.interests.count}
                color="text-yellow-400"
                formatCurrency={formatCurrency}
                items={summary.outflows.interests.items.map(i => ({
                  name: i.name,
                  amount: i.amount,
                  date: i.payment_date,
                  detail: i.creditor ? `Acreedor: ${i.creditor}` : undefined,
                  badge: i.source.replace(/_/g, ' '),
                }))}
                breakdown={summary.outflows.interests.by_source}
                breakdownLabel="Por fuente"
              />

              {/* Losses */}
              <OutflowSection
                label="Pérdidas"
                total={summary.outflows.losses.total}
                count={summary.outflows.losses.count}
                color="text-orange-400"
                formatCurrency={formatCurrency}
                items={summary.outflows.losses.items.map(l => ({
                  name: l.name,
                  amount: l.amount,
                  date: l.loss_date,
                  detail: l.order ? `Orden: ${l.order.order_number}` : (l.notes || undefined),
                  badge: l.reason.replace(/_/g, ' '),
                }))}
                breakdown={summary.outflows.losses.by_reason}
                breakdownLabel="Por razón"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment */}
        <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package size={20} className="text-blue-400" />
            Inversión en Inventario
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Invertido:</span>
              <span className="text-white font-bold">{formatCurrency(summary.investment.total)}</span>
            </div>
            <div className="pt-2 border-t border-gray-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Compras:</span>
                <span className="text-gray-300">{formatCurrency(summary.investment.purchase_cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Envíos:</span>
                <span className="text-gray-300">{formatCurrency(summary.investment.shipping_cost)}</span>
              </div>
              {summary.investment.customs_fees > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Aduana:</span>
                  <span className="text-gray-300">{formatCurrency(summary.investment.customs_fees)}</span>
                </div>
              )}
              {summary.investment.additional_fees > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Adicionales:</span>
                  <span className="text-gray-300">{formatCurrency(summary.investment.additional_fees)}</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-gray-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Lotes:</span>
                <span className="text-white">{summary.investment.batches_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Unidades compradas:</span>
                <span className="text-white">{summary.investment.units_purchased}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Potencial de Venta:</span>
                <span className="text-yellow-400">{formatCurrency(summary.investment.potential_revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Ganancia Potencial:</span>
                <span className={`font-medium ${summary.investment.potential_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(summary.investment.potential_profit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profitability */}
        <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-kawa-green" />
            Rentabilidad
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Ganancia Bruta:</span>
              <span className="text-green-400 font-medium">{formatCurrency(summary.profitability.gross_profit)}</span>
            </div>

            <div className="pt-2 border-t border-gray-700 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Deducciones</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Comisiones MP:</span>
                <span className="text-red-400">-{formatCurrency(summary.profitability.mp_fees)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Gastos Operativos:</span>
                <span className="text-red-400">-{formatCurrency(summary.profitability.expenses)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Intereses:</span>
                <span className="text-red-400">-{formatCurrency(summary.profitability.interests)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pérdidas:</span>
                <span className="text-red-400">-{formatCurrency(summary.profitability.losses)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-white font-semibold">Ganancia Neta:</span>
                <span className={`text-xl font-bold ${summary.profitability.net_profit >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>
                  {formatCurrency(summary.profitability.net_profit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Margen Neto:</span>
                <span className={`font-bold ${parseFloat(summary.profitability.net_margin) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(summary.profitability.net_margin)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ROI:</span>
                <span className={`font-bold ${parseFloat(summary.profitability.roi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(summary.profitability.roi)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <OrdersTab
        orders={summary.orders_list}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

// ============ Monthly Tab ============
function MonthlyTab({
  monthly,
  formatCurrency,
}: {
  monthly: MonthlySummaryData;
  formatCurrency: (n: number) => string;
}) {
  // Only show months with data
  const activeMonths = monthly.months.filter(
    m => m.revenue > 0 || m.outflows.total > 0 || m.investment.total > 0
  );

  return (
    <div className="space-y-6">
      {/* Annual Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-green-900/30 p-4 rounded-lg border border-green-800">
          <p className="text-xs text-gray-400">Ingresos Anuales</p>
          <p className="text-lg font-bold text-green-400">{formatCurrency(monthly.annual.total_revenue)}</p>
          <p className="text-xs text-gray-500">{monthly.annual.total_orders} órdenes</p>
        </div>
        <div className="bg-red-900/30 p-4 rounded-lg border border-red-800">
          <p className="text-xs text-gray-400">Egresos Anuales</p>
          <p className="text-lg font-bold text-red-400">{formatCurrency(monthly.annual.total_outflows)}</p>
        </div>
        <div className={`p-4 rounded-lg border ${monthly.annual.total_net_profit >= 0 ? 'bg-green-900/30 border-green-800' : 'bg-red-900/30 border-red-800'}`}>
          <p className="text-xs text-gray-400">Ganancia Neta</p>
          <p className={`text-lg font-bold ${monthly.annual.total_net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(monthly.annual.total_net_profit)}
          </p>
        </div>
        <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-800">
          <p className="text-xs text-gray-400">Inversión Anual</p>
          <p className="text-lg font-bold text-blue-400">{formatCurrency(monthly.annual.total_investment)}</p>
        </div>
        <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-800">
          <p className="text-xs text-gray-400">Ganancia Bruta</p>
          <p className="text-lg font-bold text-yellow-400">{formatCurrency(monthly.annual.total_gross_profit)}</p>
        </div>
      </div>

      {/* Monthly Cards */}
      <div className="space-y-4">
        {activeMonths.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AlertTriangle size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-lg">No hay datos para este año</p>
          </div>
        ) : (
          activeMonths.map((month) => (
            <MonthCard key={month.month} month={month} formatCurrency={formatCurrency} />
          ))
        )}
      </div>
    </div>
  );
}

// ============ Sub Components ============

function SummaryCard({
  icon,
  iconColor,
  bgColor,
  borderColor,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={`${bgColor} p-5 rounded-lg border ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">{label}</p>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function PaymentMethodRow({
  icon,
  label,
  orders,
  revenue,
  formatCurrency,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  orders: number;
  revenue: number;
  formatCurrency: (n: number) => string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between bg-kawa-black/50 p-3 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <div>
          <p className="text-sm text-white">{label}</p>
          <p className="text-xs text-gray-500">{orders} órdenes</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-green-400 font-medium">{formatCurrency(revenue)}</p>
        {extra}
      </div>
    </div>
  );
}

function OutflowCategory({
  label,
  total,
  count,
  color,
  formatCurrency,
}: {
  label: string;
  total: number;
  count?: number;
  color: string;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className="text-gray-400 text-sm">{label}</span>
        {count !== undefined && (
          <span className="text-gray-600 text-xs ml-2">({count})</span>
        )}
      </div>
      <span className={`font-medium ${color}`}>{formatCurrency(total)}</span>
    </div>
  );
}

function OutflowSection({
  label,
  total,
  count,
  color,
  formatCurrency,
  items,
  breakdown,
  breakdownLabel,
}: {
  label: string;
  total: number;
  count: number;
  color: string;
  formatCurrency: (n: number) => string;
  items: Array<{ name: string; amount: number; date: string; detail?: string; badge?: string }>;
  breakdown?: Record<string, { total: number; count: number }>;
  breakdownLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => items.length > 0 && setExpanded(!expanded)}
        className="w-full flex justify-between items-center hover:bg-kawa-black/30 rounded px-1 py-0.5 transition-colors"
      >
        <div className="flex items-center gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <span className="text-gray-600 text-xs">({count})</span>
          {items.length > 0 && (
            expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />
          )}
        </div>
        <span className={`font-medium ${color}`}>{formatCurrency(total)}</span>
      </button>

      {breakdown && Object.keys(breakdown).length > 0 && (
        <div className="pl-4 mt-1 space-y-0.5">
          {breakdownLabel && <p className="text-[10px] text-gray-600 uppercase tracking-wider">{breakdownLabel}</p>}
          {Object.entries(breakdown).map(([key, data]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-gray-400">{formatCurrency(data.total)} ({data.count})</span>
            </div>
          ))}
        </div>
      )}

      {expanded && items.length > 0 && (
        <div className="pl-4 mt-2 space-y-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="bg-kawa-black/40 rounded-lg px-3 py-2 flex justify-between items-start">
              <div>
                <p className="text-sm text-white">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500">
                    {new Date(item.date).toLocaleDateString('es-CO')}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded capitalize">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.detail && (
                  <p className="text-[10px] text-gray-500 mt-0.5">{item.detail}</p>
                )}
              </div>
              <span className={`text-sm font-medium ${color}`}>{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthCard({
  month,
  formatCurrency,
}: {
  month: MonthData;
  formatCurrency: (n: number) => string;
}) {
  const hasOutflows = month.outflows.total > 0;

  return (
    <div className="bg-kawa-gray p-5 rounded-lg border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-white">{month.month_name}</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          month.net_profit > 0
            ? 'bg-green-900/50 text-green-400 border border-green-700'
            : month.net_profit < 0
            ? 'bg-red-900/50 text-red-400 border border-red-700'
            : 'bg-gray-800 text-gray-400 border border-gray-700'
        }`}>
          {month.net_margin}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-base font-bold text-green-400">{formatCurrency(month.revenue)}</p>
          <p className="text-xs text-gray-500">{month.orders_count} órdenes</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Ganancia Bruta</p>
          <p className={`text-base font-bold ${month.gross_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(month.gross_profit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Egresos</p>
          <p className="text-base font-bold text-red-400">{formatCurrency(month.outflows.total)}</p>
          {hasOutflows && (
            <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
              {month.outflows.expenses > 0 && <p>Gastos: {formatCurrency(month.outflows.expenses)}</p>}
              {month.outflows.mp_fees > 0 && <p>MP Fee: {formatCurrency(month.outflows.mp_fees)}</p>}
              {month.outflows.interests > 0 && <p>Intereses: {formatCurrency(month.outflows.interests)}</p>}
              {month.outflows.losses > 0 && <p>Pérdidas: {formatCurrency(month.outflows.losses)}</p>}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500">Ganancia Neta</p>
          <p className={`text-base font-bold ${month.net_profit >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>
            {formatCurrency(month.net_profit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Inversión</p>
          <p className="text-base font-bold text-blue-400">{formatCurrency(month.investment.total)}</p>
          {month.investment.batches > 0 && (
            <p className="text-xs text-gray-500">{month.investment.batches} lotes</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Orders Tab ============
function OrdersTab({
  orders,
  formatCurrency,
}: {
  orders: OrderListItem[];
  formatCurrency: (n: number) => string;
}) {
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    confirmed: 'bg-blue-900/50 text-blue-400 border-blue-700',
    shipped: 'bg-purple-900/50 text-purple-400 border-purple-700',
    delivered: 'bg-green-900/50 text-green-400 border-green-700',
    cancelled: 'bg-red-900/50 text-red-400 border-red-700',
    refunded: 'bg-gray-800 text-gray-400 border-gray-600',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    shipped: 'Enviada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
    refunded: 'Reembolsada',
  };

  const paymentLabels: Record<string, string> = {
    mercadopago: 'MercadoPago',
    transfer: 'Transferencia',
    cash: 'Efectivo',
  };

  const uniqueStatuses = [...new Set(orders.map(o => o.status))];

  const filteredOrders = orders.filter(o => {
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchesSearch = searchTerm === '' ||
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.items.some(i => i.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalProfit = filteredOrders.reduce((sum, o) => sum + o.profit, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por orden, cliente o producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-kawa-gray border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-kawa-green"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-kawa-green text-black'
                : 'bg-kawa-gray text-gray-400 border border-gray-700 hover:text-white'
            }`}
          >
            Todas ({orders.length})
          </button>
          {uniqueStatuses.map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-kawa-green text-black'
                  : 'bg-kawa-gray text-gray-400 border border-gray-700 hover:text-white'
              }`}
            >
              {statusLabels[status] || status} ({orders.filter(o => o.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* Summary Row */}
      <div className="flex gap-4">
        <div className="bg-kawa-gray px-4 py-2 rounded-lg border border-gray-800">
          <span className="text-xs text-gray-500">Ingresos:</span>
          <span className="text-sm text-green-400 font-bold ml-2">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="bg-kawa-gray px-4 py-2 rounded-lg border border-gray-800">
          <span className="text-xs text-gray-500">Ganancia:</span>
          <span className={`text-sm font-bold ml-2 ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(totalProfit)}
          </span>
        </div>
        <div className="bg-kawa-gray px-4 py-2 rounded-lg border border-gray-800">
          <span className="text-xs text-gray-500">Mostrando:</span>
          <span className="text-sm text-white font-bold ml-2">{filteredOrders.length}</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-kawa-gray rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-kawa-black/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ganancia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-kawa-black/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm text-white font-mono">{order.order_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-white">{order.customer.name}</p>
                    <p className="text-xs text-gray-500">{order.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[order.status] || 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300">
                      {paymentLabels[order.payment_method || ''] || order.payment_method || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-green-400 font-medium">{formatCurrency(order.total)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${order.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(order.profit)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('es-CO')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-gray-500 hover:text-kawa-green transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 text-gray-600" />
            <p>No se encontraron órdenes</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          formatCurrency={formatCurrency}
          statusColors={statusColors}
          statusLabels={statusLabels}
          paymentLabels={paymentLabels}
        />
      )}
    </div>
  );
}

// ============ Order Detail Modal ============
function OrderDetailModal({
  order,
  onClose,
  formatCurrency,
  statusColors,
  statusLabels,
  paymentLabels,
}: {
  order: OrderListItem;
  onClose: () => void;
  formatCurrency: (n: number) => string;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  paymentLabels: Record<string, string>;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-kawa-gray border border-gray-700 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-white font-mono">{order.order_number}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[order.status] || ''}`}>
                {statusLabels[order.status] || order.status}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(order.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Customer */}
          <div className="flex items-start gap-3">
            <User size={18} className="text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">{order.customer.name}</p>
              <p className="text-xs text-gray-400">{order.customer.email}</p>
              <p className="text-xs text-gray-400">{order.customer.phone}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Productos</p>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="bg-kawa-black/50 rounded-lg px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white">{item.product_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(item.price)} × {item.quantity}
                      <span className="ml-2 text-gray-600">Costo: {formatCurrency(item.cost)}</span>
                    </p>
                  </div>
                  <span className="text-sm text-green-400 font-medium">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-kawa-black/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal:</span>
              <span className="text-white">{formatCurrency(order.total)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Descuento:</span>
                <span className="text-orange-400">-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.shipping_cost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Envío:</span>
                <span className="text-gray-300">{formatCurrency(order.shipping_cost)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Costo Total:</span>
              <span className="text-red-400">{formatCurrency(order.total_cost)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
              <span className="text-white font-semibold">Ganancia:</span>
              <span className={`font-bold ${order.profit >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>
                {formatCurrency(order.profit)}
              </span>
            </div>
          </div>

          {/* Payment & Shipping */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pago</p>
              <p className="text-gray-300">{paymentLabels[order.payment_method || ''] || order.payment_method || '-'}</p>
              <p className="text-xs text-gray-500 capitalize">{order.payment_status || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Envío</p>
              {order.tracking_number ? (
                <p className="text-gray-300 font-mono text-xs">{order.tracking_number}</p>
              ) : (
                <p className="text-gray-500">Sin tracking</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Calendar size={12} />
              <span>Creada: {new Date(order.created_at).toLocaleDateString('es-CO')}</span>
            </div>
            {order.shipped_at && (
              <div className="flex items-center gap-1.5 text-purple-400">
                <Calendar size={12} />
                <span>Enviada: {new Date(order.shipped_at).toLocaleDateString('es-CO')}</span>
              </div>
            )}
            {order.delivered_at && (
              <div className="flex items-center gap-1.5 text-green-400">
                <Calendar size={12} />
                <span>Entregada: {new Date(order.delivered_at).toLocaleDateString('es-CO')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
