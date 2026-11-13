import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';
import {
  financeService, inputToIso, dateInput, todayInput, KIND_GROUPS, KIND_LABELS, IN_KINDS,
  type FinanceAccount, type FundReport, type Movement, type MovementPayload,
} from '../../services/financeService';
import { apiError } from '../../services/productMasterService';
import { inputCls, labelCls, parseMoney } from './ui';

interface Props {
  accounts: FinanceAccount[];
  funds: FundReport[];
  movement?: Movement | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

// Crear o editar un movimiento de plata
export default function MovementModal({ accounts, funds, movement, categories, onClose, onSaved }: Props) {
  const defaultFund = funds.find(f => f.is_default)?.id || '';
  const [form, setForm] = useState({
    date: movement ? dateInput(movement.date) : todayInput(),
    kind: movement?.kind || 'gasto_negocio',
    amount: movement ? String(movement.amount) : '',
    description: movement?.description || '',
    category: movement?.category || '',
    account_id: movement?.account_id || accounts.find(a => a.kind === 'banco')?.id || '',
    to_account_id: movement?.to_account_id || '',
    fund_id: movement ? movement.fund_id || '' : defaultFund,
    to_fund_id: movement?.to_fund_id || '',
    interest_amount: movement?.interest_amount ? String(movement.interest_amount) : '',
    notes: movement?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const isTransfer = form.kind === 'traslado';
  const isFundTransfer = form.kind === 'traslado_fondo';
  const isIn = IN_KINDS.includes(form.kind);
  const toAccount = accounts.find(a => a.id === form.to_account_id);
  const payingDebt = isTransfer && toAccount?.is_debt;

  const save = async () => {
    const amount = parseMoney(form.amount);
    if (!amount) { toast.error('Pon el monto'); return; }
    const payload: MovementPayload = {
      date: inputToIso(form.date),
      kind: form.kind,
      amount,
      description: form.description,
      category: form.category || null,
      account_id: isFundTransfer ? null : form.account_id || null,
      to_account_id: isTransfer ? form.to_account_id || null : null,
      fund_id: form.fund_id || null,
      to_fund_id: isFundTransfer || isTransfer ? form.to_fund_id || null : null,
      interest_amount: payingDebt && form.interest_amount ? parseMoney(form.interest_amount) : null,
      notes: form.notes || null,
    };
    try {
      setSaving(true);
      if (movement) await financeService.updateMovement(movement.id, payload);
      else await financeService.createMovement(payload);
      toast.success(movement ? 'Movimiento guardado' : 'Movimiento creado');
      onSaved();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const accountOptions = (filter?: (a: FinanceAccount) => boolean) => accounts
    .filter(a => a.active || a.id === form.account_id || a.id === form.to_account_id)
    .filter(a => !filter || filter(a))
    .map(a => <option key={a.id} value={a.id}>{a.name}</option>);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-kawa-gray border border-gray-700 rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">{movement ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-3">
          {movement?.source_ref && (
            <p className="text-[11px] text-gray-500">Viene de {movement.source === 'sheet' ? 'el Sheet' : 'la app'}: {movement.source_ref}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.kind} onChange={e => set('kind', e.target.value)} className={inputCls}>
                {KIND_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.kinds.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Monto</label>
              <input inputMode="numeric" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="150000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Categoría</label>
              <input list="caja-categories" value={form.category} onChange={e => set('category', e.target.value)} placeholder="servidores, envíos..." className={inputCls} />
              <datalist id="caja-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Pago servidor Zeabur" className={inputCls} />
          </div>

          {!isFundTransfer && (
            <div className="grid grid-cols-2 gap-3">
              <div className={isTransfer ? '' : 'col-span-2'}>
                <label className={labelCls}>{isTransfer ? 'Sale de' : isIn ? 'Entra a' : 'Sale de'}</label>
                <select value={form.account_id} onChange={e => set('account_id', e.target.value)} className={inputCls}>
                  <option value="">Elige cuenta</option>
                  {accountOptions()}
                </select>
              </div>
              {isTransfer && (
                <div>
                  <label className={labelCls}>Va a</label>
                  <select value={form.to_account_id} onChange={e => set('to_account_id', e.target.value)} className={inputCls}>
                    <option value="">Elige cuenta</option>
                    {accountOptions(a => a.id !== form.account_id)}
                  </select>
                </div>
              )}
            </div>
          )}

          {payingDebt && (
            <div>
              <label className={labelCls}>De ese pago, cuánto es interés (opcional)</label>
              <input inputMode="numeric" value={form.interest_amount} onChange={e => set('interest_amount', e.target.value)} placeholder="0" className={inputCls} />
              <p className="text-[11px] text-gray-500 mt-1">El resto baja la deuda de {toAccount?.name}. El interés cuenta como gasto.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className={isFundTransfer || isTransfer ? '' : 'col-span-2'}>
              <label className={labelCls}>{isFundTransfer ? 'Del fondo' : 'Fondo (de quién es la plata)'}</label>
              <select value={form.fund_id} onChange={e => set('fund_id', e.target.value)} className={inputCls}>
                <option value="">Sin fondo</option>
                {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            {(isFundTransfer || isTransfer) && (
              <div>
                <label className={labelCls}>{isFundTransfer ? 'Al fondo' : 'Pasa al fondo (opcional)'}</label>
                <select value={form.to_fund_id} onChange={e => set('to_fund_id', e.target.value)} className={inputCls}>
                  <option value="">{isFundTransfer ? 'Elige fondo' : 'El mismo'}</option>
                  {funds.filter(f => f.id !== form.fund_id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls} />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm hover:text-white">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-kawa-green text-black font-bold text-sm hover:bg-kawa-green-light disabled:opacity-50">
            {saving && <Loader2 size={15} className="animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
