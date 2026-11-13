import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCheck, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2, Zap } from 'lucide-react';
import {
  financeService, money, shortDate, KIND_GROUPS, KIND_LABELS, IN_KINDS,
  type FinanceAccount, type FundReport, type Movement, type MovementFilters, type MovementList,
} from '../../services/financeService';
import { apiError } from '../../services/productMasterService';
import MovementModal from './MovementModal';
import { cardCls, filterCls, inputCls } from './ui';

interface Props {
  accounts: FinanceAccount[];
  funds: FundReport[];
  categories: string[];
  initialFilters?: MovementFilters;
  onChanged: () => void;
}

const sign = (m: Movement) => (IN_KINDS.includes(m.kind) ? 1 : m.kind === 'traslado' || m.kind === 'traslado_fondo' ? 0 : -1);

export default function MovementsTab({ accounts, funds, categories, initialFilters, onChanged }: Props) {
  const [filters, setFilters] = useState<MovementFilters>({ limit: 300, ...initialFilters });
  const [search, setSearch] = useState(initialFilters?.q || '');
  const [data, setData] = useState<MovementList | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Movement | null | 'new'>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await financeService.movements(filters));
      setSelected(new Set());
    } catch (err) {
      toast.error(apiError(err, 'No se pudieron cargar los movimientos'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => (f.q === search ? f : { ...f, q: search })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const setFilter = (k: keyof MovementFilters, v: string) => setFilters(f => ({ ...f, [k]: v }));

  const refresh = () => { load(); onChanged(); };

  // Cambio rápido desde la tabla (tipo, categoría, fondo); queda revisado
  const quickUpdate = async (m: Movement, patch: Partial<Movement>) => {
    try {
      await financeService.updateMovement(m.id, patch);
      setData(d => d && { ...d, items: d.items.map(x => (x.id === m.id ? { ...x, ...patch, needs_review: false, fund: patch.fund_id !== undefined ? funds.find(f => f.id === patch.fund_id) || null : x.fund } : x)) });
      onChanged();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cambiar'));
    }
  };

  const remove = async (m: Movement) => {
    if (!confirm(`¿Borrar "${m.description}" por ${money(m.amount)}?`)) return;
    try {
      await financeService.deleteMovement(m.id);
      toast.success('Movimiento borrado');
      refresh();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo borrar'));
    }
  };

  const markReviewed = async () => {
    const ids = selected.size ? [...selected] : (data?.items || []).filter(m => m.needs_review).map(m => m.id);
    if (!ids.length) return;
    try {
      const n = await financeService.markReviewed(ids);
      toast.success(`${n} marcados como revisados`);
      refresh();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo marcar'));
    }
  };

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const pendingInView = useMemo(() => (data?.items || []).filter(m => m.needs_review).length, [data]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className={`${cardCls} p-3 flex flex-wrap gap-2 items-center`}>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar descripción..." className={`${inputCls} pl-9`} />
        </div>
        <select value={filters.kind || ''} onChange={e => setFilter('kind', e.target.value)} className={filterCls}>
          <option value="">Todos los tipos</option>
          {KIND_GROUPS.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.kinds.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
            </optgroup>
          ))}
        </select>
        <select value={filters.account_id || ''} onChange={e => setFilter('account_id', e.target.value)} className={filterCls}>
          <option value="">Todas las cuentas</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filters.fund_id || ''} onChange={e => setFilter('fund_id', e.target.value)} className={filterCls}>
          <option value="">Todos los fondos</option>
          {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={filters.category || ''} onChange={e => setFilter('category', e.target.value)} className={filterCls}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.source || ''} onChange={e => setFilter('source', e.target.value)} className={filterCls}>
          <option value="">De donde sea</option>
          <option value="manual">Puestos a mano</option>
          <option value="sheet">Del Sheet</option>
          <option value="auto">Automáticos (ventas)</option>
        </select>
        <input type="date" value={filters.from || ''} onChange={e => setFilter('from', e.target.value)} className={filterCls} title="Desde" />
        <input type="date" value={filters.to || ''} onChange={e => setFilter('to', e.target.value)} className={filterCls} title="Hasta" />
        <label className="flex items-center gap-2 text-sm text-gray-300 px-2 cursor-pointer">
          <input type="checkbox" checked={filters.needs_review === 'true'} onChange={e => setFilter('needs_review', e.target.checked ? 'true' : '')} className="accent-yellow-400" />
          Por revisar
        </label>
        <button onClick={() => setEditing('new')} className="flex items-center gap-2 bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-kawa-green-light text-sm">
          <Plus size={16} /> Movimiento
        </button>
      </div>

      {/* Totales y acciones */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-gray-400">{data ? `${data.items.length} de ${data.total}` : '…'} movimientos</span>
        <span className="text-kawa-green">Entra {money(data?.total_in)}</span>
        <span className="text-red-300">Sale {money(data?.total_out)}</span>
        {loading && <Loader2 size={15} className="animate-spin text-gray-400" />}
        <div className="flex-1" />
        {(selected.size > 0 || pendingInView > 0) && (
          <button onClick={markReviewed} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 text-sm">
            <CheckCheck size={15} />
            {selected.size ? `Marcar ${selected.size} como revisados` : `Marcar los ${pendingInView} de la vista como revisados`}
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Cuenta</th>
              <th className="px-3 py-2">Fondo</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map(m => {
              const s = sign(m);
              return (
                <tr key={m.id} className={`border-b border-gray-800/60 hover:bg-white/[0.02] ${m.needs_review ? 'bg-yellow-500/[0.04]' : ''}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="accent-kawa-green" />
                  </td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{shortDate(m.date)}</td>
                  <td className="px-3 py-2 text-white min-w-[200px]">
                    <div className="flex items-center gap-2">
                      {m.needs_review && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" title="Por revisar" />}
                      <span>{m.description}</span>
                      {m.source === 'sheet' && <FileSpreadsheet size={13} className="text-gray-500 shrink-0" />}
                      {m.source === 'auto' && <Zap size={13} className="text-gray-500 shrink-0" />}
                    </div>
                    {(m.order || m.batch) && (
                      <p className="text-[11px] text-gray-500">{m.order?.order_number}{m.batch?.batch_number}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={m.kind}
                      onChange={e => quickUpdate(m, { kind: e.target.value })}
                      disabled={m.source === 'auto'}
                      className="bg-transparent text-gray-200 text-xs border border-gray-800 rounded px-1.5 py-1 hover:border-gray-600 outline-none max-w-[150px]"
                    >
                      {KIND_GROUPS.map(g => (
                        <optgroup key={g.label} label={g.label}>
                          {g.kinds.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={m.category || ''}
                      onChange={e => quickUpdate(m, { category: e.target.value || null })}
                      className="bg-transparent text-gray-300 text-xs border border-gray-800 rounded px-1.5 py-1 hover:border-gray-600 outline-none max-w-[140px]"
                    >
                      <option value="">—</option>
                      {[...new Set([...(m.category ? [m.category] : []), ...categories])].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-gray-300 text-xs whitespace-nowrap">
                    {m.kind === 'traslado_fondo' ? '—' : (
                      <span className="flex items-center gap-1">
                        {m.account?.name || '—'}
                        {m.to_account && <><ArrowRight size={11} className="text-gray-500" />{m.to_account.name}</>}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {m.kind === 'traslado_fondo' ? (
                      <span className="flex items-center gap-1 text-gray-300 whitespace-nowrap">{m.fund?.name}<ArrowRight size={11} className="text-gray-500" />{m.to_fund?.name}</span>
                    ) : (
                      <select
                        value={m.fund_id || ''}
                        onChange={e => quickUpdate(m, { fund_id: e.target.value || null })}
                        className="bg-transparent text-gray-300 text-xs border border-gray-800 rounded px-1.5 py-1 hover:border-gray-600 outline-none max-w-[130px]"
                      >
                        <option value="">Sin fondo</option>
                        {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono whitespace-nowrap ${s > 0 ? 'text-kawa-green' : s < 0 ? 'text-red-300' : 'text-gray-300'}`}>
                    {s > 0 ? '+' : s < 0 ? '−' : ''}{money(m.amount)}
                    {m.interest_amount ? <p className="text-[10px] text-gray-500">interés {money(m.interest_amount)}</p> : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <button onClick={() => setEditing(m)} className="p-1.5 text-gray-400 hover:text-white" title="Editar"><Pencil size={14} /></button>
                    {m.source !== 'auto' && (
                      <button onClick={() => remove(m)} className="p-1.5 text-gray-400 hover:text-red-400" title="Borrar"><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              );
            })}
            {data && data.items.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray-500 py-10">No hay movimientos con esos filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.total > data.items.length && (
        <button onClick={() => setFilters(f => ({ ...f, limit: (f.limit || 300) + 500 }))} className="w-full py-2 text-sm text-gray-400 hover:text-white border border-gray-800 rounded-lg">
          Ver más ({data.total - data.items.length} restantes)
        </button>
      )}

      {editing && (
        <MovementModal
          accounts={accounts}
          funds={funds}
          categories={categories}
          movement={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}
