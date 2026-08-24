import React, { useState, useEffect } from 'react';
import { 
  Info, 
  Tag, 
  Package, 
  Activity, 
  Save,
  X,
  Banknote,
  TrendingUp,
  Percent,
  Link as LinkIcon
} from 'lucide-react';
import { productService } from '../services/productService';
import ProductSelectorModal from './ProductSelectorModal';

// 1. Definimos las interfaces para evitar el error de 'any'
interface MotoModel {
  id: string;
  name: string;
}

interface FormData {
  mark: string;
  part_no: string;
  part_no_raw: string;
  name_ja: string;
  name_es: string;
  name_en: string;
  price_yen: number;
  price_usd: number;
  weight: number;
  type_id: number;
  kawadojo_price: number;
  profit: number;
  margin: number;
  compatible_moto_models: string[];
  base_product_id?: string | null;
  base_product?: { id: string; name: string } | null;
}

interface ModalItemImpexProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  modalType: 'save' | 'edit' | null;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  motoModels: MotoModel[];
  exchangeRate: number | string;
  usdExchangeRate: number | string;
}

const ModalItemImpex: React.FC<ModalItemImpexProps> = ({
  isOpen,
  onClose,
  onSave,
  modalType,
  formData,
  onFormDataChange,
  motoModels,
  exchangeRate,
  usdExchangeRate,
}) => {
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      productService.getAll().then((data: any[]) => {
        setProducts(data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copCost = (formData.price_yen || 0) * (Number(exchangeRate) || 0);

  // Common input styles for a modern look
  const inputClassName = "w-full bg-[#1e1e1e]/60 text-white border border-gray-700/50 rounded-xl px-4 py-2.5 focus:border-kawa-green focus:ring-1 focus:ring-kawa-green/30 focus:bg-[#1e1e1e] hover:border-gray-600 transition-all outline-none text-sm shadow-inner placeholder-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      {/* Container con borde sutil, shadow glow y un degradado de fondo muy oscuro */}
      <div className="bg-gradient-to-b from-[#161616] to-[#0f0f0f] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800/60 sticky top-0 bg-[#161616]/95 backdrop-blur-sm z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-kawa-green" />
            {modalType === 'save' ? 'Confirmar Guardado en BD' : 'Editar Repuesto Guardado'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* Sección: Vinculación con Catálogo (Plantilla) */}
          <div className="bg-[#1e1e1e]/40 border border-kawa-green/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-kawa-green" />
                <h3 className="text-sm font-semibold text-kawa-green tracking-wide">Vinculación de Catálogo</h3>
              </div>
              <button
                onClick={() => setIsProductSelectorOpen(true)}
                className="text-xs bg-kawa-green text-black px-3 py-1.5 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-[0_0_10px_rgba(116,252,50,0.2)]"
              >
                {formData.base_product_id ? 'Cambiar Producto Base' : 'Vincular a un Producto'}
              </button>
            </div>
            {formData.base_product ? (
              <div className="mt-3 flex items-center justify-between bg-black/40 rounded-lg p-3 border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#2a2a2a] flex items-center justify-center">
                    <Package className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{formData.base_product.name}</p>
                    <p className="text-xs text-gray-400">Este producto se usará como plantilla al convertir a Lote.</p>
                  </div>
                </div>
                <button 
                  onClick={() => onFormDataChange({ ...formData, base_product_id: null, base_product: null })}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-2">
                Opcional: Vincula este repuesto a un producto de tu catálogo. Al generar un lote, se clonarán todos los datos (descripción, categoría, tags, compatibilidad) automáticamente.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            
            {/* Sección: Información Básica */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-800/60 pb-2">
                <Info className="w-4 h-4 text-kawa-green" />
                <h3 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">Información Básica</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Marca (Mark)</label>
                  <input
                    type="text"
                    className={inputClassName}
                    value={formData.mark}
                    onChange={(e) => onFormDataChange({ ...formData, mark: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Part No Raw</label>
                  <input
                    type="text"
                    className={inputClassName}
                    value={formData.part_no_raw}
                    onChange={(e) => onFormDataChange({ ...formData, part_no_raw: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Nombre Japonés</label>
                  <input
                    type="text"
                    className={inputClassName}
                    value={formData.name_ja}
                    onChange={(e) => onFormDataChange({ ...formData, name_ja: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Nombres y Precios */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-800/60 pb-2">
                <Tag className="w-4 h-4 text-kawa-green" />
                <h3 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">Nombres y Precios</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Nombre (Español)</label>
                  <input
                    type="text"
                    className={inputClassName}
                    value={formData.name_es}
                    onChange={(e) => onFormDataChange({ ...formData, name_es: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Nombre (Inglés)</label>
                  <input
                    type="text"
                    className={inputClassName}
                    value={formData.name_en}
                    onChange={(e) => onFormDataChange({ ...formData, name_en: e.target.value })}
                  />
                </div>
                <div>
                  <label className="flex text-xs font-medium text-gray-400 mb-1.5 ml-1 justify-between items-end">
                    <span>Precio de Venta (COP)</span>
                    <span className="text-gray-500 font-normal bg-black/30 px-2 py-0.5 rounded-md border border-gray-800">
                      Costo: $ {copCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-kawa-green/70 font-bold">
                      <Banknote className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      className={`${inputClassName} pl-10 font-semibold tracking-wide text-kawa-green`}
                      value={formData.kawadojo_price === 0 ? '' : formData.kawadojo_price}
                      onChange={(e) => {
                        const newPrice = e.target.value === '' ? 0 : Number(e.target.value);
                        const newProfit = newPrice > 0 ? newPrice - copCost : 0;
                        const newMargin = copCost > 0 && newPrice > 0 ? (newProfit / copCost) * 100 : 0;
                        onFormDataChange({ 
                          ...formData, 
                          kawadojo_price: newPrice,
                          profit: newProfit,
                          margin: Number(newMargin.toFixed(2))
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Logística y Costos */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2 border-b border-gray-800/60 pb-2">
                <Package className="w-4 h-4 text-kawa-green" />
                <h3 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">Logística y Costos</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/[0.02] p-4 rounded-xl border border-gray-800/50">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5 ml-1">Precio Yen (¥)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-bold text-sm">¥</span>
                    <input
                      type="number"
                      className={`${inputClassName} pl-7 pr-2 font-mono`}
                      value={formData.price_yen === 0 ? '' : formData.price_yen}
                      onChange={(e) => {
                        const yen = e.target.value === '' ? 0 : Number(e.target.value);
                        const usd = Number((yen / (Number(usdExchangeRate) || 160)).toFixed(2));
                        onFormDataChange({ ...formData, price_yen: yen, price_usd: usd });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5 ml-1">Precio USD ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-bold text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className={`${inputClassName} pl-7 pr-2 font-mono text-blue-400`}
                      value={formData.price_usd === 0 ? '' : formData.price_usd}
                      onChange={(e) => {
                        const usd = e.target.value === '' ? 0 : Number(e.target.value);
                        const yen = Math.round(usd * (Number(usdExchangeRate) || 160));
                        onFormDataChange({ ...formData, price_usd: usd, price_yen: yen });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5 ml-1">Peso (kg)</label>
                  <input
                    type="number"
                    className={`${inputClassName} font-mono`}
                    value={formData.weight === 0 ? '' : formData.weight}
                    onChange={(e) => onFormDataChange({ ...formData, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5 ml-1">Tipo ID</label>
                  <input
                    type="number"
                    className={`${inputClassName} font-mono`}
                    value={formData.type_id === 0 ? '' : formData.type_id}
                    onChange={(e) => onFormDataChange({ ...formData, type_id: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Sección: Métricas y Compatibilidad */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2 border-b border-gray-800/60 pb-2">
                <Activity className="w-4 h-4 text-kawa-green" />
                <h3 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">Métricas y Compatibilidad</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Status Cards para Profit y Margin */}
                <div className={`col-span-1 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden ${
                  formData.profit > 0 
                    ? 'bg-gradient-to-br from-kawa-green/10 to-[#111] border border-kawa-green/30' 
                    : 'bg-[#1a1a1a] border border-gray-800'
                }`}>
                  <span className="text-[11px] font-medium text-gray-400 mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" /> Profit Neto
                  </span>
                  <span className={`text-xl font-bold tracking-tight ${formData.profit > 0 ? 'text-kawa-green' : 'text-gray-500'}`}>
                    $ {formData.profit.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className={`col-span-1 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden ${
                  formData.margin > 0 
                    ? 'bg-gradient-to-br from-kawa-green/10 to-[#111] border border-kawa-green/30' 
                    : 'bg-[#1a1a1a] border border-gray-800'
                }`}>
                  <span className="text-[11px] font-medium text-gray-400 mb-1 flex items-center gap-1.5">
                    <Percent className="w-3 h-3" /> Margen
                  </span>
                  <span className={`text-xl font-bold tracking-tight ${formData.margin > 0 ? 'text-kawa-green' : 'text-gray-500'}`}>
                    {Number(formData.margin).toFixed(1)}%
                  </span>
                </div>

                {/* Selección de Modelos */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5 ml-1">Modelos de Motos Compatibles</label>
                  <div className="bg-[#1e1e1e]/40 border border-gray-800/80 rounded-xl p-4 h-[90px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <div className="flex flex-wrap gap-2">
                      {motoModels.map((model) => {
                        const isSelected = formData.compatible_moto_models.includes(model.id);
                        return (
                          <button
                            key={model.id}
                            onClick={() => {
                              const currentModels = formData.compatible_moto_models;
                              if (isSelected) {
                                onFormDataChange({ ...formData, compatible_moto_models: currentModels.filter((id) => id !== model.id) });
                              } else {
                                onFormDataChange({ ...formData, compatible_moto_models: [...currentModels, model.id] });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border ${
                              isSelected
                                ? 'bg-kawa-green/20 text-kawa-green border-kawa-green/50 shadow-[0_0_15px_rgba(116,252,50,0.15)]'
                                : 'bg-[#1a1a1a] text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200 hover:bg-[#222]'
                            }`}
                          >
                            {model.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Botones */}
            <div className="pt-6 border-t border-gray-800/60 flex gap-4 md:col-span-2">
              <button
                onClick={onSave}
                className="flex-1 py-3.5 bg-kawa-green text-black font-bold text-sm rounded-xl hover:bg-opacity-90 transition-all shadow-[0_0_20px_rgba(116,252,50,0.2)] hover:shadow-[0_0_30px_rgba(116,252,50,0.4)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {modalType === 'save' ? 'Confirmar y Guardar' : 'Actualizar Cambios'}
              </button>
              <button
                onClick={onClose}
                className="px-8 py-3.5 bg-[#222] text-gray-300 font-bold text-sm rounded-xl hover:bg-[#2a2a2a] hover:text-white transition-all border border-gray-700/50"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      </div>
      
      {isProductSelectorOpen && (
        <ProductSelectorModal
          products={products}
          selectedProducts={[]}
          onClose={() => setIsProductSelectorOpen(false)}
          onConfirm={(selectedItems) => {
            if (selectedItems.length > 0) {
              const selected = selectedItems[0].product;
              onFormDataChange({
                ...formData,
                base_product_id: selected.id,
                base_product: { id: selected.id, name: selected.name }
              });
            }
            setIsProductSelectorOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ModalItemImpex;

