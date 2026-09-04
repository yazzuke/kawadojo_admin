import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Si no puso correo, auto-generamos uno basado en el nombre
      let finalEmail = formData.email;
      if (!finalEmail) {
        const cleanName = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        finalEmail = `${cleanName}-${Date.now()}@kawacustomer.com`;
      }

      const res = await api.post('/users', {
        ...formData,
        email: finalEmail
      });
      toast.success('Cliente creado exitosamente');
      onSuccess(res.data.data);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-kawa-gray border border-gray-800 rounded-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1e1e1e]">
          <h2 className="text-xl font-bold text-white">Nuevo Cliente Rápido</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-kawa-green focus:outline-none"
              placeholder="Juanito Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email (Opcional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-kawa-green focus:outline-none"
              placeholder="juanito@gmail.com (Dejar vacío para auto-generar)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp / Teléfono</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg px-4 py-2 focus:border-kawa-green focus:outline-none"
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-kawa-green text-black font-bold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
