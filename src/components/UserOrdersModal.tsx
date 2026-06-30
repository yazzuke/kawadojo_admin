import React from 'react';
import type { User } from '../types/users';

interface UserOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const UserOrdersModal: React.FC<UserOrdersModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">
            Órdenes de {user.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {!user.orders || user.orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay detalles de órdenes para este usuario.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-[#2a2a2a]">
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="p-4 font-medium uppercase tracking-wider">No. Orden</th>
                    <th className="p-4 font-medium uppercase tracking-wider">Fecha</th>
                    <th className="p-4 font-medium uppercase tracking-wider">Total</th>
                    <th className="p-4 font-medium uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e1e1e] divide-y divide-gray-800">
                  {user.orders.map(order => (
                    <tr key={order.id} className="hover:bg-[#2a2a2a] transition-colors">
                      <td className="p-4 whitespace-nowrap text-sm font-medium text-white">
                        {order.order_number}
                      </td>
                      <td className="p-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 whitespace-nowrap text-sm text-kawa-green font-medium">
                        ${order.total.toLocaleString()}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md border ${
                          order.status === 'delivered' ? 'bg-green-900/40 text-green-400 border-green-800' :
                          order.status === 'paid' ? 'bg-blue-900/40 text-blue-400 border-blue-800' :
                          'bg-yellow-900/40 text-yellow-400 border-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-[#1a1a1a] flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2d3748] text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium border border-gray-700"
          >
            Cerrar modal
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserOrdersModal;
