import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Upload, Loader2 } from 'lucide-react';
import { modelService } from '../services/modelService';
import type { CompatibleModel } from '../types/product';

export default function ModelsPage() {
  const [models, setModels] = useState<CompatibleModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const data = await modelService.getAll();
      setModels(data);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logo) {
      setError('Debes seleccionar un logo');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await modelService.create({ name, logo });
      loadModels();
      handleCloseModal();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error.response?.data?.message || 'Error al crear el modelo');
      } else {
        setError('Error al crear el modelo');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await modelService.delete(id);
      setModels(models.filter((m) => m.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setName('');
    setLogo(null);
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
    setError('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Modelos de Motos</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-kawa-green text-black font-medium rounded-lg hover:bg-kawa-green-light transition-colors"
        >
          <Plus size={20} />
          Nuevo Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {models.map((model) => (
          <div
            key={model.id}
            className="bg-kawa-gray rounded-xl p-6 border border-gray-800 flex flex-col items-center group relative"
          >
            {/* Delete button */}
            <button
              onClick={() => setDeleteConfirm(model.id)}
              className="absolute top-2 right-2 p-2 bg-red-500/10 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
            >
              <Trash2 size={16} />
            </button>

            {model.logo_url ? (
              <img
                src={model.logo_url}
                alt={model.name}
                className="h-16 object-contain mb-4"
              />
            ) : (
              <div className="h-16 w-full bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-500">Sin logo</span>
              </div>
            )}
            <h3 className="text-white font-medium text-center">{model.name}</h3>
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay modelos</p>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-kawa-gray rounded-xl max-w-md w-full border border-gray-800">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Nuevo Modelo</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Ninja 400"
                  className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-kawa-green"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Logo *
                </label>
                {logoPreview ? (
                  <div className="relative w-full h-32 bg-kawa-black rounded-lg flex items-center justify-center border border-gray-700">
                    <img
                      src={logoPreview}
                      alt="Preview"
                      className="h-20 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogo(null);
                        if (logoPreview) URL.revokeObjectURL(logoPreview);
                        setLogoPreview(null);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-32 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-kawa-green transition-colors">
                    <Upload size={32} className="text-gray-500 mb-2" />
                    <span className="text-sm text-gray-500">Seleccionar imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-kawa-green text-black font-bold rounded-lg hover:bg-kawa-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-kawa-gray rounded-xl p-6 max-w-md w-full border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Confirmar eliminación</h3>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-400 mb-6">
              ¿Estás seguro de que deseas eliminar este modelo? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 px-4 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
