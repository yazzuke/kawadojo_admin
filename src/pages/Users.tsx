import React, { useEffect, useState } from 'react';
import type { User, UsersResponse } from '../types/users';
import { userService } from '../services/userService';
import UserOrdersModal from '../components/UserOrdersModal';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<UsersResponse['pagination'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    // Si buscamos, lo ideal es siempre volver a la página 1.
    // Usaremos un pequeño timeout para hacer "debounce" de la búsqueda.
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(currentPage, searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm]);

  // Si el usuario escribe para buscar, reseteamos a la página 1
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const fetchUsers = async (page: number, search: string) => {
    try {
      setLoading(true);
      const data = await userService.getUsers(page, 20, search);
      setUsers(data.data || []);
      setPagination(data.pagination || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">
          Usuarios {pagination ? `(${pagination.total} en total)` : ''}
        </h1>
        
        {/* Barra de búsqueda */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar usuario..."
            className="w-full bg-[#1e1e1e] text-white border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-kawa-green transition-colors"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <svg className="w-5 h-5 text-gray-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="bg-kawa-gray rounded-xl border border-gray-800 mb-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr className="text-left text-gray-400 text-sm">
                <th className="p-4 font-medium uppercase tracking-wider">Nombre</th>
                <th className="p-4 font-medium uppercase tracking-wider">Email</th>
                <th className="p-4 font-medium uppercase tracking-wider">Teléfono</th>
                <th className="p-4 font-medium uppercase tracking-wider">Rol</th>
                <th className="p-4 font-medium uppercase tracking-wider">Órdenes</th>
                <th className="p-4 font-medium uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#2a2a2a] transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-medium text-white">{user.name}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-400">{user.phone}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-[#2d3748] text-gray-300 border border-gray-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-400">{user._count?.orders ?? 0}</div>
                      {(user.orders && user.orders.length > 0) && (
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-kawa-green hover:text-green-400 text-xs font-medium border border-kawa-green/30 bg-kawa-green/10 px-2 py-1 rounded transition-colors"
                        >
                          Ver detalle
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md ${user.is_active ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'}`}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-kawa-gray/50 px-4 py-3 sm:px-6 rounded-lg border border-gray-800">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-400">
                Mostrando página <span className="font-medium text-white">{pagination.page}</span> de{' '}
                <span className="font-medium text-white">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md" aria-label="Pagination">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 border border-gray-700 bg-[#1e1e1e] hover:bg-[#2a2a2a] focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Anterior</span>
                  &larr;
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === pagination.totalPages}
                  className="relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 border border-gray-700 bg-[#1e1e1e] hover:bg-[#2a2a2a] focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Siguiente</span>
                  &rarr;
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Órdenes */}
      <UserOrdersModal
        isOpen={selectedUser !== null}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  );
};

export default Users;
