import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, ChevronRight, CreditCard, Loader2, Search, Wallet, X } from 'lucide-react';
import {
  financeService, money, shortDate, todayInput, inputToIso, PAYMENT_STATUS,
  type BatchFinance, type FinanceAccount, type FundReport, type PaymentStatus,
} from '../../services/financeService';
import { apiError } from '../../services/productMasterService';
import { cardCls, filterCls, inputCls, labelCls, parseMoney } from './ui';

interface Props {
  accounts: FinanceAccount[];
  funds: FundReport[];
  onChanged: () => void;
}

// Lotes: con qué plata se compró cada uno, si ya se pagó y con qué cuenta
export default function BatchesTab({ accounts, funds, onChanged }: Props) {
  const [batches, setBatches] = useState<BatchFinance[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<BatchFinance | null>(null);
  const [fundFilter, setFundFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setBatches(await financeService.batches());
    } catch (err) {
      toast.error(apiError(err, 'No se pudieron cargar los lotes'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const fundName = (id: string | null) => funds.find(f => f.id === id)?.name || 'Sin fondo';

  const visible = useMemo(() => (batches || []).filter(b =>
    (!fundFilter || b.effective_fund_id === fundFilter || b.items.some(i => i.fund_id === fundFilter)) &&
    (!statusFilter || b.payment_status === statusFilter) &&
    (!q || b.batch_number.toLowerCase().includes(q.toLowerCase()) || b.items.some(i => i.name.toLowerCase().includes(q.toLowerCase())))
  ), [batches, fundFilter, statusFilter, q]);

  const totals = useMemo(() => visible.reduce((t, b) => ({
    cost: t.cost + b.total_cost, paid: t.paid + b.paid, pending: t.pending + (b.payment_status === 'historico' ? 0 : b.pending), sales: t.sales + b.sales,
  }), { cost: 0, paid: 0, pending: 0, sales: 0 }), [visible]);

  const setBatchFund = async (b: BatchFinance, fundId: string) => {
    try {
      await financeService.setBatchFund(b.id, fundId || null);
      toast.success(`${b.batch_number} ahora es de ${fundName(fundId)}`);
      load(); onChanged();
    } catch (err) { toast.error(apiError(err, 'No se pudo cambiar el fondo')); }
  };

  const setItemFund = async (itemId: string, fundId: string) => {
    try {
      await financeService.setItemFund(itemId, fundId || null);
      load(); onChanged();
    } catch (err) { toast.error(apiError(err, 'No se pudo cambiar el fondo')); }
  };

  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-4">
      <div className={`${cardCls} p-3 flex flex-wrap gap-2 items-center`}>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Lote o pieza..." className={`${inputCls} pl-9`} />
        </div>
        <select value={fundFilter} onChange={e => setFundFilter(e.target.value)} className={filterCls}>
          <option value="">Todos los fondos</option>
          {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as PaymentStatus | '')} className={filterCls}>
          <option value="">Cualquier estado</option>
          {(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map(s => <option key={s} value={s}>{PAYMENT_STATUS[s].label}</option>)}
        </select>
        {loading && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={`${visible.length} lotes · costo`} value={money(totals.cost)} />
        <Stat label="Pagado en la caja" value={money(totals.paid)} />
        <Stat label="Falta por pagar" value={money(totals.pending)} tone={totals.pending > 0 ? 'red' : undefined} />
        <Stat label="Vendido de esos lotes" value={money(totals.sales)} tone="green" />
      </div>

      <div className={`${cardCls} divide-y divide-gray-800`}>
        {visible.map(b => {
          const st = PAYMENT_STATUS[b.payment_status];
          const isOpen = open.has(b.id);
          return (
            <div key={b.id}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button onClick={() => toggle(b.id)} className="text-gray-400 hover:text-white">
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div className="min-w-[150px]">
                  <p className="text-white font-semibold">{b.batch_number}</p>
                  <p className="text-[11px] text-gray-500">{shortDate(b.purchase_date)} · {b.units} piezas · {b.sold_units} vendidas</p>
                </div>
                <select
                  value={b.fund_id || ''}
                  onChange={e => setBatchFund(b, e.target.value)}
                  className="bg-[#1e1e1e] border border-gray-700 text-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none"
                  title="Con qué plata se compró"
                >
                  <option value="">Sin fondo</option>
                  {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                {b.mixed_funds && <span className="text-[11px] text-purple-300 border border-purple-500/30 rounded px-1.5 py-0.5">Fondos mezclados</span>}
                <span className={`text-[11px] border rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                {b.paid_with.length > 0 && (
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    {b.paid_with.some(a => a.kind === 'tarjeta') ? <CreditCard size={12} /> : <Wallet size={12} />}
                    {b.paid_with.map(a => a.name).join(', ')}
                  </span>
                )}
                {b.owed_on.length > 0 && (
                  <span className="text-[11px] text-orange-300 flex items-center gap-1" title="Se pagó con una cuenta que todavía tiene deuda">
                    <AlertTriangle size={12} /> Se debe en {b.owed_on.join(', ')}
                  </span>
                )}
                <div className="flex-1" />
                <div className="text-right">
                  <p className="text-white font-mono text-sm">{money(b.total_cost)}</p>
                  {b.paid > 0 && b.pending > 0 && <p className="text-[11px] text-red-300">faltan {money(b.pending)}</p>}
                  <p className="text-[11px] text-kawa-green">vendido {money(b.sales)}</p>
                </div>
                {b.payment_status !== 'pagado' && (
                  <button onClick={() => setPaying(b)} className="px-3 py-1.5 rounded-lg border border-kawa-green/40 text-kawa-green text-xs hover:bg-kawa-green/10">
                    Registrar pago
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pl-12 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs max-w-xl">
                    {([['compra_lote', 'Compra'], ['envio_lote', 'Envío'], ['aduana_lote', 'Aduana y otros']] as const).map(([k, label]) => (
                      <div key={k} className="bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2">
                        <p className="text-gray-500">{label}</p>
                        <p className="text-white font-mono">{money(b.parts[k])}</p>
                        <p className={`text-[11px] ${(b.paid_by_kind[k] || 0) >= b.parts[k] ? 'text-kawa-green' : 'text-gray-500'}`}>pagado {money(b.paid_by_kind[k])}</p>
                      </div>
                    ))}
                  </div>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 uppercase tracking-wider text-[10px]">
                        <th className="py-1">Pieza</th><th className="py-1">Cant.</th><th className="py-1 text-right">Costo puesto acá</th><th className="py-1">Vendidas</th><th className="py-1">Fondo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.items.map(i => (
                        <tr key={i.id} className="border-t border-gray-800/60">
                          <td className="py-1.5 text-gray-200">{i.name}</td>
                          <td className="py-1.5 text-gray-400">{i.quantity}</td>
                          <td className="py-1.5 text-right font-mono text-gray-300">{money(i.landed_cost)}</td>
                          <td className="py-1.5 text-gray-400">{i.sold}/{i.quantity}</td>
                          <td className="py-1.5">
                            <select
                              value={i.fund_id || ''}
                              onChange={e => setItemFund(i.id, e.target.value)}
                              className={`bg-transparent border rounded px-1.5 py-0.5 outline-none ${i.fund_id ? 'border-purple-500/40 text-purple-200' : 'border-gray-800 text-gray-400'}`}
                            >
                              <option value="">Igual que el lote ({fundName(b.effective_fund_id)})</option>
                              {funds.filter(f => f.id !== b.fund_id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {b.movements.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Pagos</p>
                      {b.movements.map(m => (
                        <p key={m.id} className="text-xs text-gray-300">
                          {shortDate(m.date)} · {m.description} · <span className="font-mono">{money(m.amount)}</span>
                          {m.account_id && <span className="text-gray-500"> · {accounts.find(a => a.id === m.account_id)?.name}</span>}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {batches && visible.length === 0 && <p className="text-center text-gray-500 py-10 text-sm">No hay lotes con esos filtros</p>}
      </div>

      {paying && (
        <PayBatchModal
          batch={paying}
          accounts={accounts}
          funds={funds}
          onClose={() => setPaying(null)}
          onSaved={() => { setPaying(null); load(); onChanged(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  return (
    <div className={`${cardCls} px-4 py-3`}>
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-lg font-bold font-mono ${tone === 'green' ? 'text-kawa-green' : tone === 'red' ? 'text-red-300' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function PayBatchModal({ batch, accounts, funds, onClose, onSaved }: {
  batch: BatchFinance; accounts: FinanceAccount[]; funds: FundReport[]; onClose: () => void; onSaved: () => void;
}) {
  const left = (k: keyof BatchFinance['parts']) => Math.max(0, batch.parts[k] - (batch.paid_by_kind[k] || 0));
  const [form, setForm] = useState({
    account_id: accounts.find(a => a.kind === 'banco' && a.active)?.id || '',
    fund_id: batch.fund_id || '',
    date: todayInput(),
    compra_lote: String(left('compra_lote') || ''),
    envio_lote: String(left('envio_lote') || ''),
    aduana_lote: String(left('aduana_lote') || ''),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const account = accounts.find(a => a.id === form.account_id);
  const total = parseMoney(form.compra_lote) + parseMoney(form.envio_lote) + parseMoney(form.aduana_lote);

  const save = async () => {
    if (!form.account_id) { toast.error('Elige con qué se pagó'); return; }
    try {
      setSaving(true);
      await financeService.payBatch(batch.id, {
        account_id: form.account_id,
        fund_id: form.fund_id || null,
        date: inputToIso(form.date),
        notes: form.notes,
        parts: { compra_lote: parseMoney(form.compra_lote), envio_lote: parseMoney(form.envio_lote), aduana_lote: parseMoney(form.aduana_lote) },
      });
      toast.success(`Pago de ${batch.batch_number} registrado`);
      onSaved();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo registrar el pago'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-kawa-gray border border-gray-700 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Pago de {batch.batch_number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Con qué se pagó</label>
              <select value={form.account_id} onChange={e => set('account_id', e.target.value)} className={inputCls}>
                <option value="">Elige</option>
                {accounts.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
          </div>
          {account?.is_debt && (
            <p className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
              Con {account.name} el lote queda pagado, pero la deuda de {account.name} sube {money(total)}.
            </p>
          )}
          <div>
            <label className={labelCls}>Fondo</label>
            <select value={form.fund_id} onChange={e => set('fund_id', e.target.value)} className={inputCls}>
              <option value="">El del lote ({batch.fund_name || 'Caja principal'})</option>
              {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([['compra_lote', 'Compra'], ['envio_lote', 'Envío'], ['aduana_lote', 'Aduana']] as const).map(([k, label]) => (
              <div key={k}>
                <label className={labelCls}>{label}</label>
                <input inputMode="numeric" value={form[k]} onChange={e => set(k, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Total: <span className="text-white font-mono">{money(total)}</span> de {money(batch.total_cost)}</p>
          <div>
            <label className={labelCls}>Notas</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm hover:text-white">Cancelar</button>
          <button onClick={save} disabled={saving || total <= 0} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-kawa-green text-black font-bold text-sm hover:bg-kawa-green-light disabled:opacity-50">
            {saving && <Loader2 size={15} className="animate-spin" />} Registrar pago
          </button>
        </div>
      </div>
    </div>
  );
}
