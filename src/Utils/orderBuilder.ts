import type { ImpexQuote, SavedImpexPart } from '../types/impex';
import type { QuoteRates } from './impexQuoteCalc';

// Envío EMS aproximado desde Japón según peso (ajustado a la calculadora de Impex): ¥2.100 + ¥3.000/kg
export const estimateShippingJpy = (weightKg: number) => (weightKg > 0 ? 2100 + 3000 * weightKg : 0);

export interface PartHistory {
  timesOrdered: number; // En cuántas cotizaciones aparece
  totalUnits: number;
  maxQty: number;       // Lo máximo que has pedido de una vez
  lastDate: string | null;
}

// Resume el historial de cotizaciones por pieza
export function historyByPart(quotes: ImpexQuote[]): Map<string, PartHistory> {
  const map = new Map<string, PartHistory>();
  for (const q of quotes) {
    for (const it of q.items) {
      const h = map.get(it.impex_part_id) || { timesOrdered: 0, totalUnits: 0, maxQty: 0, lastDate: null };
      h.timesOrdered += 1;
      h.totalUnits += it.quantity;
      h.maxQty = Math.max(h.maxQty, it.quantity);
      if (q.created_at && (!h.lastDate || q.created_at > h.lastDate)) h.lastDate = q.created_at;
      map.set(it.impex_part_id, h);
    }
  }
  return map;
}

export interface Candidate {
  part: SavedImpexPart;
  minQty?: number;          // Unidades que van sí o sí (modo "Fijo")
  maxQty: number;
  unitContribution: number; // Lo que deja cada unidad después de pieza, IVA y envío estimado
}

export interface SalesStat {
  impex_part_id: string;
  products: number;
  sold_total: number;
  sold_180d: number;
  orders_180d: number; // Pedidos distintos (clientes) en 6 meses
  last_sold_at: string | null;
  stock: number;
}

// Unidades a traer para cubrir `months` meses de venta, descontando lo que ya hay en stock.
// Se mide por pedidos distintos: un pedido de 4 piezas (un encargo) cuenta como 1.
export function demandCap(stat: SalesStat | undefined, months: number, minOrders: number) {
  if (!stat || stat.orders_180d < Math.max(1, minOrders)) return null;
  const demand = Math.ceil((stat.orders_180d / 6) * months);
  return { demand, cap: Math.max(0, demand - stat.stock) };
}

// Lo que deja una unidad: venta - pieza - IVA aproximado - envío por su peso
export function unitContribution(part: SavedImpexPart, rates: QuoteRates, usdJpyRate: number) {
  const usd = part.price_usd || 0;
  const pieceCop = usd * rates.piezasTrm;
  const ivaCop = 0.19 * usd * 1.005 * rates.customsTrm;
  const shipCop = usdJpyRate > 0 ? ((part.weight || 0) * 3000 / usdJpyRate) * rates.shippingTrm : 0;
  return (part.kawadojo_price || 0) - pieceCop - ivaCop - shipCop;
}

// Mochila acotada: escoge cantidades para maximizar lo que deja sin pasar el límite en USD.
// Trabaja en décimos de dólar y redondea precios hacia arriba para nunca pasarse.
export function buildBestOrder(candidates: Candidate[], limitUsd: number): Array<{ part: SavedImpexPart; quantity: number }> {
  // Primero lo que va sí o sí; el resto del límite se reparte con la mochila
  const forced = new Map<number, number>();
  let forcedCost = 0;
  candidates.forEach((c, idx) => {
    if (c.minQty && c.minQty > 0) {
      forced.set(idx, c.minQty);
      forcedCost += Math.ceil((c.part.price_usd || 0) * 10) * c.minQty;
    }
  });

  const W = Math.max(0, Math.floor(limitUsd * 10) - forcedCost);
  const units: number[] = [];
  const costs: number[] = [];
  const values: number[] = [];
  candidates.forEach((c, idx) => {
    const cost = Math.ceil((c.part.price_usd || 0) * 10);
    if (cost <= 0 || cost > W || c.unitContribution <= 0) return;
    for (let k = forced.get(idx) || 0; k < c.maxQty; k++) {
      units.push(idx);
      costs.push(cost);
      values.push(c.unitContribution);
    }
  });

  const n = units.length;
  const best = new Float64Array(W + 1);
  const take = new Uint8Array(n * (W + 1));
  for (let i = 0; i < n; i++) {
    const cost = costs[i];
    const value = values[i];
    for (let w = W; w >= cost; w--) {
      const withItem = best[w - cost] + value;
      if (withItem > best[w]) {
        best[w] = withItem;
        take[i * (W + 1) + w] = 1;
      }
    }
  }

  const qty = new Map<number, number>(forced);
  let w = W;
  for (let i = n - 1; i >= 0; i--) {
    if (take[i * (W + 1) + w]) {
      qty.set(units[i], (qty.get(units[i]) || 0) + 1);
      w -= costs[i];
    }
  }
  return [...qty.entries()].map(([idx, quantity]) => ({ part: candidates[idx].part, quantity }));
}

// Mejor opción y alternativas: cada alternativa saca la pieza que más aportaba en la anterior
export function buildOptions(candidates: Candidate[], limitUsd: number, count = 3) {
  const options: Array<Array<{ part: SavedImpexPart; quantity: number }>> = [];
  const banned = new Set<string>();
  for (let i = 0; i < count; i++) {
    const pool = candidates.filter((c) => !banned.has(String(c.part.id)));
    const order = buildBestOrder(pool, limitUsd);
    if (!order.length) break;
    options.push(order);
    // Las piezas fijas no se sacan en las alternativas
    const removable = order.filter((o) => !candidates.find((c) => c.part.id === o.part.id)?.minQty);
    if (!removable.length) break;
    const top = removable.reduce((a, b) => {
      const ca = candidates.find((c) => c.part.id === a.part.id)!.unitContribution * a.quantity;
      const cb = candidates.find((c) => c.part.id === b.part.id)!.unitContribution * b.quantity;
      return cb > ca ? b : a;
    });
    banned.add(String(top.part.id));
  }
  return options;
}
