import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowRight, Check, ImageOff, ImagePlus, Loader2 } from 'lucide-react';
import type { Category } from '../types/product';
import AiDescriptionBox from './AiDescriptionBox';
import {
  apiError, composeName, productMasterService, tagFromName,
  type MasterOptions, type MasterProductRow,
} from '../services/productMasterService';

interface Initial {
  master_id?: string | null;
  name?: string;
  group_tag?: string | null;
  description?: string | null;
  full_description?: string | null;
  category_id?: string | null;
  oem_code?: string | null;
  photo_product_id?: string | null;
}

interface Props {
  products: MasterProductRow[];
  options: MasterOptions;
  categories: Category[];
  initial?: Initial;
  submitLabel?: string;
  onDone: () => void;
}

const formatCop = (n: number) => `$${n.toLocaleString('es-CO')}`;

function Thumb({ src, size = 'w-10 h-10' }: { src: string | null; size?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <div className={`${size} rounded bg-gray-800 flex items-center justify-center shrink-0`}><ImageOff size={14} className="text-gray-600" /></div>;
  }
  return <img src={src} alt="" onError={() => setBroken(true)} className={`${size} rounded object-cover shrink-0 bg-gray-800`} />;
}

// Opción elegible con contador ("lo usan 22")
function Choice({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
        active ? 'border-kawa-green bg-kawa-green/10 text-white' : 'border-gray-800 bg-[#1a1a1a] text-gray-300 hover:border-gray-600'
      }`}
    >
      <span className={`mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${active ? 'border-kawa-green bg-kawa-green' : 'border-gray-600'}`}>
        {active && <Check size={11} className="text-black" />}
      </span>
      <span className="flex-1 min-w-0 break-words">{children}</span>
      {count !== undefined && <span className="text-[11px] text-gray-500 shrink-0">{count === 1 ? '1 producto' : `${count} productos`}</span>}
    </button>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-200 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#62BE1B]" />
      <span>{label}{hint && <span className="block text-[11px] text-gray-500">{hint}</span>}</span>
    </label>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
    {children}
  </div>
);

// Arma la ficha maestra de un grupo: eliges el nombre, la descripción y las fotos buenas, y qué se aplica a los productos
const MAX_PHOTO_MB = 5;

export default function MasterEditor({ products: rawProducts, options, categories, initial, submitLabel, onDone }: Props) {
  // Fotos subidas aquí: se ven sin recargar la página
  const [photoOverrides, setPhotoOverrides] = useState<Record<string, { image_count: number; image: string | null }>>({});
  const products = useMemo(() => rawProducts.map(p => ({ ...p, ...photoOverrides[p.id] })), [rawProducts, photoOverrides]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial?.name ?? options.names[0]?.value ?? '');
  const [description, setDescription] = useState(initial?.description ?? options.descriptions[0]?.value ?? '');
  const [fullDescription, setFullDescription] = useState(initial?.full_description ?? options.full_descriptions[0]?.value ?? '');
  const [fullOpen, setFullOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? options.category_id ?? '');
  const [oem, setOem] = useState(initial?.oem_code ?? options.oem_codes[0]?.value ?? '');
  const [tag, setTag] = useState(initial?.group_tag ?? options.group_tags[0]?.value ?? '');
  const [photoId, setPhotoId] = useState(initial?.photo_product_id ?? options.photo_product_id ?? '');
  const [modelIds, setModelIds] = useState<Set<string>>(() => new Set(options.models.map(m => m.id)));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(products.filter(p => !p.outlier).map(p => p.id)));
  const [apply, setApply] = useState({
    name: true,
    description: true,
    category: true,
    oem: true,
    group_tag: true,
    models: options.models.length > 0,
    copy_photos: true,
    replace_new_photos: false,
  });
  const [saving, setSaving] = useState(false);

  const effectiveTag = tag.trim() || tagFromName(name);
  const chosen = products.filter(p => selected.has(p.id));
  const withoutPhoto = chosen.filter(p => !p.image_count && p.id !== photoId).length;
  const renames = useMemo(
    () => chosen.filter(p => composeName(name, p) !== p.name.trim().replace(/\s+/g, ' ')).length,
    [chosen, name],
  );
  const replaceable = chosen.filter(p => p.condition === 'nuevo' && p.image_count > 0 && p.id !== photoId).length;
  // A qué producto se suben las fotos: el que da las fotos a la ficha, o uno nuevo en stock del grupo
  const uploadTarget = products.find(p => p.id === photoId)
    ?? chosen.find(p => p.condition === 'nuevo' && p.in_stock && !p.is_incoming)
    ?? chosen[0] ?? products[0];
  const photoProducts = products.filter(p => p.image_count > 0).sort((a, b) => b.image_count - a.image_count).slice(0, 12);

  const toggleProduct = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleModel = (id: string) => setModelIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const uploadPhotos = async (list: FileList | null) => {
    const files = Array.from(list || []);
    if (fileInput.current) fileInput.current.value = '';
    if (!files.length || !uploadTarget) return;
    const big = files.filter(f => f.size > MAX_PHOTO_MB * 1024 * 1024);
    if (big.length) { toast.error(`Cada foto puede pesar máximo ${MAX_PHOTO_MB} MB (${big.map(f => f.name).join(', ')})`); return; }
    if (files.length > 10) { toast.error('Máximo 10 fotos por vez'); return; }
    try {
      setUploading(true);
      const res = await productMasterService.addPhotos(uploadTarget.id, files, true);
      setPhotoOverrides(prev => ({ ...prev, [res.product_id]: { image_count: res.image_count, image: res.image } }));
      setPhotoId(res.product_id);
      toast.success(`${files.length === 1 ? 'Foto subida' : `${files.length} fotos subidas`} a "${uploadTarget.name}"`);
    } catch (err) {
      toast.error(apiError(err, 'No se pudieron subir las fotos'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) { toast.error('Ponle un nombre a la ficha'); return; }
    if (!chosen.length) { toast.error('Marca al menos un producto'); return; }
    const parts = [
      apply.name && renames ? `renombrar ${renames}` : null,
      apply.description ? 'poner la misma descripción' : null,
      apply.models ? 'poner las mismas motos' : null,
      apply.copy_photos && photoId && withoutPhoto ? `copiar fotos a ${withoutPhoto}` : null,
      apply.copy_photos && apply.replace_new_photos && photoId && replaceable ? `cambiar las fotos de ${replaceable} nuevos` : null,
    ].filter(Boolean);
    if (!confirm(`Se va a vincular ${chosen.length} productos a la ficha "${name.trim()}"${parts.length ? ` y ${parts.join(', ')}` : ''}. ¿Continuar?`)) return;
    try {
      setSaving(true);
      const res = await productMasterService.unify({
        master_id: initial?.master_id ?? null,
        name: name.trim(),
        group_tag: effectiveTag,
        description: description.trim() || null,
        full_description: fullDescription.trim() || null,
        category_id: categoryId || null,
        oem_code: oem.trim() || null,
        photo_product_id: photoId || null,
        model_ids: [...modelIds],
        product_ids: chosen.map(p => p.id),
        apply: { ...apply, copy_photos: apply.copy_photos && !!photoId, replace_new_photos: apply.copy_photos && apply.replace_new_photos && !!photoId },
      });
      toast.success(`Ficha lista · ${res.linked} productos${res.renamed ? ` · ${res.renamed} renombrados` : ''}${res.photos_copied ? ` · fotos en ${res.photos_copied}` : ''}`);
      onDone();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo guardar la ficha'));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:border-kawa-green outline-none';

  return (
    <div className="grid lg:grid-cols-2 gap-6 p-4">
      {/* Columna 1: la ficha */}
      <div className="space-y-5">
        <Section title="Nombre de la ficha">
          {options.names.length > 1 && (
            <div className="space-y-1.5">
              {options.names.slice(0, 6).map(n => (
                <Choice key={n.value} active={name === n.value} onClick={() => setName(n.value)} count={n.count}>{n.value}</Choice>
              ))}
            </div>
          )}
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Nombre bien escrito de la pieza" />
          <p className="text-[11px] text-gray-500">Cada producto queda con este nombre más su lote. A los usados no se les pone "NUEVO SELLADO".</p>
        </Section>

        <Section title="Descripción">
          {options.descriptions.length > 1 && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {options.descriptions.slice(0, 6).map(d => (
                <Choice key={d.value} active={description === d.value} onClick={() => setDescription(d.value)} count={d.count}>
                  <span className="line-clamp-3">{d.value}</span>
                </Choice>
              ))}
            </div>
          )}
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Descripción corta" />
          <AiDescriptionBox
            name={name}
            oemCode={oem}
            categoryId={categoryId}
            modelIds={[...modelIds]}
            conditions={{
              nuevo: products.filter(p => p.condition === 'nuevo').length,
              usado: products.filter(p => p.condition && p.condition !== 'nuevo').length,
            }}
            currentDescriptions={[description, ...options.descriptions.map(d => d.value)]}
            onUse={(d, full) => {
              setDescription(d);
              if (full) { setFullDescription(full); setFullOpen(true); }
              setApply(a => ({ ...a, description: true }));
            }}
          />
          {(options.full_descriptions.length > 0 || fullDescription) && (
            <details className="text-sm" open={fullOpen} onToggle={e => setFullOpen((e.target as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer text-gray-400 text-xs">
                Descripción larga{options.full_descriptions.length ? ` (${options.full_descriptions.length} versiones)` : ''}
              </summary>
              <div className="space-y-1.5 mt-2">
                {options.full_descriptions.slice(0, 4).map(d => (
                  <Choice key={d.value} active={fullDescription === d.value} onClick={() => setFullDescription(d.value)} count={d.count}>
                    <span className="line-clamp-2">{d.value}</span>
                  </Choice>
                ))}
                <textarea value={fullDescription} onChange={e => setFullDescription(e.target.value)} rows={8} className={inputCls} />
              </div>
            </details>
          )}
        </Section>

        <div className="grid sm:grid-cols-2 gap-4">
          <Section title="Categoría">
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Section>
          <Section title="Código OEM">
            <input value={oem} onChange={e => setOem(e.target.value)} className={`${inputCls} font-mono`} placeholder="Ej. 12048-0084" />
            {options.oem_codes.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {options.oem_codes.map(o => (
                  <button key={o.value} type="button" onClick={() => setOem(o.value)} className="px-2 py-0.5 rounded-full border border-gray-700 text-[11px] font-mono text-gray-300 hover:border-kawa-green">{o.value} · {o.count}</button>
                ))}
              </div>
            )}
          </Section>
        </div>

        <Section title="Tag de la tienda">
          <input value={tag} onChange={e => setTag(e.target.value)} className={`${inputCls} font-mono`} placeholder={tagFromName(name)} />
          <p className="text-[11px] text-gray-500">
            kawadojo.com junta en una sola tarjeta los productos con el mismo tag.
            {options.group_tags.length > 1 && ` Este grupo tiene ${options.group_tags.length} tags distintos: ${options.group_tags.map(t => t.value).join(', ')}.`}
          </p>
        </Section>

        {options.models.length > 0 && (
          <Section title="Motos">
            <div className="flex flex-wrap gap-1.5">
              {options.models.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModel(m.id)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${modelIds.has(m.id) ? 'bg-kawa-green text-black border-kawa-green' : 'border-gray-700 text-gray-400'}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">Salen de lo que ya tienen los productos del grupo. Toca para quitar alguna.</p>
          </Section>
        )}

        <Section title="Fotos de la ficha">
          {photoProducts.length ? (
            <div className="flex flex-wrap gap-2">
              {photoProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPhotoId(p.id)}
                  title={`${p.name} · ${p.image_count} fotos`}
                  className={`relative rounded-lg border-2 ${photoId === p.id ? 'border-kawa-green' : 'border-transparent hover:border-gray-600'}`}
                >
                  <Thumb src={p.image} size="w-16 h-16" />
                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[10px] text-white px-1 rounded">{p.image_count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Ningún producto del grupo tiene fotos todavía.</p>
          )}
          {uploadTarget && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs text-gray-200 hover:text-kawa-green px-3 py-1.5 border border-gray-700 hover:border-kawa-green rounded-lg disabled:opacity-50"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                {uploading ? 'Subiendo...' : 'Agregar fotos'}
              </button>
              <span className="text-[11px] text-gray-500">
                Se suben a "{uploadTarget.name}" y quedan de primeras. Luego se copian a los demás con la opción de abajo.
              </span>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={e => uploadPhotos(e.target.files)}
              />
            </div>
          )}
        </Section>
      </div>

      {/* Columna 2: productos y qué se aplica */}
      <div className="space-y-5">
        <Section title={`Productos (${chosen.length} de ${products.length})`}>
          <div className="border border-gray-800 rounded-lg divide-y divide-gray-800 max-h-[460px] overflow-y-auto">
            {products.map(p => {
              const on = selected.has(p.id);
              const next = composeName(name, p);
              const changes = apply.name && next !== p.name.trim().replace(/\s+/g, ' ');
              return (
                <label key={p.id} className={`flex items-start gap-2.5 px-3 py-2 cursor-pointer ${on ? '' : 'opacity-50'}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleProduct(p.id)} className="mt-1 w-4 h-4 accent-[#62BE1B]" />
                  <Thumb src={p.image} />
                  <div className="flex-1 min-w-0 text-sm">
                    <p className={changes ? 'text-gray-500 line-through text-xs' : 'text-white'}>{p.name}</p>
                    {changes && on && <p className="text-kawa-green flex items-center gap-1"><ArrowRight size={12} className="shrink-0" />{next}</p>}
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {p.batch_code || 'Sin lote'} · {p.condition || '—'} · {formatCop(p.price)} ·{' '}
                      {p.is_incoming ? 'En camino' : p.in_stock ? 'En stock' : 'Vendido/agotado'}
                      {!p.image_count && ' · sin foto'}
                      {!p.group_tag && ' · sin tag'}
                    </p>
                    {p.outlier && (
                      <p className="text-[11px] text-yellow-400 flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={11} /> El nombre no se parece al resto: revisa si es la misma pieza
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </Section>

        <Section title="Qué aplicar a los productos marcados">
          <div className="space-y-2.5 bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
            <Toggle checked={apply.name} onChange={v => setApply(a => ({ ...a, name: v }))} label={`Renombrar (${renames} cambian)`} hint="Se conserva el lote y marcas como dañado, DMG o DUPL. El slug (link) no cambia." />
            <Toggle checked={apply.description} onChange={v => setApply(a => ({ ...a, description: v }))} label="Poner la misma descripción" />
            <Toggle checked={apply.category} onChange={v => setApply(a => ({ ...a, category: v }))} label="Poner la misma categoría" />
            <Toggle checked={apply.oem} onChange={v => setApply(a => ({ ...a, oem: v }))} label="Poner el mismo código OEM" hint={oem ? undefined : 'No hay código: no se cambia nada'} />
            <Toggle checked={apply.group_tag} onChange={v => setApply(a => ({ ...a, group_tag: v }))} label={`Poner el tag "${effectiveTag}"`} hint="Así salen juntos en una sola tarjeta en la tienda" />
            {options.models.length > 0 && (
              <Toggle checked={apply.models} onChange={v => setApply(a => ({ ...a, models: v }))} label={`Poner las mismas motos (${modelIds.size})`} hint="Reemplaza las motos de cada producto por las marcadas" />
            )}
            <Toggle
              checked={apply.copy_photos}
              onChange={v => setApply(a => ({ ...a, copy_photos: v }))}
              label={`Copiar las fotos a los que no tienen (${photoId ? withoutPhoto : 0})`}
              hint="Los que ya tienen fotos las conservan (sirve para los usados con foto propia)"
            />
            {apply.copy_photos && (
              <div className="pl-6">
                <Toggle
                  checked={apply.replace_new_photos}
                  onChange={v => setApply(a => ({ ...a, replace_new_photos: v }))}
                  label={`Cambiar también las fotos de los nuevos (${photoId ? replaceable : 0})`}
                  hint="Los nuevos que ya tienen foto quedan con las de la ficha. Los usados no se tocan."
                />
              </div>
            )}
          </div>
        </Section>

        <button
          onClick={submit}
          disabled={saving || !chosen.length}
          className="w-full flex items-center justify-center gap-2 bg-kawa-green text-black font-bold px-4 py-2.5 rounded-lg hover:bg-kawa-green-light disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {submitLabel || 'Crear ficha'} con {chosen.length} productos
        </button>
      </div>
    </div>
  );
}
