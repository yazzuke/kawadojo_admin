import { useEffect, useState } from 'react';

const RATES_KEY = 'kawadojo.impex.rates';

function load(): { jpyCop: number | string; usdJpy: number | string } {
  try {
    const saved = JSON.parse(localStorage.getItem(RATES_KEY) || '{}');
    return { jpyCop: saved.jpyCop ?? 21.23, usdJpy: saved.usdJpy ?? 158.12 };
  } catch {
    return { jpyCop: 21.23, usdJpy: 158.12 };
  }
}

// Tasas de Impex compartidas entre Consulta y Cotizaciones (se recuerdan en este navegador)
export function useImpexRates() {
  const [rates, setRates] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(RATES_KEY, JSON.stringify(rates)); } catch { /* sin storage */ }
  }, [rates]);

  return {
    exchangeRate: rates.jpyCop,
    usdExchangeRate: rates.usdJpy,
    setExchangeRate: (jpyCop: number | string) => setRates((r) => ({ ...r, jpyCop })),
    setUsdExchangeRate: (usdJpy: number | string) => setRates((r) => ({ ...r, usdJpy })),
  };
}
