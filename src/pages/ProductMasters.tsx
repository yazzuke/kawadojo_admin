import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Layers, Loader2, RefreshCw, Search, Trash2, X } from 'lucide-react';
import MasterEditor from '../components/MasterEditor';
import { categoryService } from '../services/categoryService';
import { apiError, productMasterService, type MasterProposal, type ProductMaster } from '../services/productMasterService';
import type { Category } from '../types/product';

type Tab = 'proposals' | 'masters';

const Badge = ({ tone, children }: { tone: 'yellow' | 'red' | 'gray' | 'blue'; children: React.ReactNode }) => {
  const cls = {
    yellow: 'bg-yellow-500/15 text-yellow-300',
    red: 'bg-red-500/15 text-red-300',
    gray: 'bg-gray-700/60 text-gray-300',
    blue: 'bg-blue-500/15 text-blue-300',
  }[tone];
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>{children}</span>;
};

// Fichas maestras: una ficha por pieza (nombre, descripción, fotos) y los productos de cada lote vinculados
export default function ProductMastersPage() {
  const [tab, setTab] = useState<Tab>('proposals');
  const [proposals, setProposals] = useState<MasterProposal[]>([]);
  const [masters, setMasters] = useState<ProductMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, m, c] = await Promise.all([productMasterService.proposals(), productMasterService.list(), categoryService.getAll()]);
      setProposals(p);
      setMasters(m);
      setCategories(c);
    } catch (err) {
      toast.error(apiError(err, 'No se pudieron cargar las fichas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const done = () => { setOpen(null); load(); };

  const q = search.trim().toLowerCase();
  const visibleProposals = useMemo(
    () => proposals.filter(p => !q || p.options.names.some(n => n.value.toLowerCase().includes(q)) || p.products.some(x => x.name.toLowerCase().includes(q))),
    [proposals, q],
  );
  const visibleMasters = useMemo(
    () => masters.filter(m => !q || m.name.toLowerCase().includes(q)),
    [masters, q],
  );
  const pendingProducts = proposals.reduce((s, p) => s + p.count, 0);

  const removeMaster = async (m: ProductMaster) => {
    if (!confirm(`¿Borrar la ficha "${m.name}"? Sus ${m.products.length} productos quedan igual, solo sin ficha.`)) return;
    try {
      await productMasterService.remove(m.id);
      toast.success('Ficha borrada');
      done();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo borrar'));
    }
  };

  const detach = async (productId: string, name: string) => {
    if (!confirm(`¿Sacar "${name}" de la ficha? El producto no se borra.`)) return;
    try {
      await productMasterService.detach(productId);
      toast.success('Producto sacado de la ficha');
      load();
    } catch (err) {
      toast.error(apiError(err, 'No se pudo sacar'));
    }
  };

  const tabBtn = (t: Tab, label: string, count: number) => (
    <button
      onClick={() => { setTab(t); setOpen(null); }}
      className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t ? 'bg-kawa-green text-black' : 'text-gray-300 hover:text-white'}`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Layers size={22} className="text-kawa-green" /> Fichas de producto</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Una ficha por pieza con el nombre bien escrito, la descripción y las fotos buenas. Los productos de cada lote
            siguen igual (costo, precio, lote, vendido), solo quedan vinculados a su ficha.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-2 border border-gray-700 rounded-lg">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recargar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-kawa-gray border border-gray-800 rounded-xl p-1">
          {tabBtn('proposals', 'Por unificar', proposals.length)}
          {tabBtn('masters', 'Fichas creadas', masters.length)}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pieza..."
            className="w-full bg-kawa-gray border border-gray-800 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:border-kawa-green outline-none"
          />
        </div>
      </div>

      {loading && !proposals.length && !masters.length ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-kawa-green" /></div>
      ) : tab === 'proposals' ? (
        <div className="space-y-2">
          {proposals.length > 0 && (
            <p className="text-xs text-gray-500">
              {pendingProducts} productos agrupados en {proposals.length} piezas. Ábrelas, elige lo bueno de cada una y crea la ficha.
            </p>
          )}
          {!visibleProposals.length && <p className="text-gray-500 text-sm py-8 text-center">No hay nada por unificar{q ? ' con esa búsqueda' : ''}.</p>}
          {visibleProposals.map(p => {
            const isOpen = open === p.key;
            return (
              <div key={p.key} className={`bg-kawa-gray border rounded-xl overflow-hidden ${isOpen ? 'border-kawa-green/50' : 'border-gray-800'}`}>
                <button onClick={() => setOpen(isOpen ? null : p.key)} className="w-full flex flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02]">
                  {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  <span className="text-white font-semibold mr-auto">{p.master ? p.master.name : p.options.names[0]?.value}</span>
                  <Badge tone="gray">{p.count} productos</Badge>
                  {p.master && <Badge tone="blue">Sumar a ficha existente</Badge>}
                  {p.issues.names > 1 && <Badge tone="yellow">{p.issues.names} nombres</Badge>}
                  {p.issues.descriptions > 1 && <Badge tone="yellow">{p.issues.descriptions} descripciones</Badge>}
                  {p.issues.without_tag > 0 && <Badge tone="yellow">{p.issues.without_tag} sin tag</Badge>}
                  {p.issues.without_photo > 0 && <Badge tone="red">{p.issues.without_photo} sin foto</Badge>}
                </button>
                {isOpen && (
                  <div className="border-t border-gray-800">
                    <MasterEditor
                      key={p.key}
                      products={p.products}
                      options={p.options}
                      categories={categories}
                      initial={p.master ? { master_id: p.master.id, name: p.master.name } : undefined}
                      submitLabel={p.master ? 'Sumar a la ficha' : 'Crear ficha'}
                      onDone={done}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {!visibleMasters.length && <p className="text-gray-500 text-sm py-8 text-center">Todavía no hay fichas{q ? ' con esa búsqueda' : ''}. Créalas desde "Por unificar".</p>}
          {visibleMasters.map(m => {
            const isOpen = open === m.id;
            const stock = m.products.filter(x => x.in_stock && !x.is_incoming).length;
            return (
              <div key={m.id} className={`bg-kawa-gray border rounded-xl overflow-hidden ${isOpen ? 'border-kawa-green/50' : 'border-gray-800'}`}>
                <button onClick={() => setOpen(isOpen ? null : m.id)} className="w-full flex flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02]">
                  {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  <span className="text-white font-semibold mr-auto">{m.name}</span>
                  {m.category && <Badge tone="gray">{m.category.name}</Badge>}
                  {m.oem_code && <Badge tone="gray">OEM {m.oem_code}</Badge>}
                  <Badge tone="blue">{m.products.length} productos · {stock} en stock</Badge>
                  {!m.photo_product_id && <Badge tone="red">sin foto</Badge>}
                  {!m.description && <Badge tone="yellow">sin descripción</Badge>}
                </button>
                {isOpen && (
                  <div className="border-t border-gray-800">
                    <MasterEditor
                      key={m.id}
                      products={m.products}
                      options={m.options}
                      categories={categories}
                      initial={{
                        master_id: m.id,
                        name: m.name,
                        group_tag: m.group_tag,
                        description: m.description,
                        full_description: m.full_description,
                        category_id: m.category?.id ?? null,
                        oem_code: m.oem_code,
                        photo_product_id: m.photo_product_id,
                      }}
                      submitLabel="Guardar ficha"
                      onDone={done}
                    />
                    <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
                      <span className="text-xs text-gray-500 mr-1">Sacar de la ficha:</span>
                      {m.products.map(x => (
                        <button
                          key={x.id}
                          onClick={() => detach(x.id, x.name)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-700 text-[11px] text-gray-300 hover:border-red-400 hover:text-red-300"
                        >
                          {x.suffix || x.batch_code || x.name} <X size={11} />
                        </button>
                      ))}
                      <button onClick={() => removeMaster(m)} className="ml-auto flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-500/30 rounded-lg">
                        <Trash2 size={13} /> Borrar ficha
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
