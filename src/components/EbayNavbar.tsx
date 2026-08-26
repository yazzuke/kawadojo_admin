import React from 'react';
import { ShoppingBag, Search, User } from 'lucide-react';

interface EbayNavbarProps {
  trm: number;
  setTrm: (val: number) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  sellerSearch: string;
  setSellerSearch: (val: string) => void;
  sort: string;
  setSort: (val: string) => void;
  interestKeywords: string;
  onKeywordsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: (e: React.FormEvent) => void;
  savedSellers?: any[];
  motoModel: string;
  setMotoModel: (val: string) => void;
}

export function EbayNavbar({
  trm,
  setTrm,
  searchTerm,
  setSearchTerm,
  sellerSearch,
  setSellerSearch,
  sort,
  setSort,
  interestKeywords,
  onKeywordsChange,
  onSearch,
  savedSellers = [],
  motoModel,
  setMotoModel
}: EbayNavbarProps) {
  return (
    <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4 w-full bg-[#111] border border-gray-800 p-4 rounded-xl shadow-lg mb-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="text-kawa-green" />
            eBay Listings
          </h1>
          <div className="mt-2">
            <select
              value={motoModel}
              onChange={(e) => setMotoModel(e.target.value)}
              className="bg-black border border-gray-700 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-kawa-green text-sm font-bold w-full sm:w-auto"
            >
              <option value="ninja300">Kawasaki Ninja 300 / EX300</option>
              <option value="ninja400">Kawasaki Ninja 400</option>
              <option value="r3">Yamaha YZF-R3</option>
              <option value="mt03">Yamaha MT-03</option>
              <option value="z400">Kawasaki Z400</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-black border border-gray-800 p-2 rounded-lg mb-1">
          <label className="text-gray-400 text-sm whitespace-nowrap pl-2">TRM (COP):</label>
          <input 
            type="number" 
            value={trm}
            onChange={(e) => setTrm(Number(e.target.value))}
            className="bg-[#111] border border-gray-700 text-white px-2 py-1 rounded focus:outline-none focus:border-kawa-green w-24 text-right"
          />
        </div>
      </div>
      
      <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
        <div className="relative flex-1 sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Ej: Radiator, Gas Tank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-kawa-green"
          />
        </div>

        <div className="relative flex-1 sm:w-48">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            list="saved-sellers-list"
            placeholder="Vendedor (Opcional)"
            value={sellerSearch}
            onChange={(e) => setSellerSearch(e.target.value)}
            className="w-full bg-black border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-kawa-green"
          />
          <datalist id="saved-sellers-list">
            {savedSellers.map(s => (
              <option key={s.id} value={s.username} />
            ))}
          </datalist>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-black border border-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-kawa-green text-sm"
          >
            <option value="newest">Más Recientes</option>
            <option value="priceAsc">Menor Precio</option>
            <option value="priceDesc">Mayor Precio</option>
          </select>

          <button 
            type="submit"
            className="bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-[#8ee000] transition-colors"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Keywords Input */}
      <div className="w-full mt-4 pt-4 border-t border-gray-800 flex items-center gap-3">
        <label className="text-gray-400 text-sm whitespace-nowrap">Palabras Clave (Prioridad):</label>
        <input
          type="text"
          value={interestKeywords}
          onChange={onKeywordsChange}
          className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:border-kawa-green focus:outline-none"
          placeholder="Ej: shock, radiator, Starter Motor, Regulator Rectifier,Fan, Cooling Fan"
        />
      </div>
    </div>
  );
}

