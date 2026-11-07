import { Fragment, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Inbox, Loader2, RefreshCw, Search } from 'lucide-react';
import RequestEntryGrid from '../components/RequestEntryGrid';
import RequestEditor from '../components/RequestEditor';
import { categoryService } from '../services/categoryService';
import { modelService } from '../services/modelService';
import { apiError } from '../services/productMasterService';
import {
  CHANNELS, STATUSES, channelLabel, customerRequestService, formatCop, formatDate, statusInfo,
  type CustomerRequest, type LinkOption, type RequestFilters, type Status,
} from '../services/customerRequestService';
import type { Category, CompatibleModel } from '../types/product';

const control = 'bg-kawa-gray border border-gray-800 text-white text-sm rounded-xl px-3 py-2.5 focus:border-kawa-green outline-none';

// Pedidos de clientes: todo lo que me han pedido o preguntado, para saber qué traer
export default function CustomerRequestsPage() {
  const [rows, setRows] = useState<CustomerRequest[]>([]);
  const [models, setModels] = useState<CompatibleModel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<{ impex_parts: LinkOption[]; masters: LinkOption[] } | null>(null);
  const [filters, setFilters] = useState<RequestFilters>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async (f: RequestFilters) => {
    try {
      setLoading(true);
      setRows(await customerRequestService.list(f));
    } catch (err) {
      toast.error(apiError(err, 'No se pudieron cargar las solicitudes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([modelService.getAll(), categoryService.getAll()])
      .then(([m, c]) => { setModels(m); setCategories(c); })
      .catch(err => toast.error(apiError(err, 'No se pudieron cargar los modelos')));
  }, []);

  // La búsqueda espera a que dejes de escribir
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => (f.q === (search.trim() || undefined) ? f : { ...f, q: search.trim() || undefined })), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { load(filters); }, [filters, load]);

  const openEditor = (id: string) => {
    setOpen(open === id ? null : id);
    if (!links) {
      customerRequestService.linkOptions()
        .then(setLinks)
        .catch(err => toast.error(apiError(err, 'No se pudieron cargar las piezas para vincular')));
    }
  };

  const changeStatus = async (ids: string[], status: Status) => {
    try {
      const { updated } = await customerRequestService.setStatus(ids, status);
      setRows(prev => prev.map(r => (ids.includes(r.id) ? { ...r, status } : r)));
      if (ids.length > 1) toast.success(`${updated} solicitudes ahora están en "${statusInfo(status).label}"`);
      setSelected(new Set());
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cambiar el estado'));
    }
  };

  const setFilter = (patch: RequestFilters) => setFilters(f => ({ ...f, ...patch }));
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const hasFilters = Object.values(filters).some(Boolean);
  const reached = rows.length >= 300;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Inbox size={22} className="text-kawa-green" /> Pedidos de clientes</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Todo lo que te han pedido o preguntado, por cualquier canal. Anota aunque no hayas respondido:
            lo importante es saber qué piden más para decidir qué traer.
          </p>
        </div>
        <button onClick={() => load(filters)} disabled={loading} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-2 border border-gray-700 rounded-lg">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recargar
        </button>
      </div>

      <RequestEntryGrid models={models} onSaved={() => load(filters)} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pieza, cliente, teléfono, código..." className={`${control} w-full pl-9`} />
        </div>
        <select value={filters.status ?? ''} onChange={e => setFilter({ status: e.target.value || undefined })} className={control}>
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filters.channel ?? ''} onChange={e => setFilter({ channel: e.target.value || undefined })} className={control}>
          <option value="">Todos los canales</option>
          {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filters.moto_model_id ?? ''} onChange={e => setFilter({ moto_model_id: e.target.value || undefined })} className={control}>
          <option value="">Todas las motos</option>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="date" value={filters.from ?? ''} onChange={e => setFilter({ from: e.target.value || undefined })} title="Desde" className={control} />
        <input type="date" value={filters.to ?? ''} onChange={e => setFilter({ to: e.target.value || undefined })} title="Hasta" className={control} />
        {hasFilters && (
          <button onClick={() => { setFilters({}); setSearch(''); }} className="text-xs text-gray-400 hover:text-white px-2">Quitar filtros</button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-kawa-gray border border-kawa-green/40 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-white mr-2">{selected.size} seleccionadas → pasar a:</span>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => changeStatus([...selected], s.value)} className={`px-2.5 py-1 rounded text-xs font-semibold ${s.tone} hover:opacity-80`}>
              {s.label}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-400 hover:text-white">Cancelar</button>
        </div>
      )}

      <div className="bg-kawa-gray border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center px-4 py-2.5 border-b border-gray-800 text-xs text-gray-500">
          {loading ? 'Cargando...' : `${rows.length}${reached ? '+' : ''} solicitudes${hasFilters ? ' con estos filtros' : ''}`}
          {reached && <span className="ml-2">(se muestran las 300 más recientes; usa los filtros para ver otras)</span>}
        </div>
        {loading && !rows.length ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-kawa-green" /></div>
        ) : !rows.length ? (
          <p className="text-gray-500 text-sm py-10 text-center">{hasFilters ? 'Nada con estos filtros.' : 'Todavía no has anotado nada. Empieza arriba.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-800">
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))} className="accent-kawa-green" />
                  </th>
                  <th className="px-2 py-2 w-6" />
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Pieza</th>
                  <th className="px-2 py-2">Moto</th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Canal</th>
                  <th className="px-2 py-2 text-right">Cotizado</th>
                  <th className="px-2 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const isOpen = open === r.id;
                  const st = statusInfo(r.status);
                  return (
                    <Fragment key={r.id}>
                      <tr className={`border-b border-gray-800/60 hover:bg-white/[0.02] ${isOpen ? 'bg-white/[0.03]' : ''}`}>
                        <td className="px-3 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="accent-kawa-green" /></td>
                        <td className="px-2 py-2">
                          <button onClick={() => openEditor(r.id)} className="text-gray-400 hover:text-white" title="Editar">
                            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td className="px-2 py-2 text-gray-400 whitespace-nowrap">{formatDate(r.requested_at)}</td>
                        <td className="px-2 py-2">
                          <button onClick={() => openEditor(r.id)} className="text-white text-left hover:text-kawa-green">
                            {r.part_text}{r.quantity > 1 && <span className="text-gray-500"> ×{r.quantity}</span>}
                          </button>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {r.oem_code && <span className="text-[10px] font-mono text-gray-500">{r.oem_code}</span>}
                            {r.category && <span className="text-[10px] text-gray-500">· {r.category.name}</span>}
                            {r.impex_part && <span className="text-[10px] text-blue-300">· Impex</span>}
                            {r.master && <span className="text-[10px] text-kawa-green">· Ficha</span>}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-gray-300">
                          {r.moto_model?.name ?? r.moto_text ?? '—'}
                          {!r.moto_model && r.moto_text && <span className="block text-[10px] text-gray-600">sin vincular</span>}
                        </td>
                        <td className="px-2 py-2 text-gray-300">
                          {r.customer_name || '—'}
                          {r.customer_phone && <span className="block text-[10px] text-gray-500">{r.customer_phone}</span>}
                        </td>
                        <td className="px-2 py-2 text-gray-400">{channelLabel(r.channel)}</td>
                        <td className="px-2 py-2 text-right text-gray-300 font-mono">{r.quoted_price ? formatCop(r.quoted_price) : '—'}</td>
                        <td className="px-2 py-2">
                          <select
                            value={r.status}
                            onChange={e => changeStatus([r.id], e.target.value as Status)}
                            className={`rounded px-2 py-1 text-xs font-semibold border-0 outline-none cursor-pointer ${st.tone}`}
                          >
                            {STATUSES.map(s => <option key={s.value} value={s.value} className="bg-kawa-gray text-white">{s.label}</option>)}
                          </select>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-gray-800">
                          <td colSpan={9} className="p-0">
                            <RequestEditor
                              request={r}
                              models={models}
                              categories={categories}
                              links={links}
                              onDone={() => { setOpen(null); load(filters); }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
