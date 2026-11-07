import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import {
  CHANNELS, STATUSES, customerRequestService, formatDate, matchModel, statusInfo, today,
  type Duplicate, type RequestDraft,
} from '../services/customerRequestService';
import { apiError } from '../services/productMasterService';

interface Model { id: string; name: string }

interface DraftRow extends RequestDraft { key: string; dups?: Duplicate[] }

interface Props {
  models: Model[];
  onSaved: () => void;
}

const DRAFT_KEY = 'kawadojo.requests.draft';
let seq = 0;
const newKey = () => `r${Date.now()}-${seq++}`;

// Lo que se manda al servidor: la fila sin los datos de pantalla
const toDraft = (r: DraftRow): RequestDraft => {
  const copy: Partial<DraftRow> = { ...r };
  delete copy.key;
  delete copy.dups;
  return copy as RequestDraft;
};

const emptyRow = (from?: Partial<RequestDraft>): DraftRow => ({
  key: newKey(),
  requested_at: from?.requested_at || today(),
  channel: from?.channel || 'whatsapp',
  customer_name: from?.customer_name || '',
  customer_phone: from?.customer_phone || '',
  moto_text: from?.moto_text || '',
  part_text: '',
  oem_code: '',
  quantity: 1,
  quoted_price: null,
  status: 'pendiente',
  notes: '',
});

function loadDraft(): DraftRow[] {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]') as RequestDraft[];
    if (Array.isArray(saved) && saved.length) return saved.map(r => ({ ...r, key: newKey() }));
  } catch { /* sin borrador */ }
  return [emptyRow()];
}

const cell = 'w-full bg-kawa-black border border-gray-800 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:border-kawa-green outline-none';

// Tabla para escribir solicitudes rápido. Enter = fila nueva (repite fecha, canal, cliente y moto). Ctrl+Enter = guardar
export default function RequestEntryGrid({ models, onSaved }: Props) {
  const [rows, setRows] = useState<DraftRow[]>(loadDraft);
  const [saving, setSaving] = useState(false);
  const [dupsChecked, setDupsChecked] = useState(false);
  const partRefs = useRef(new Map<string, HTMLInputElement>());
  const focusKey = useRef<string | null>(null);

  // El borrador sobrevive si se recarga la página
  useEffect(() => {
    try {
      const filled = rows.filter(r => r.part_text.trim());
      localStorage.setItem(DRAFT_KEY, JSON.stringify(filled.map(toDraft)));
    } catch { /* sin almacenamiento */ }
  }, [rows]);

  useEffect(() => {
    if (focusKey.current) {
      partRefs.current.get(focusKey.current)?.focus();
      focusKey.current = null;
    }
  });

  const update = (key: string, patch: Partial<DraftRow>) => {
    // Si cambia cliente, pieza o fecha hay que volver a revisar repetidos
    const recheck = 'customer_name' in patch || 'part_text' in patch || 'requested_at' in patch;
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch, ...(recheck && { dups: undefined }) } : r)));
    if (recheck) setDupsChecked(false);
  };

  const addAfter = (index: number) => {
    const base = rows[index] ?? rows[rows.length - 1];
    const row = emptyRow(base);
    focusKey.current = row.key;
    setRows(prev => [...prev.slice(0, index + 1), row, ...prev.slice(index + 1)]);
  };

  const removeRow = (key: string) => {
    setRows(prev => (prev.length > 1 ? prev.filter(r => r.key !== key) : [emptyRow(prev[0])]));
  };

  const clearAll = () => {
    if (rows.some(r => r.part_text.trim()) && !confirm('¿Borrar todo lo que tienes sin guardar?')) return;
    setRows([emptyRow(rows[0])]);
    setDupsChecked(false);
  };

  const save = async () => {
    const filled = rows.filter(r => r.part_text.trim());
    if (!filled.length) { toast.error('Escribe al menos una pieza'); return; }
    if (filled.some(r => !r.requested_at)) { toast.error('Hay filas sin fecha'); return; }
    try {
      setSaving(true);
      if (!dupsChecked) {
        const dups = await customerRequestService.duplicates(filled);
        const found = dups.filter(d => d.length).length;
        setDupsChecked(true);
        if (found) {
          setRows(prev => prev.map(r => {
            const i = filled.findIndex(f => f.key === r.key);
            return i >= 0 ? { ...r, dups: dups[i] } : r;
          }));
          toast(`${found} ${found === 1 ? 'fila parece repetida' : 'filas parecen repetidas'}. Revisa y dale Guardar otra vez si están bien.`, { icon: '⚠️', duration: 6000 });
          return;
        }
      }
      const payload = filled.map(r => ({
        ...toDraft(r),
        moto_model_id: r.moto_text ? matchModel(r.moto_text, models)?.id ?? null : null,
      }));
      const saved = await customerRequestService.create(payload);
      toast.success(`${saved.length} ${saved.length === 1 ? 'solicitud guardada' : 'solicitudes guardadas'}`);
      setRows([emptyRow(filled[filled.length - 1])]);
      setDupsChecked(false);
      onSaved();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) { save(); return; }
    if (index === rows.length - 1) addAfter(index);
    else partRefs.current.get(rows[index + 1].key)?.focus();
  };

  const filledCount = rows.filter(r => r.part_text.trim()).length;

  return (
    <div className="bg-kawa-gray border border-gray-800 rounded-xl">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-800">
        <h2 className="text-white font-semibold mr-auto">Anotar solicitudes</h2>
        <span className="text-xs text-gray-500 hidden md:inline">
          <kbd className="px-1 border border-gray-700 rounded">Enter</kbd> fila nueva ·{' '}
          <kbd className="px-1 border border-gray-700 rounded">Ctrl+Enter</kbd> guardar
        </span>
        <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 border border-gray-700 rounded-lg">
          <X size={13} /> Limpiar
        </button>
        <button
          onClick={save}
          disabled={saving || !filledCount}
          className="flex items-center gap-1.5 text-sm font-semibold bg-kawa-green text-black px-4 py-1.5 rounded-lg disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar {filledCount > 0 && `(${filledCount})`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1250px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2 w-[130px]">Fecha</th>
              <th className="px-2 py-2 w-[120px]">Canal</th>
              <th className="px-2 py-2 w-[150px]">Cliente</th>
              <th className="px-2 py-2 w-[115px]">Teléfono</th>
              <th className="px-2 py-2 w-[140px]">Moto</th>
              <th className="px-2 py-2">Pieza que pidió</th>
              <th className="px-2 py-2 w-[115px]">Código OEM</th>
              <th className="px-2 py-2 w-[60px]">Cant.</th>
              <th className="px-2 py-2 w-[105px]">Precio cotizado</th>
              <th className="px-2 py-2 w-[135px]">Estado</th>
              <th className="px-2 py-2 w-[160px]">Notas</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const model = r.moto_text ? matchModel(r.moto_text, models) : null;
              return (
                <tr key={r.key} className="align-top border-t border-gray-800/60">
                  <td className="px-2 py-1.5">
                    <input type="date" value={r.requested_at} max={today()} onChange={e => update(r.key, { requested_at: e.target.value })} onKeyDown={e => onKeyDown(e, i)} className={cell} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.channel} onChange={e => update(r.key, { channel: e.target.value as DraftRow['channel'] })} className={cell}>
                      {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.customer_name} onChange={e => update(r.key, { customer_name: e.target.value })} onKeyDown={e => onKeyDown(e, i)} placeholder="Nombre o usuario" className={cell} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.customer_phone} onChange={e => update(r.key, { customer_phone: e.target.value })} onKeyDown={e => onKeyDown(e, i)} placeholder="Opcional" className={cell} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input list="request-models" value={r.moto_text} onChange={e => update(r.key, { moto_text: e.target.value })} onKeyDown={e => onKeyDown(e, i)} placeholder="Ninja 300" className={cell} />
                    {r.moto_text.trim() && (
                      <p className={`text-[10px] mt-0.5 ${model ? 'text-kawa-green' : 'text-gray-500'}`}>
                        {model ? `→ ${model.name}` : 'No está en tus modelos'}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      ref={el => { if (el) partRefs.current.set(r.key, el); else partRefs.current.delete(r.key); }}
                      value={r.part_text}
                      onChange={e => update(r.key, { part_text: e.target.value })}
                      onKeyDown={e => onKeyDown(e, i)}
                      placeholder="Ej: kit de arrastre, retrovisor izquierdo..."
                      className={cell}
                    />
                    {r.dups && r.dups.length > 0 && (
                      <p className="flex items-start gap-1 text-[11px] text-yellow-300 mt-1">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        <span>
                          Ya está: {r.dups.slice(0, 2).map(d => `"${d.part_text}" el ${formatDate(d.requested_at)} (${statusInfo(d.status).label})`).join(', ')}
                        </span>
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.oem_code} onChange={e => update(r.key, { oem_code: e.target.value })} onKeyDown={e => onKeyDown(e, i)} placeholder="Opcional" className={`${cell} font-mono`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={1} value={r.quantity} onChange={e => update(r.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} onKeyDown={e => onKeyDown(e, i)} className={cell} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={r.quoted_price ?? ''}
                      onChange={e => update(r.key, { quoted_price: e.target.value ? Number(e.target.value) : null })}
                      onKeyDown={e => onKeyDown(e, i)}
                      placeholder="—"
                      className={cell}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.status} onChange={e => update(r.key, { status: e.target.value as DraftRow['status'] })} className={cell}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.notes} onChange={e => update(r.key, { notes: e.target.value })} onKeyDown={e => onKeyDown(e, i)} placeholder="Opcional" className={cell} />
                  </td>
                  <td className="px-1 py-1.5">
                    <button onClick={() => removeRow(r.key)} title="Quitar fila" className="p-1.5 text-gray-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <datalist id="request-models">
        {models.map(m => <option key={m.id} value={m.name} />)}
      </datalist>
      <div className="px-4 py-2.5 border-t border-gray-800">
        <button onClick={() => addAfter(rows.length - 1)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-kawa-green">
          <Plus size={13} /> Agregar fila
        </button>
      </div>
    </div>
  );
}
