import type { SavedImpexPart, ImpexQuote } from '../types/impex';

export type Carrier = 'DHL' | 'FEDEX' | 'OTHER';

// Límite de valor (USD) por envío para no pagar arancel
export const TAX_FREE_LIMIT_USD = 200;

export interface QuoteRates {
  piezasTrm: number;   // TRM con la que el banco cobra las piezas
  shippingTrm: number; // TRM del pago del envío al casillero
  customsTrm: number;  // TRM que usa la aduana
}

export interface QuoteLine {
  part: SavedImpexPart;
  quantity: number;
}

export interface LineResult {
  part: SavedImpexPart;
  quantity: number;
  unitPieceCop: number;   // Solo la pieza
  unitCostCop: number;    // Pieza + su envío (por peso) + su IVA/arancel. No incluye el manejo fijo del pedido
  unitProfitCop: number;  // Lo que deja la pieza: venta - unitCostCop. No cambia según qué más vaya en el pedido
  marginPct: number;
  unitLandedCop: number;  // unitCostCop + su parte del manejo fijo (así queda el costo en el lote)
}

export interface ShipmentResult {
  units: number;
  subtotalUsd: number;
  subtotalYen: number;
  piezasCop: number;
  envioCop: number;
  requiresTaxes: boolean;
  arancelCop: number;
  ivaCop: number;
  carrierFeesCop: number;
  taxesAndFeesCop: number;
  totalCop: number;
  totalUsd: number;
  ventasCop: number;
  utilidadCop: number;
  margenPct: number;
  contributionCop: number; // Suma de lo que dejan las piezas (antes del manejo fijo)
  fixedFeesCop: number;    // Manejo y cargos de la transportadora: se pagan una vez por pedido
  lines: LineResult[];
}

// Manejo e impuestos de la transportadora (base sin IVA)
function carrierFees(carrier: Carrier, requiresTaxes: boolean) {
  if (carrier === 'DHL') return { manejo: 112621, cargoImpuestos: requiresTaxes ? 94158 : 0 };
  // Manejo FedEx: 89.664 COP con IVA incluido → base 75.348 para que el IVA cuadre
  if (carrier === 'FEDEX') return { manejo: 75348, cargoImpuestos: 0 };
  return { manejo: 0, cargoImpuestos: 0 };
}

// Calcula un envío (un paquete que llega de una vez)
export function computeShipment(
  lines: QuoteLine[],
  shippingUsd: number,
  carrier: Carrier,
  rates: QuoteRates
): ShipmentResult {
  const units = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotalYen = lines.reduce((sum, l) => sum + (l.part.price_yen || 0) * l.quantity, 0);
  const subtotalUsd = lines.reduce((sum, l) => sum + (l.part.price_usd || 0) * l.quantity, 0);

  const piezasCop = Math.round(subtotalUsd * rates.piezasTrm);
  const envioCop = Math.round(shippingUsd * rates.shippingTrm);

  // Aduana: CIF = piezas + envío + seguro estimado 0.5%
  const cifCop = Math.round((subtotalUsd + shippingUsd + subtotalUsd * 0.005) * rates.customsTrm);
  const requiresTaxes = subtotalUsd > TAX_FREE_LIMIT_USD;
  const arancelCop = requiresTaxes ? Math.round(cifCop * 0.1) : 0;
  const ivaCop = units > 0 ? Math.round((cifCop + arancelCop) * 0.19) : 0;

  const { manejo, cargoImpuestos } = units > 0 ? carrierFees(carrier, requiresTaxes) : { manejo: 0, cargoImpuestos: 0 };
  const carrierFeesCop = manejo + cargoImpuestos + Math.round((manejo + cargoImpuestos) * 0.19);

  const taxesAndFeesCop = arancelCop + ivaCop + carrierFeesCop;
  const totalCop = piezasCop + envioCop + taxesAndFeesCop;
  const totalUsd = rates.piezasTrm > 0 ? totalCop / rates.piezasTrm : 0;

  const ventasCop = lines.reduce((sum, l) => sum + (l.part.kawadojo_price || 0) * l.quantity, 0);
  const utilidadCop = ventasCop - totalCop;
  const margenPct = ventasCop > 0 ? (utilidadCop / ventasCop) * 100 : 0;

  // Cada pieza carga su propio costo: su envío según su peso y su IVA/arancel según su valor.
  // El manejo de la transportadora es fijo por pedido, así que no se mete en lo que "deja" cada pieza
  // (si no, una pieza barata sola parece que pierde plata y al agregar otra "mejora" sin haber cambiado).
  const totalWeight = lines.reduce((sum, l) => sum + (l.part.weight || 0) * l.quantity, 0);
  const allWeighed = lines.every((l) => (l.part.weight || 0) > 0);
  const lineResults = lines.map((l) => {
    const unitUsd = l.part.price_usd || 0;
    const unitPieceCop = unitUsd * rates.piezasTrm;
    const valueShare = subtotalUsd > 0 ? unitUsd / subtotalUsd : units > 0 ? 1 / units : 0;
    const weightShare = allWeighed && totalWeight > 0 ? (l.part.weight || 0) / totalWeight : valueShare;
    const unitCost = unitPieceCop + envioCop * weightShare + (arancelCop + ivaCop) * valueShare;
    const sale = l.part.kawadojo_price || 0;
    const unitProfitCop = Math.round(sale - unitCost);
    return {
      part: l.part,
      quantity: l.quantity,
      unitPieceCop: Math.round(unitPieceCop),
      unitCostCop: Math.round(unitCost),
      unitProfitCop,
      marginPct: sale > 0 ? (unitProfitCop / sale) * 100 : 0,
      unitLandedCop: Math.round(unitCost + carrierFeesCop * valueShare),
    };
  });
  const contributionCop = lineResults.reduce((sum, l) => sum + l.unitProfitCop * l.quantity, 0);

  return {
    units, subtotalUsd, subtotalYen, piezasCop, envioCop, requiresTaxes, arancelCop, ivaCop,
    carrierFeesCop, taxesAndFeesCop, totalCop, totalUsd, ventasCop, utilidadCop, margenPct,
    contributionCop, fixedFeesCop: carrierFeesCop, lines: lineResults,
  };
}

// Payload para guardar un envío como cotización en el historial
export function buildQuotePayload(
  lines: QuoteLine[],
  shippingUsd: number,
  carrier: Carrier,
  rates: QuoteRates,
  usdJpyRate: number,
  result: ShipmentResult
): ImpexQuote {
  return {
    exchange_rate_jpy_cop: usdJpyRate > 0 ? rates.piezasTrm / usdJpyRate : 0,
    exchange_rate_usd_jpy: usdJpyRate,
    subtotal_yen: result.subtotalYen,
    subtotal_usd: result.subtotalUsd,
    shipping_usd: shippingUsd,
    shipping_trm: rates.shippingTrm,
    carrier,
    customs_trm: rates.customsTrm,
    carrier_fees_cop: result.carrierFeesCop,
    requires_taxes: result.requiresTaxes,
    iva_usd: result.ivaCop / rates.customsTrm,
    arancel_usd: result.arancelCop / rates.customsTrm,
    total_usd: result.totalUsd,
    total_cop: result.totalCop,
    items: lines.map((l) => ({
      impex_part_id: String(l.part.id),
      quantity: l.quantity,
      unit_price_yen: l.part.price_yen || 0,
      unit_price_usd: l.part.price_usd || 0,
    })),
  };
}

export type ShippingMode = 'manual' | 'api';

// Transportadora en destino según el método de envío de Impex (para manejo e impuestos)
export function carrierFromMethod(method: string): Carrier {
  const m = method.toLowerCase();
  if (m.startsWith('dhl')) return 'DHL';
  if (m.startsWith('fedex')) return 'FEDEX';
  return 'OTHER';
}

// Peso (kg) y valor declarado (¥) de un paquete, más las piezas sin peso registrado
export function packageInfo(lines: QuoteLine[]) {
  return {
    weightKg: lines.reduce((sum, l) => sum + (l.part.weight || 0) * l.quantity, 0),
    priceJpy: lines.reduce((sum, l) => sum + (l.part.price_yen || 0) * l.quantity, 0),
    missingWeight: lines.filter((l) => !l.part.weight).map((l) => l.part.name_es || l.part.part_no),
  };
}

export const newDraftId = () => Math.random().toString(36).slice(2, 10);

export const formatCop = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO');
export const formatUsd = (n: number) => 'US$ ' + n.toFixed(2);
