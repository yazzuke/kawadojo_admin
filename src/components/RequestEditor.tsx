import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, Trash2 } from 'lucide-react';
import {
  CHANNELS, STATUSES, customerRequestService,
  type CustomerRequest, type LinkOption, type RequestDraft,
} from '../services/customerRequestService';
import { apiError } from '../services/productMasterService';
import type { Category } from '../types/product';

interface Props {
  request: CustomerRequest;
  models: Array<{ id: string; name: string }>;
  categories: Category[];
  links: { impex_parts: LinkOption[]; masters: LinkOption[] } | null;
  onDone: () => void;
}

const input = 'w-full bg-kawa-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-kawa-green outline-none';
const label = 'block text-[11px] uppercase tracking-wide text-gray-500 mb-1';

// Buscador con lista: escribes parte del nombre o código y eliges
function LinkPicker({ id, value, options, placeholder, onChange }: {
  id: string;
  value: string | null;
  options: LinkOption[];
  placeholder: string;
  onChange: (id: string | null) => void;
}) {
  const current = options.find(o => o.id === value)?.label ?? '';
  const [text, setText] = useState(current);
  return (
    <>
      <input
        list={id}
        value={text}
        placeholder={placeholder}
        onChange={e => {
          setText(e.target.value);
          const found = options.find(o => o.label === e.target.value);
          if (found) onChange(found.id);
          else if (!e.target.value.trim()) onChange(null);
        }}
        className={`${input} ${value ? 'border-kawa-green/50' : ''}`}
      />
      <datalist id={id}>{options.map(o => <option key={o.id} value={o.label} />)}</datalist>
    </>
  );
}

// Editar una solicitud guardada, incluidos sus vínculos con tus datos
export default function RequestEditor({ request: r, models, categories, links, onDone }: Props) {
  const [form, setForm] = useState<RequestDraft>({
    requested_at: r.requested_at.slice(0, 10),
    channel: r.channel,
    customer_name: r.customer_name ?? '',
    customer_phone: r.customer_phone ?? '',
    moto_text: r.moto_text ?? '',
    moto_model_id: r.moto_model_id,
    part_text: r.part_text,
    oem_code: r.oem_code ?? '',
    quantity: r.quantity,
    quoted_price: r.quoted_price,
    status: r.status,
    category_id: r.category_id,
    impex_part_id: r.impex_part_id,
    master_id: r.master_id,
    notes: r.notes ?? '',
    source_text: r.source_text,
  });
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<RequestDraft>) => setForm(f => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.part_text.trim()) { toast.error('Falta la pieza'); return; }
    try {
      setBusy(true);
      await customerRequestService.update(r.id, form);
      toast.success('Guardado');
      onDone();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo guardar'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`¿Borrar la solicitud "${r.part_text}"?`)) return;
    try {
      setBusy(true);
      await customerRequestService.remove(r.id);
      toast.success('Solicitud borrada');
      onDone();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo borrar'));
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-black/20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><span className={label}>Fecha</span><input type="date" value={form.requested_at} onChange={e => set({ requested_at: e.target.value })} className={input} /></div>
        <div>
          <span className={label}>Canal</span>
          <select value={form.channel} onChange={e => set({ channel: e.target.value as RequestDraft['channel'] })} className={input}>
            {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div><span className={label}>Cliente</span><input value={form.customer_name} onChange={e => set({ customer_name: e.target.value })} className={input} /></div>
        <div><span className={label}>Teléfono</span><input value={form.customer_phone} onChange={e => set({ customer_phone: e.target.value })} className={input} /></div>
        <div className="col-span-2"><span className={label}>Pieza que pidió</span><input value={form.part_text} onChange={e => set({ part_text: e.target.value })} className={input} /></div>
        <div><span className={label}>Código OEM</span><input value={form.oem_code} onChange={e => set({ oem_code: e.target.value })} className={`${input} font-mono`} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className={label}>Cant.</span><input type="number" min={1} value={form.quantity} onChange={e => set({ quantity: Math.max(1, Number(e.target.value) || 1) })} className={input} /></div>
          <div><span className={label}>Cotizado</span><input type="number" min={0} step={1000} value={form.quoted_price ?? ''} onChange={e => set({ quoted_price: e.target.value ? Number(e.target.value) : null })} className={input} /></div>
        </div>
        <div>
          <span className={label}>Estado</span>
          <select value={form.status} onChange={e => set({ status: e.target.value as RequestDraft['status'] })} className={input}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="col-span-1 md:col-span-3"><span className={label}>Notas</span><input value={form.notes} onChange={e => set({ notes: e.target.value })} className={input} /></div>
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-2">Vincular con tus datos <span className="text-gray-600">(sirve para el resumen: así se juntan los pedidos de la misma pieza)</span></p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <span className={label}>Moto (como la escribió)</span>
            <input value={form.moto_text} onChange={e => set({ moto_text: e.target.value })} className={input} />
          </div>
          <div>
            <span className={label}>Moto en tus modelos</span>
            <select value={form.moto_model_id ?? ''} onChange={e => set({ moto_model_id: e.target.value || null })} className={input}>
              <option value="">Sin vincular</option>
              {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Categoría</span>
            <select value={form.category_id ?? ''} onChange={e => set({ category_id: e.target.value || null })} className={input}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div />
          <div className="md:col-span-2">
            <span className={label}>Pieza de Impex guardada</span>
            {links
              ? <LinkPicker id={`impex-${r.id}`} value={form.impex_part_id ?? null} options={links.impex_parts} placeholder="Busca por nombre o código" onChange={id => set({ impex_part_id: id })} />
              : <div className="text-xs text-gray-500 py-2 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Cargando...</div>}
          </div>
          <div className="md:col-span-2">
            <span className={label}>Ficha de producto</span>
            {links
              ? <LinkPicker id={`master-${r.id}`} value={form.master_id ?? null} options={links.masters} placeholder="Busca la ficha" onChange={id => set({ master_id: id })} />
              : <div className="text-xs text-gray-500 py-2 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Cargando...</div>}
          </div>
        </div>
      </div>

      {r.source_text && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-white">Ver el chat original</summary>
          <pre className="mt-2 whitespace-pre-wrap bg-kawa-black border border-gray-800 rounded-lg p-3 text-gray-300 font-sans">{r.source_text}</pre>
        </details>
      )}

      <div className="flex items-center gap-2">
        <button onClick={remove} disabled={busy} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-500/30 rounded-lg">
          <Trash2 size={13} /> Borrar
        </button>
        <button onClick={save} disabled={busy} className="ml-auto flex items-center gap-1.5 text-sm font-semibold bg-kawa-green text-black px-4 py-2 rounded-lg disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar cambios
        </button>
      </div>
    </div>
  );
}
