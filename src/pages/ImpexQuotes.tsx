import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import QuotesTab from '../components/QuotesTab';
import { useImpexRates } from '../hooks/useImpexRates';

const rateInput =
  'w-24 bg-[#1e1e1e] text-white border border-gray-700 rounded-lg py-1.5 px-3 focus:outline-none focus:border-kawa-green transition-colors font-mono text-sm';

// Cotizaciones de Impex: armar, comparar y guardar pedidos
export default function ImpexQuotesPage() {
  const { exchangeRate, usdExchangeRate, setExchangeRate, setUsdExchangeRate } = useImpexRates();

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cotizaciones Impex</h1>
          <p className="text-sm text-gray-400 mt-1">Arma pedidos, compáralos y conviértelos en lote.</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs text-gray-400 space-y-1">
            <span className="block">Tasa (1 JPY = COP)</span>
            <input type="number" step="any" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className={rateInput} />
          </label>
          <label className="text-xs text-gray-400 space-y-1">
            <span className="block">Tasa (1 USD = JPY)</span>
            <input type="number" step="any" value={usdExchangeRate} onChange={(e) => setUsdExchangeRate(e.target.value)} className={rateInput} />
          </label>
          <Link
            to="/impex"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500"
          >
            <Search size={15} /> Consultar / guardar piezas
          </Link>
        </div>
      </div>

      <QuotesTab exchangeRate={exchangeRate} usdExchangeRate={usdExchangeRate} />
    </div>
  );
}
