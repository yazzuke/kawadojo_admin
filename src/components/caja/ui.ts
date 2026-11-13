// Clases compartidas de los formularios de Caja
export const inputCls = 'w-full bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:border-kawa-green outline-none';
export const labelCls = 'block text-[11px] uppercase tracking-wider text-gray-500 mb-1';
export const cardCls = 'bg-kawa-gray border border-gray-800 rounded-xl';
export const parseMoney = (s: string) => Number(String(s).replace(/[.,\s$]/g, '')) || 0;
// Para filtros en fila: mismo estilo sin ocupar todo el ancho
export const filterCls = 'bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:border-kawa-green outline-none';
