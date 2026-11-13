import { useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  financeService, money, dateInput, inputToIso, todayInput, ACCOUNT_KIND_LABELS,
  type AccountKind, type FinanceAccount, type FundReport,
} from '../../services/financeService';
import { apiError } from '../../services/productMasterService';
import { cardCls, inputCls, labelCls, parseMoney } from './ui';

interface Props {
  accounts: FinanceAccount[];
  funds: FundReport[];
  onChanged: () => void;
}

// Cuentas (dónde está la plata) y fondos (de quién es)
export default function AccountsTab({ accounts, funds, onChanged }: Props) {
  const [account, setAccount] = useState<FinanceAccount | 'new' | null>(null);
  const [fund, setFund] = useState<FundReport | 'new' | null>(null);

  const removeAccount = async (a: FinanceAccount) => {
    if (!confirm(`¿Borrar la cuenta ${a.name}?`)) return;
    try { await financeService.deleteAccount(a.id); toast.success('Cuenta borrada'); onChanged(); }
    catch (err) { toast.error(apiError(err, 'No se pudo borrar')); }
  };
  const removeFund = async (f: FundReport) => {
    if (!confirm(`¿Borrar el fondo ${f.name}?`)) return;
    try { await financeService.deleteFund(f.id); toast.success('Fondo borrado'); onChanged(); }
    catch (err) { toast.error(apiError(err, 'No se pudo borrar')); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Cuentas</h2>
            <p className="text-xs text-gray-500">Dónde está la plata. Las tarjetas, préstamos y personas a las que les debes van en negativo.</p>
          </div>
          <button onClick={() => setAccount('new')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kawa-green text-black font-bold text-sm"><Plus size={15} /> Cuenta</button>
        </div>
        <div className={`${cardCls} divide-y divide-gray-800`}>
          {accounts.map(a => (
            <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${a.active ? '' : 'opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{a.name}</p>
                <p className="text-[11px] text-gray-500">
                  {ACCOUNT_KIND_LABELS[a.kind]} · arranca con {money(a.opening_balance)} el {dateInput(a.opening_date) || '—'} · {a.movements_count} movimientos
                </p>
              </div>
              <p className={`font-mono ${a.balance < 0 ? 'text-red-300' : 'text-white'}`}>{money(a.balance)}</p>
              <button onClick={() => setAccount(a)} className="p-1.5 text-gray-400 hover:text-white"><Pencil size={14} /></button>
              <button onClick={() => removeAccount(a)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Fondos</h2>
            <p className="text-xs text-gray-500">De quién es la plata. Cada lote se marca con el fondo que lo pagó y sus ventas vuelven a ese fondo.</p>
          </div>
          <button onClick={() => setFund('new')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kawa-green text-black font-bold text-sm"><Plus size={15} /> Fondo</button>
        </div>
        <div className={`${cardCls} divide-y divide-gray-800`}>
          {funds.map(f => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{f.name} {f.is_default && <span className="text-[10px] text-gray-400 border border-gray-700 rounded px-1 ml-1">por defecto</span>}</p>
                <p className="text-[11px] text-gray-500">
                  {f.kind === 'prestamo' ? `Préstamo${f.loan_name ? ` · ${f.loan_name}` : ''}` : 'Plata propia'} · {f.lots.length} lotes{f.closed_at ? ' · cerrado' : ''}
                </p>
              </div>
              <button onClick={() => setFund(f)} className="p-1.5 text-gray-400 hover:text-white"><Pencil size={14} /></button>
              <button onClick={() => removeFund(f)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </section>

      {account && <AccountModal account={account === 'new' ? null : account} onClose={() => setAccount(null)} onSaved={() => { setAccount(null); onChanged(); }} />}
      {fund && <FundModal fund={fund === 'new' ? null : fund} accounts={accounts} onClose={() => setFund(null)} onSaved={() => { setFund(null); onChanged(); }} />}
    </div>
  );
}

function Modal({ title, onClose, children, onSave, saving }: { title: string; onClose: () => void; children: ReactNode; onSave: () => void; saving: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-kawa-gray border border-gray-700 rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm hover:text-white">Cancelar</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-kawa-green text-black font-bold text-sm disabled:opacity-50">
            {saving && <Loader2 size={15} className="animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountModal({ account, onClose, onSaved }: { account: FinanceAccount | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: account?.name || '',
    kind: (account?.kind || 'banco') as AccountKind,
    opening_balance: account ? String(account.opening_balance) : '0',
    opening_date: account ? dateInput(account.opening_date) : todayInput(),
    credit_limit: account?.credit_limit ? String(account.credit_limit) : '',
    sort_order: String(account?.sort_order ?? 0),
    active: account?.active ?? true,
    notes: account?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const isDebt = ['tarjeta', 'prestamo', 'persona'].includes(form.kind);

  const save = async () => {
    // El saldo puede ser negativo: se respeta el signo
    const raw = form.opening_balance.trim();
    const opening = (raw.startsWith('-') ? -1 : 1) * parseMoney(raw.replace('-', ''));
    const payload = {
      name: form.name, kind: form.kind, opening_balance: opening,
      opening_date: form.opening_date ? inputToIso(form.opening_date) : null,
      credit_limit: form.credit_limit ? parseMoney(form.credit_limit) : null,
      sort_order: Number(form.sort_order) || 0, active: form.active, notes: form.notes || null,
    };
    try {
      setSaving(true);
      if (account) await financeService.updateAccount(account.id, payload);
      else await financeService.createAccount(payload);
      toast.success('Cuenta guardada');
      onSaved();
    } catch (err) { toast.error(apiError(err, 'No se pudo guardar')); } finally { setSaving(false); }
  };

  return (
    <Modal title={account ? `Editar ${account.name}` : 'Nueva cuenta'} onClose={onClose} onSave={save} saving={saving}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Nombre</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nequi" className={inputCls} /></div>
        <div>
          <label className={labelCls}>Tipo</label>
          <select value={form.kind} onChange={e => set('kind', e.target.value)} className={inputCls}>
            {(Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map(k => <option key={k} value={k}>{ACCOUNT_KIND_LABELS[k]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Saldo inicial</label>
          <input value={form.opening_balance} onChange={e => set('opening_balance', e.target.value)} className={inputCls} />
          {isDebt && <p className="text-[11px] text-gray-500 mt-1">Si debes, ponlo en negativo: -1500000</p>}
        </div>
        <div><label className={labelCls}>Desde</label><input type="date" value={form.opening_date} onChange={e => set('opening_date', e.target.value)} className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>{form.kind === 'prestamo' ? 'Monto del préstamo' : 'Cupo'}</label><input value={form.credit_limit} onChange={e => set('credit_limit', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Orden</label><input value={form.sort_order} onChange={e => set('sort_order', e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Notas</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls} /></div>
      <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="accent-kawa-green" /> Activa</label>
      <p className="text-[11px] text-gray-500">Saldo = saldo inicial + los movimientos desde esa fecha.</p>
    </Modal>
  );
}

function FundModal({ fund, accounts, onClose, onSaved }: { fund: FundReport | null; accounts: FinanceAccount[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: fund?.name || '',
    kind: fund?.kind || 'propio',
    account_id: fund?.account_id || '',
    opened_at: fund ? dateInput(fund.opened_at) : todayInput(),
    closed_at: dateInput(fund?.closed_at),
    notes: fund?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    const payload = {
      name: form.name, kind: form.kind as 'propio' | 'prestamo', account_id: form.kind === 'prestamo' ? form.account_id || null : null,
      opened_at: form.opened_at ? inputToIso(form.opened_at) : null, closed_at: form.closed_at ? inputToIso(form.closed_at) : null, notes: form.notes || null,
    };
    try {
      setSaving(true);
      if (fund) await financeService.updateFund(fund.id, payload);
      else await financeService.createFund(payload);
      toast.success('Fondo guardado');
      onSaved();
    } catch (err) { toast.error(apiError(err, 'No se pudo guardar')); } finally { setSaving(false); }
  };

  return (
    <Modal title={fund ? `Editar ${fund.name}` : 'Nuevo fondo'} onClose={onClose} onSave={save} saving={saving}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Nombre</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Coop etapa 3" className={inputCls} /></div>
        <div>
          <label className={labelCls}>Tipo</label>
          <select value={form.kind} onChange={e => set('kind', e.target.value)} className={inputCls}>
            <option value="propio">Plata propia</option>
            <option value="prestamo">Préstamo</option>
          </select>
        </div>
      </div>
      {form.kind === 'prestamo' && (
        <div>
          <label className={labelCls}>Préstamo que lo financia</label>
          <select value={form.account_id} onChange={e => set('account_id', e.target.value)} className={inputCls}>
            <option value="">Ninguno</option>
            {accounts.filter(a => a.is_debt).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Empezó</label><input type="date" value={form.opened_at} onChange={e => set('opened_at', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Cerró (opcional)</label><input type="date" value={form.closed_at} onChange={e => set('closed_at', e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Notas</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls} /></div>
    </Modal>
  );
}
