import { useState, useEffect } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { userService } from '../services/userService';
import type { User } from '../types/users';

interface SelectUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onCreateNew: () => void;
}

export default function SelectUserModal({ isOpen, onClose, onSelectUser, onCreateNew }: SelectUserModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setSearchTerm('');
        return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await userService.getUsers(1, 10, searchTerm);
        setUsers(res.data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-kawa-gray border border-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1e1e1e] rounded-t-xl">
          <h2 className="text-xl font-bold text-white">Seleccionar Cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-hidden flex-1">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:border-kawa-green focus:outline-none"
                autoFocus
              />
              <Search className="absolute left-3 top-2.5 text-gray-500 w-5 h-5" />
            </div>
            <button
              onClick={() => {
                onClose();
                onCreateNew();
              }}
              className="bg-kawa-green text-black font-bold px-4 py-2 rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Nuevo Cliente
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {loading ? (
              <p className="text-center text-gray-500 py-4">Buscando...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No se encontraron clientes.</p>
            ) : (
              users.map(user => (
                <div
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                  className="bg-[#1e1e1e] border border-gray-800 p-3 rounded-lg flex justify-between items-center hover:border-kawa-green cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-white font-bold">{user.name}</p>
                    <p className="text-gray-400 text-sm">{user.email} • {user.phone}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
