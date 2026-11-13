import { Fragment, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, History, RefreshCw } from 'lucide-react';
import { apiError } from '../services/productMasterService';
import {
  ENTITY_LABELS, METHOD_LABELS, analyticsService,
  type AuditEntry, type AuditFilters,
} from '../services/analyticsService';

const control = 'bg-kawa-gray border border-gray-800 text-white text-sm rounded-xl px-3 py-2.5 focus:border-kawa-green outline-none';
const LIMIT = 300;

const when = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Historial: cada cambio hecho desde el admin (quién, qué y cuándo)
export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async (f: AuditFilters) => {
    try {
      setLoading(true);
      setRows(await analyticsService.audit({ ...f, limit: LIMIT }));
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cargar el historial'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filters); }, [filters, load]);

  const setFilter = (patch: AuditFilters) => setFilters((f) => ({ ...f, ...patch }));
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><History size={22} className="text-kawa-green" /> Historial de cambios</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Todo lo que se crea, edita o borra desde el admin: quién lo hizo, cuándo y qué datos mandó.
            Las contraseñas y claves nunca se guardan.
          </p>
        </div>
        <button onClick={() => load(filters)} disabled={loading} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-2 border border-gray-700 rounded-lg">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recargar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.entity ?? ''} onChange={(e) => setFilter({ entity: e.target.value || undefined, entity_id: undefined })} className={control}>
          <option value="">Todo</option>
          {Object.entries(ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select
          value={filters.failed === undefined ? '' : String(filters.failed)}
          onChange={(e) => setFilter({ failed: e.target.value === '' ? undefined : e.target.value === 'true' })}
          className={control}
        >
          <option value="">Bien y con error</option>
          <option value="false">Solo los que salieron bien</option>
          <option value="true">Solo los que fallaron</option>
        </select>
        <input type="date" value={filters.from ?? ''} onChange={(e) => setFilter({ from: e.target.value || undefined })} title="Desde" className={control} />
        <input type="date" value={filters.to ?? ''} onChange={(e) => setFilter({ to: e.target.value || undefined })} title="Hasta" className={control} />
        {filters.entity_id && (
          <span className="text-xs text-gray-300 bg-gray-800 rounded-lg px-2 py-1">Solo el registro {filters.entity_id.slice(0, 8)}…</span>
        )}
        {hasFilters && <button onClick={() => setFilters({})} className="text-xs text-gray-400 hover:text-white px-2">Quitar filtros</button>}
      </div>

      <div className="bg-kawa-gray border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-800 text-xs text-gray-500">
          {loading ? 'Cargando...' : `${rows.length}${rows.length >= LIMIT ? '+' : ''} cambios${hasFilters ? ' con estos filtros' : ''}`}
          {rows.length >= LIMIT && <span className="ml-2">(se muestran los {LIMIT} más recientes)</span>}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-gray-500">No hay cambios guardados todavía</td></tr>
            )}
            {rows.map((r) => {
              const method = METHOD_LABELS[r.method] ?? { label: r.method, tone: 'bg-gray-700 text-gray-300' };
              const failed = r.status_code >= 400;
              const isOpen = open === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className="border-t border-gray-800/60 hover:bg-white/[0.02] cursor-pointer" onClick={() => setOpen(isOpen ? null : r.id)}>
                    <td className="pl-4 py-2.5 w-6 text-gray-500">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                    <td className="px-2 py-2.5 text-gray-400 whitespace-nowrap">{when(r.created_at)}</td>
                    <td className="px-2 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${method.tone}`}>{method.label}</span></td>
                    <td className="px-2 py-2.5 text-gray-100">
                      {ENTITY_LABELS[r.entity ?? ''] ?? r.entity ?? '—'}
                      {r.entity_id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFilter({ entity: r.entity ?? undefined, entity_id: r.entity_id ?? undefined }); }}
                          className="ml-2 text-xs text-gray-500 hover:text-kawa-green font-mono"
                          title="Ver todos los cambios de este registro"
                        >
                          {r.entity_id.slice(0, 8)}
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-gray-400 truncate max-w-[220px]">{r.user_email ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {failed
                        ? <span className="text-xs text-red-300 bg-red-500/10 rounded px-2 py-0.5">Falló ({r.status_code})</span>
                        : <span className="text-xs text-gray-500">OK</span>}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-black/40">
                      <td colSpan={6} className="px-4 py-3 text-xs">
                        <p className="text-gray-400 mb-2 font-mono">{r.method} {r.path}{r.ip ? ` · IP ${r.ip}` : ''}</p>
                        {r.body
                          ? <pre className="text-gray-300 whitespace-pre-wrap break-all max-h-80 overflow-auto bg-black/50 rounded-lg p-3">{JSON.stringify(r.body, null, 2)}</pre>
                          : <p className="text-gray-500">Sin datos enviados</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
