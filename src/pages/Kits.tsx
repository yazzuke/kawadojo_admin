import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Boxes, Loader2, Pencil, Plus, RefreshCw, Trash2, Truck, X } from 'lucide-react';
import { apiError, productMasterService, type ProductMaster } from '../services/productMasterService';
import { formatCop, kitService, type Kit, type KitPayload } from '../services/kitService';

const EMPTY: KitPayload = { name: '', description: '', discount_type: 'percent', discount_percent: 5, fixed_price: null, items: [] };
const inputCls = 'w-full bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:border-kawa-green outline-none';

// Precio que tendría el kit con lo que se está escribiendo (mismo cálculo que el servidor)
const previewPrice = (listPrice: number, form: KitPayload) =>
  form.discount_type === 'fixed' && form.fixed_price
    ? form.fixed_price
    : Math.round((listPrice * (1 - (form.discount_percent || 0) / 100)) / 1000) * 1000;

function KitEditor({ kit, masters, onClose, onSaved }: {
  kit: Kit | null;
  masters: ProductMaster[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<KitPayload>(() => kit
    ? {
        name: kit.name,
        description: kit.description ?? '',
        discount_type: kit.discount_type,
        discount_percent: kit.discount_percent,
        fixed_price: kit.fixed_price,
        items: kit.components.map(c => ({ master_id: c.master_id, quantity: c.quantity })),
      }
    : EMPTY);
  const [adding, setAdding] = useState('');
  const [saving, setSaving] = useState(false);

  const byId = useMemo(() => new Map(masters.map(m => [m.id, m])), [masters]);
  // Precio suelto de referencia de cada ficha: el más común de sus unidades en stock
  const unitPrice = (m: ProductMaster | undefined) => {
    if (!m) return 0;
    const inStock = m.products.filter(p => p.in_stock && !p.is_incoming);
    const list = (inStock.length ? inStock : m.products).map(p => p.price);
    const counts = new Map<number, number>();
    list.forEach(p => counts.set(p, (counts.get(p) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 0;
  };
  const listPrice = form.items.reduce((s, i) => s + unitPrice(byId.get(i.master_id)) * i.quantity, 0);
  const price = previewPrice(listPrice, form);

  const addMaster = (id: string) => {
    if (!id || form.items.some(i => i.master_id === id)) return;
    setForm(f => ({ ...f, items: [...f.items, { master_id: id, quantity: 1 }] }));
    setAdding('');
  };
  const setQty = (id: string, q: number) =>
    setForm(f => ({ ...f, items: f.items.map(i => (i.master_id === id ? { ...i, quantity: Math.max(1, Math.min(50, q || 1)) } : i)) }));
  const removeItem = (id: string) => setForm(f => ({ ...f, items: f.items.filter(i => i.master_id !== id) }));

  const save = async () => {
    if (!form.name.trim()) { toast.error('Ponle un nombre al kit'); return; }
    if (!form.items.length) { toast.error('Agrega al menos una ficha'); return; }
    if (form.discount_type === 'fixed' && !form.fixed_price) { toast.error('Pon el precio fijo del kit'); return; }
    try {
      setSaving(true);
      if (kit) await kitService.update(kit.id, form); else await kitService.create(form);
      toast.success(kit ? 'Kit guardado' : 'Kit creado');
      onSaved();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo guardar el kit'));
    } finally {
      setSaving(false);
    }
  };

  const available = masters.filter(m => !form.items.some(i => i.master_id === m.id));

  return (
    <div className="bg-kawa-gray border border-kawa-green/40 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">{kit ? 'Editar kit' : 'Nuevo kit'}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nombre</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="ej: Kit Discos de Clutch Z250 / Ninja 300 (2015-2018)" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descripción (opcional)</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputCls} placeholder="ej: Juego completo: 3 discos A + 2 discos B, así viene de Kawasaki." />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Precio del kit</label>
            <div className="flex bg-[#1a1a1a] border border-gray-800 rounded-lg p-1 w-fit mb-2">
              {(['percent', 'fixed'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, discount_type: t }))}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${form.discount_type === t ? 'bg-kawa-green text-black' : 'text-gray-300'}`}
                >
                  {t === 'percent' ? '% menos que sueltas' : 'Precio fijo'}
                </button>
              ))}
            </div>
            {form.discount_type === 'percent' ? (
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={90} value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} className={`${inputCls} w-24`} />
                <span className="text-sm text-gray-400">% de descuento sobre la suma de las piezas</span>
              </div>
            ) : (
              <input type="number" min={0} step={1000} value={form.fixed_price ?? ''} onChange={e => setForm(f => ({ ...f, fixed_price: e.target.value ? Number(e.target.value) : null }))} className={`${inputCls} w-48`} placeholder="ej: 330000" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs text-gray-400">Piezas del kit (fichas y cuántas lleva)</label>
          <div className="border border-gray-800 rounded-lg divide-y divide-gray-800">
            {!form.items.length && <p className="text-sm text-gray-500 p-3">Agrega las fichas que forman el kit.</p>}
            {form.items.map(i => {
              const m = byId.get(i.master_id);
              const stock = m?.products.filter(p => p.in_stock && !p.is_incoming).length ?? 0;
              return (
                <div key={i.master_id} className="flex items-center gap-2 px-3 py-2">
                  <input type="number" min={1} max={50} value={i.quantity} onChange={e => setQty(i.master_id, Number(e.target.value))} className="w-16 bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded px-2 py-1" />
                  <span className="text-gray-500 text-sm">×</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{m?.name ?? 'Ficha borrada'}</p>
                    <p className="text-[11px] text-gray-500">{formatCop(unitPrice(m))} c/u · {stock} en stock</p>
                  </div>
                  <button onClick={() => removeItem(i.master_id)} className="text-gray-500 hover:text-red-400"><X size={16} /></button>
                </div>
              );
            })}
          </div>
          <select value={adding} onChange={e => addMaster(e.target.value)} className={inputCls}>
            <option value="">+ Agregar ficha…</option>
            {available.map(m => <option key={m.id} value={m.id}>{m.name}{m.oem_code ? ` · ${m.oem_code}` : ''}</option>)}
          </select>
          {form.items.length > 0 && (
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-400"><span>Sueltas sumarían</span><span>{formatCop(listPrice)}</span></div>
              <div className="flex justify-between text-white font-semibold"><span>Precio del kit</span><span className="text-kawa-green">{formatCop(price)}</span></div>
              {listPrice > price && <p className="text-[11px] text-gray-500">El cliente se ahorra {formatCop(listPrice - price)}. Costo y ganancia exactos aparecen al guardar.</p>}
            </div>
          )}
          <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-kawa-green text-black font-bold px-4 py-2.5 rounded-lg hover:bg-kawa-green-light disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} {kit ? 'Guardar kit' : 'Crear kit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Kits: combos armados con fichas. Calcula cuántos salen del inventario, precio, costo y ganancia
export default function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [masters, setMasters] = useState<ProductMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Kit | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [k, m] = await Promise.all([kitService.list(), productMasterService.list()]);
      setKits(k);
      setMasters(m);
    } catch (err) {
      toast.error(apiError(err, 'No se pudieron cargar los kits'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (k: Kit) => {
    if (!confirm(`¿Borrar el kit "${k.name}"? Las piezas y sus fichas no se tocan.`)) return;
    try {
      await kitService.remove(k.id);
      toast.success('Kit borrado');
      load();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo borrar'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Boxes size={22} className="text-kawa-green" /> Kits</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Combos armados con fichas (ej. 3 discos A + 2 discos B). Cada pieza se sigue vendiendo suelta; aquí ves cuántos kits salen
            de tu inventario, a qué precio y cuánto ganas. Para venderlo, usa "Agregar kit" en Nueva orden.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing('new')} className="flex items-center gap-2 text-sm font-semibold bg-kawa-green text-black px-3 py-2 rounded-lg hover:bg-kawa-green-light">
            <Plus size={15} /> Nuevo kit
          </button>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-2 border border-gray-700 rounded-lg">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recargar
          </button>
        </div>
      </div>

      {editing && (
        <KitEditor
          key={editing === 'new' ? 'new' : editing.id}
          kit={editing === 'new' ? null : editing}
          masters={masters}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading && !kits.length ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-kawa-green" /></div>
      ) : !kits.length ? (
        <p className="text-gray-500 text-sm py-10 text-center">Todavía no hay kits. Crea el primero con "Nuevo kit".</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kits.map(k => {
            const lowMargin = k.margin_percent < 15;
            return (
              <div key={k.id} className="bg-kawa-gray border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold">{k.name}</h3>
                    <p className="text-[11px] text-gray-500">{k.units_per_kit} piezas{k.models.length ? ` · ${k.models.map(m => m.name).join(', ')}` : ''}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditing(k)} className="p-1.5 text-gray-400 hover:text-white"><Pencil size={15} /></button>
                    <button onClick={() => remove(k)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>

                <div className={`rounded-lg p-3 text-center ${k.kits_possible ? 'bg-kawa-green/10 border border-kawa-green/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <p className={`text-3xl font-bold ${k.kits_possible ? 'text-kawa-green' : 'text-red-300'}`}>{k.kits_possible}</p>
                  <p className="text-xs text-gray-300">{k.kits_possible === 1 ? 'kit listo para vender' : 'kits listos para vender'}</p>
                  {k.kits_with_incoming > k.kits_possible && (
                    <p className="text-[11px] text-orange-300 mt-1 inline-flex items-center gap-1"><Truck size={12} /> {k.kits_with_incoming} con lo que viene en camino</p>
                  )}
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between text-gray-400"><span>Sueltas</span><span className="line-through">{formatCop(k.list_price)}</span></div>
                  <div className="flex justify-between text-white font-semibold">
                    <span>Kit {k.discount_type === 'fixed' ? '(precio fijo)' : `(-${k.discount_percent}%)`}</span><span className="text-kawa-green">{formatCop(k.price)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400"><span>Costo puesto aquí</span><span>{formatCop(k.cost)}</span></div>
                  <div className={`flex justify-between font-semibold ${lowMargin ? 'text-orange-300' : 'text-gray-200'}`}>
                    <span>Ganancia</span><span>{formatCop(k.profit)} · {k.margin_percent}%</span>
                  </div>
                  {lowMargin && <p className="text-[11px] text-orange-300 inline-flex items-center gap-1"><AlertTriangle size={11} /> Margen bajo: revisa el descuento</p>}
                </div>

                <ul className="text-xs divide-y divide-gray-800 border-t border-gray-800">
                  {k.components.map(c => (
                    <li key={c.master_id} className="flex justify-between gap-2 py-1.5">
                      <span className="text-gray-300 truncate">{c.quantity} × {c.name}</span>
                      <span className={c.available >= c.quantity ? 'text-gray-500' : 'text-red-300'}>{c.available} disp.{c.incoming ? ` +${c.incoming}` : ''}</span>
                    </li>
                  ))}
                </ul>

                {k.missing_for_next.length > 0 && (
                  <p className="text-[11px] text-gray-400">
                    Para {k.kits_possible ? 'el siguiente' : 'armar uno'} falta: {k.missing_for_next.map(m => `${m.missing} × ${m.name}`).join(', ')}
                  </p>
                )}
                {k.leftovers.length > 0 && (
                  <p className="text-[11px] text-gray-500">
                    Quedan sueltas: {k.leftovers.map(l => `${l.units} × ${l.name}`).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
