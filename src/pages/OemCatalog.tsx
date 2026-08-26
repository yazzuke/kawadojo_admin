import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { BookOpen, Search } from 'lucide-react';

export default function OemCatalog() {
  const [model, setModel] = useState('ninja300');
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDiagrams = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/oem/diagrams/${model}`);
      setDiagrams(res.data);
      toast.success('Diagramas cargados exitosamente');
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar diagramas OEM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagrams();
  }, [model]);

  return (
    <div className="space-y-6 w-full pb-32">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full bg-[#111] border border-gray-800 p-4 rounded-xl shadow-lg mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-kawa-green" />
            Catálogo OEM
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manuales y Diagramas de Despiece Oficiales (Scraping en Vivo)
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-black border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-kawa-green"
          >
            <option value="ninja300">Kawasaki Ninja 300</option>
            <option value="ninja400">Kawasaki Ninja 400</option>
          </select>
          <button 
            onClick={fetchDiagrams}
            className="bg-kawa-green text-black px-4 py-2 rounded-lg font-bold hover:bg-green-500 transition-colors flex items-center gap-2"
          >
            <Search size={18} />
            Escanear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
          <p className="text-gray-400 mt-4">Poniéndome el traje Ninja e infiltrándome en los servidores de Kawasaki...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {diagrams.map((d, i) => (
            <div key={i} className="bg-[#111] rounded-xl overflow-hidden border border-gray-800 group hover:border-kawa-green transition-colors">
              <div className="aspect-square w-full relative bg-white overflow-hidden p-4">
                <img src={d.img} alt={d.title} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
              </div>
              <div className="p-3 text-center">
                <h3 className="text-white font-bold text-sm line-clamp-2">{d.title}</h3>
                <a 
                  href={d.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 block w-full bg-gray-800 hover:bg-kawa-green hover:text-black text-white text-xs py-1.5 rounded transition-colors"
                >
                  Ver Partes
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
