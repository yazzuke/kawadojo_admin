import { useEffect, useState } from 'react';
import {
  Wallet,
  Plus,
  X,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
 
} from 'lucide-react';
import { profitWithdrawalsService } from '../services/profit_withdrawalsService';
import type { ProfitWithdrawal } from '../types/profit_withdrawals';

const CATEGORY_OPTIONS = [
  { value: 'personal', label: 'Personal' },
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'salud', label: 'Salud' },
  { value: 'vivienda', label: 'Vivienda' },
  { value: 'educacion', label: 'Educación' },
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'otro', label: 'Otro' },
];

const CATEGORY_COLORS: Record<string, string> = {
  personal: 'bg-purple-900/50 text-purple-400 border-purple-700',
  alimentacion: 'bg-orange-900/50 text-orange-400 border-orange-700',
  transporte: 'bg-blue-900/50 text-blue-400 border-blue-700',
  entretenimiento: 'bg-pink-900/50 text-pink-400 border-pink-700',
  salud: 'bg-green-900/50 text-green-400 border-green-700',
  vivienda: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  educacion: 'bg-cyan-900/50 text-cyan-400 border-cyan-700',
  ahorro: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
  otro: 'bg-gray-800 text-gray-400 border-gray-600',
};

interface ProfitWithdrawalsTabProps {
  formatCurrency: (n: number) => string;
  netProfit: number;
  onTotalWithdrawnChange?: (n: number) => void; 
}


export default function ProfitWithdrawalsTab({ formatCurrency, netProfit, onTotalWithdrawnChange }: ProfitWithdrawalsTabProps) {
  const [withdrawals, setWithdrawals] = useState<ProfitWithdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProfitWithdrawal | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadWithdrawals();
  }, [page]);

  const loadWithdrawals = async () => {
    try {
      setIsLoading(true);
      const res = await profitWithdrawalsService.list({ page, limit: 50 });
      setWithdrawals(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este retiro de ganancias?')) return;
    try {
      await profitWithdrawalsService.remove(id);
      loadWithdrawals();
    } catch (error) {
      console.error('Error deleting withdrawal:', error);
    }
  };

  const handleEdit = (item: ProfitWithdrawal) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingItem(null);
    loadWithdrawals();
  };

  // Calcular totales por categoría

const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

useEffect(() => {
  if (onTotalWithdrawnChange) {
    onTotalWithdrawnChange(totalWithdrawn);
  }
}, [totalWithdrawn, onTotalWithdrawnChange]);
  const availableProfit = netProfit - totalWithdrawn;

  const byCategory = withdrawals.reduce<Record<string, { total: number; count: number }>>((acc, w) => {
    if (!acc[w.category]) acc[w.category] = { total: 0, count: 0 };
    acc[w.category].total += w.amount;
    acc[w.category].count += 1;
    return acc;
  }, {});

  return (
    <>
      <div className="bg-kawa-gray p-6 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Wallet size={20} className="text-purple-400" />
            Retiros de Ganancias
          </h3>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-kawa-black/50 p-3 rounded-lg">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ganancia Neta</p>
            <p className={`text-sm font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(netProfit)}
            </p>
          </div>
          <div className="bg-kawa-black/50 p-3 rounded-lg">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Retirado</p>
            <p className="text-sm font-bold text-purple-400">{formatCurrency(totalWithdrawn)}</p>
          </div>
          <div className="bg-kawa-black/50 p-3 rounded-lg">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Disponible</p>
            <p className={`text-sm font-bold ${availableProfit >= 0 ? 'text-kawa-green' : 'text-red-400'}`}>
              {formatCurrency(availableProfit)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {netProfit > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uso de ganancias</span>
              <span>{Math.min(Math.round((totalWithdrawn / netProfit) * 100), 100)}%</span>
            </div>
            <div className="w-full bg-kawa-black/50 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  totalWithdrawn / netProfit > 0.9 ? 'bg-red-500' : totalWithdrawn / netProfit > 0.7 ? 'bg-yellow-500' : 'bg-purple-500'
                }`}
                style={{ width: `${Math.min((totalWithdrawn / netProfit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* By Category Breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Por Categoría</p>
            <div className="space-y-1">
              {Object.entries(byCategory)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([cat, data]) => {
                  const label = CATEGORY_OPTIONS.find(o => o.value === cat)?.label || cat;
                  return (
                    <div key={cat} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.otro}`}>
                          {label}
                        </span>
                        <span className="text-gray-600 text-xs">({data.count})</span>
                      </div>
                      <span className="text-purple-400 font-medium">{formatCurrency(data.total)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Expandable Items List */}
        <div>
          <button
            onClick={() => withdrawals.length > 0 && setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Ocultar' : 'Ver'} detalle ({total} registros)
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-400"></div>
                </div>
              ) : withdrawals.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No hay retiros registrados</p>
              ) : (
                <>
                  {withdrawals.map((w) => {
                    const catLabel = CATEGORY_OPTIONS.find(o => o.value === w.category)?.label || w.category;
                    return (
                      <div
                        key={w.id}
                        className="bg-kawa-black/40 rounded-lg px-3 py-2.5 flex justify-between items-start group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{w.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                              <Calendar size={10} />
                              {new Date(w.withdrawal_date).toLocaleDateString('es-CO')}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[w.category] || CATEGORY_COLORS.otro}`}>
                              {catLabel}
                            </span>
                          </div>
                          {w.notes && (
                            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{w.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className="text-sm font-medium text-purple-400">{formatCurrency(w.amount)}</span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(w)}
                              className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
                              title="Editar"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(w.id)}
                              className="p-1 rounded hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-xs bg-kawa-black border border-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30"
                      >
                        Anterior
                      </button>
                      <span className="px-3 py-1 text-xs text-gray-500">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 text-xs bg-kawa-black border border-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <WithdrawalModal
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}

// ============ Create/Edit Modal ============
function WithdrawalModal({
  item,
  onClose,
  onSuccess,
}: {
  item: ProfitWithdrawal | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!item;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: item?.name || '',
    amount: item?.amount?.toString() || '',
    category: item?.category || 'personal',
    withdrawal_date: item?.withdrawal_date
      ? new Date(item.withdrawal_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    notes: item?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) {
      setError('Nombre y monto son obligatorios');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: form.name,
        amount: parseFloat(form.amount),
        category: form.category,
        withdrawal_date: form.withdrawal_date,
        notes: form.notes || undefined,
      };

      if (isEditing && item) {
        await profitWithdrawalsService.update(item.id, payload);
      } else {
        await profitWithdrawalsService.create(payload);
      }
      onSuccess();
    } catch {
      setError(isEditing ? 'Error al actualizar el retiro' : 'Error al crear el retiro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-kawa-gray border border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Editar Retiro' : 'Nuevo Retiro de Ganancia'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Descripción *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-kawa-black border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kawa-green"
              placeholder="Ej: Almuerzo con familia, Pago arriendo..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Monto (COP) *</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full bg-kawa-black border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kawa-green"
              placeholder="0"
              min="0"
              step="any"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Categoría</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full bg-kawa-black border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kawa-green"
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Fecha</label>
            <input
              type="date"
              value={form.withdrawal_date}
              onChange={e => setForm({ ...form, withdrawal_date: e.target.value })}
              className="w-full bg-kawa-black border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kawa-green"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-kawa-black border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kawa-green resize-none"
              rows={2}
              placeholder="Notas opcionales..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-500 transition-colors text-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Retiro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}