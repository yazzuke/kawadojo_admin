import React, { useState, useEffect } from 'react';
import type { ImpexResponse, SavedImpexPart } from '../types/impex';
import { impexService } from '../services/Impex';
import NavBarImpex from '../components/NavBarImpex';

const PartRow = ({ part, exchangeRate }: { part: any; exchangeRate: number | string }) => {
  const [sellPriceStr, setSellPriceStr] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const copCost = (part.price_yen || 0) * (Number(exchangeRate) || 0);
  const sellPrice = Number(sellPriceStr) || 0;
  const profit = sellPrice > 0 ? sellPrice - copCost : 0;
  const margin = copCost > 0 && sellPrice > 0 ? (profit / copCost) * 100 : 0;

  const applyMarkup = (percentage: number) => {
    const newPrice = Math.round(copCost * (1 + percentage / 100));
    setSellPriceStr(newPrice.toString());
  };

  const handleSave = async () => {
    const sp = Number(sellPriceStr) || 0;
    if (sp <= 0) {
      alert('Por favor establece un P. Venta válido mayor a 0');
      return;
    }
    
    setIsSaving(true);
    try {
      await impexService.savePart({
        mark: part.mark || '',
        part_no: part.part,
        part_no_raw: part.part_no_raw,
        name_ja: part.name || '',
        name_es: part.name_es || '',
        name_en: part.name_en || '',
        price_yen: part.price_yen || 0,
        price_rub: part.price_rub || 0,
        weight: part.weight || 0,
        type_id: part.type_id || 0,
        kawadojo_price: sp,
        compatible_moto_models: []
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      alert(err.response?.data?.message || 'Error al guardar el repuesto en BD');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr className="hover:bg-[#2a2a2a] transition-colors border-t border-gray-800">
      <td className="p-4 whitespace-nowrap text-sm font-medium text-white">{part.part}</td>
      <td className="p-4 text-sm text-gray-400 max-w-xs truncate" title={part.name_es || part.name_en || part.name}>
        {part.name_es || part.name_en || part.name}
      </td>
      <td className="p-4 whitespace-nowrap text-sm text-gray-400">{part.mark}</td>
        <td className="p-4 whitespace-nowrap text-sm text-gray-400 font-mono">¥ {part.price_yen?.toLocaleString() ?? 0}</td>
        <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-300">
          $ {copCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
        </td>
        <td className="p-4 whitespace-nowrap min-w-[200px]">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-bold">$</span>
              <input
                type="number"
                placeholder="0"
                value={sellPriceStr}
                onChange={(e) => setSellPriceStr(e.target.value)}
                className="w-full bg-[#111111] text-white font-bold border border-[#333333] rounded-lg py-2 pl-8 pr-2 focus:outline-none focus:border-kawa-green focus:ring-1 focus:ring-kawa-green focus:bg-[#1a1a1a] transition-all shadow-inner"
              />
            </div>
            <div className="flex gap-1">
               <button type="button" onClick={() => applyMarkup(20)} className="flex-1 bg-gradient-to-t from-[#1f1f1f] to-[#2a2a2a] hover:from-kawa-green/20 hover:to-kawa-green/10 hover:text-kawa-green hover:border-kawa-green/50 border border-[#333] text-gray-400 px-1 py-1 rounded-md text-[11px] font-bold shadow-sm transition-all">+20%</button>
               <button type="button" onClick={() => applyMarkup(40)} className="flex-1 bg-gradient-to-t from-[#1f1f1f] to-[#2a2a2a] hover:from-kawa-green/20 hover:to-kawa-green/10 hover:text-kawa-green hover:border-kawa-green/50 border border-[#333] text-gray-400 px-1 py-1 rounded-md text-[11px] font-bold shadow-sm transition-all">+40%</button>
               <button type="button" onClick={() => applyMarkup(60)} className="flex-1 bg-gradient-to-t from-[#1f1f1f] to-[#2a2a2a] hover:from-kawa-green/20 hover:to-kawa-green/10 hover:text-kawa-green hover:border-kawa-green/50 border border-[#333] text-gray-400 px-1 py-1 rounded-md text-[11px] font-bold shadow-sm transition-all">+60%</button>
            </div>
          </div>
        </td>
        <td className="p-4 whitespace-nowrap text-sm">
          {sellPrice > 0 ? (
            <div className="flex flex-col">
              <span className={profit > 0 ? 'text-kawa-green font-bold text-base' : 'text-red-500 font-bold text-base'}>
                $ {profit.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${profit > 0 ? 'bg-kawa-green/10 text-kawa-green' : 'bg-red-500/10 text-red-500'}`}>
                  {profit > 0 ? '↑' : '↓'} {Math.abs(margin).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 font-medium">Margen</span>
              </div>
            </div>
          ) : (
            <span className="text-gray-600 font-medium px-2">—</span>
          )}
        </td>
        <td className="p-4 whitespace-nowrap">
          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-lg border ${part.is_discontinued ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'bg-kawa-green/10 text-kawa-green border-kawa-green/30 shadow-[0_0_10px_rgba(140,198,63,0.1)]'}`}>
            {part.is_discontinued ? 'Descontinuado' : 'Disponible'}
          </span>
        </td>
        <td className="p-4 whitespace-nowrap text-center">
          <button 
            onClick={handleSave}
            disabled={isSaving || saved}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all duration-200 ${saved ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-kawa-green text-black hover:bg-opacity-90 shadow-md disabled:opacity-50'}`}
          >
            {isSaving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar en BD'}
          </button>
        </td>
    </tr>
  );
};

const SavedPartsTab = () => {
  const [savedParts, setSavedParts] = useState<SavedImpexPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedParts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await impexService.getSavedParts();
      if (res.success) {
        setSavedParts(res.data);
      } else {
        setError('Respuesta no exitosa de la API');
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener los repuestos guardados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedParts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/40 border border-red-800 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-kawa-gray rounded-xl border border-gray-800 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-800 bg-[#2a2a2a] flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Piezas en Base de Datos</h2>
        <div className="flex items-center gap-4">
          <span className="bg-[#1e1e1e] text-gray-400 text-xs px-2 py-1 rounded border border-gray-700">
            {savedParts.length} guardados
          </span>
          <button 
            onClick={fetchSavedParts}
            className="text-gray-400 hover:text-white transition-colors"
            title="Recargar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      {savedParts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a1a1a] border-b border-gray-800">
              <tr className="text-left text-gray-400 text-xs">
                <th className="p-4 font-semibold uppercase tracking-wider">Parte</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Nombre</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Marca</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Costo base</th>
                <th className="p-4 font-semibold uppercase tracking-wider">P. Venta (COP)</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody className="bg-kawa-gray divide-y divide-gray-800">
              {savedParts.map(part => (
                <tr key={part.id} className="hover:bg-[#2a2a2a] transition-colors">
                  <td className="p-4 whitespace-nowrap text-sm font-medium text-white">{part.part_no}</td>
                  <td className="p-4 text-sm text-gray-400 max-w-xs truncate" title={part.name_es || part.name_en || part.name_ja || ''}>
                    {part.name_es || part.name_en || part.name_ja}
                  </td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-400">{part.mark}</td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-400 font-mono">� {part.price_yen?.toLocaleString() ?? 0}</td>
                  <td className="p-4 whitespace-nowrap text-sm font-semibold text-kawa-green">
                    $ {part.kawadojo_price?.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-4 whitespace-nowrap text-sm text-gray-500">
                    {part.created_at ? new Date(part.created_at).toLocaleDateString('es-CO') : '---'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-10 text-center flex flex-col items-center">
           <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
           </svg>
           <h3 className="text-white font-bold text-lg">No hay piezas guardadas</h3>
           <p className="text-gray-500 mt-2">Usa la pesta�a de b�squeda para cotizar y guardar repuestos.</p>
        </div>
      )}
    </div>
  );
};
const Impex: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | string>(21.23);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImpexResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await impexService.searchPart(searchTerm);
      if (res.success) {
        setResult(res.data);
      } else {
        setError('Respuesta no exitosa de la API');
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar el repuesto');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Consulta y Cotización de Impex</h1>
        <NavBarImpex activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === 'search' ? (
        <>
          <div className="bg-kawa-gray border border-gray-800 rounded-xl p-6 mb-8 shadow-sm">
            <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-6 items-end">
          
          <div className="flex-1 w-full max-w-md">
            <label className="block text-sm font-medium text-gray-400 mb-2">Número de Parte (Part No.)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej. 16097-0008"
                className="w-full bg-[#1e1e1e] text-white border border-gray-700 rounded-lg py-2 pl-4 pr-10 focus:outline-none focus:border-kawa-green transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full lg:w-auto">
             <label className="block text-sm font-medium text-gray-400 mb-2">Tasa (1 JPY en COP)</label>
             <div className="flex items-center gap-3">
               <span className="text-gray-500 font-medium">¥1 =</span>
               <input
                 type="number"
                 step="any"
                 className="w-28 bg-[#1e1e1e] text-white border border-gray-700 rounded-lg py-2 px-3 focus:outline-none focus:border-kawa-green transition-colors font-mono"
                 value={exchangeRate}
                 onChange={(e) => setExchangeRate(e.target.value)}
               />
             </div>
          </div>

          <button
            type="submit"
            disabled={loading || !searchTerm.trim()}
            className="w-full lg:w-auto h-[42px] px-6 py-2 bg-kawa-green text-black font-semibold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-900/40 border border-red-800 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-8">
          <div className="bg-kawa-gray rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-[#2a2a2a] flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Partes Originales</h2>
              <span className="bg-[#1e1e1e] text-gray-400 text-xs px-2 py-1 rounded border border-gray-700">
                {result.original_parts.length} resultados
              </span>
            </div>
            {result.original_parts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1a1a] border-b border-gray-800">
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="p-4 font-semibold uppercase tracking-wider">Parte</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Nombre</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Marca</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Base (¥)</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Costo (COP)</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">P. Venta (COP)</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Utilidad</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Estado</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-kawa-gray divide-y divide-gray-800">
                    {result.original_parts.map(part => <PartRow key={part.part_no_raw} part={part} exchangeRate={exchangeRate} />)}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">No se encontraron partes originales.</div>
            )}
          </div>

          <div className="bg-kawa-gray rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-[#2a2a2a] flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Reemplazos / Alternativas</h2>
              <span className="bg-[#1e1e1e] text-gray-400 text-xs px-2 py-1 rounded border border-gray-700">
                {result.replacement_parts.length} resultados
              </span>
            </div>
            {result.replacement_parts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1a1a] border-b border-gray-800">
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="p-4 font-semibold uppercase tracking-wider">Parte</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Nombre</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Marca</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Base (¥)</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Costo (COP)</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">P. Venta (COP)</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Utilidad</th>
                      <th className="p-4 font-semibold uppercase tracking-wider">Estado</th>
                      <th className="p-4 font-semibold uppercase tracking-wider text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-kawa-gray divide-y divide-gray-800">
                    {result.replacement_parts.map(part => <PartRow key={part.part_no_raw} part={part} exchangeRate={exchangeRate} />)}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">No se encontraron piezas de reemplazo.</div>
            )}
          </div>
        </div>
      )}
        </>
      ) : (
        <SavedPartsTab />
      )}
    </div>
  );
};

export default Impex;
