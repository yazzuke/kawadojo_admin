import  { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { X, Search, Plus, Trash2 } from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
}

interface SelectedItem {
  product_id: string;
  name: string;
  quantity: number;
  negotiated_price: number;
  stock: number;
}

export default function CreateOrderModal({ isOpen, onClose, user, onSuccess }: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [shippingCost, setShippingCost] = useState(0); 
  const [status, setStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [adminNotes, setAdminNotes] = useState('Venta cerrada por WhatsApp');

  useEffect(() => {
    if (!isOpen) return;
    
    const searchProds = async () => {
      setSearching(true);
      try {
        const res = await api.get(`/products?search=${searchTerm}&in_stock=true&limit=20`);
        setProducts(res.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    };

    const delay = setTimeout(searchProds, 300);
    return () => clearTimeout(delay);
  }, [searchTerm, isOpen]);

  if (!isOpen || !user) return null;

  const addItem = (prod: any) => {
    if (prod.in_stock === false) {
      toast.error('No hay stock disponible');
      return;
    }
    if (selectedItems.find(i => i.product_id === prod.id)) {
      toast.error('El producto ya está en la lista');
      return;
    }
    setSelectedItems([...selectedItems, {
      product_id: prod.id,
      name: prod.name,
      quantity: 1,
      negotiated_price: prod.price,
      stock: 1 // Tratamos stock como 1 para la venta (asumen q hay 1 si in_stock es true)
    }]);
    setSearchTerm(''); // clear search
  };

  const updateItem = (id: string, field: keyof SelectedItem, value: number) => {
    setSelectedItems(items => items.map(i => {
      if (i.product_id === id) {
        return { ...i, [field]: value };
      }
      return i;
    }));
  };

  const removeItem = (id: string) => {
    setSelectedItems(items => items.filter(i => i.product_id !== id));
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    setLoading(true);
    try {
      await api.post('/orders/manual', {
        user_id: user.id,
        items: selectedItems,
        shipping_cost: Number(shippingCost),
        status,
        payment_method: paymentMethod,
        admin_notes: adminNotes
      });
      toast.success('Orden creada exitosamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear la orden');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = selectedItems.reduce((sum, i) => sum + (i.negotiated_price * i.quantity), 0);
  const total = subtotal + Number(shippingCost);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-kawa-gray border border-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1e1e1e] rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-white">🛒 Crear Orden Manual</h2>
            <p className="text-gray-400 text-sm">Cliente: <span className="text-kawa-green">{user.name}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Lado Izquierdo: Buscador de Productos */}
          <div className="w-full lg:w-1/2 border-r border-gray-800 flex flex-col p-4 bg-[#161616]">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Buscar repuestos en inventario..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:border-kawa-green focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 text-gray-500 w-5 h-5" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {searching ? (
                <p className="text-center text-gray-500 py-4">Buscando...</p>
              ) : products.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No se encontraron productos</p>
              ) : (
                products.map(p => (
                  <div key={p.id} className="bg-[#1e1e1e] border border-gray-800 p-3 rounded-lg flex justify-between items-center hover:border-gray-600 transition-colors">
                    <div>
                      <p className="text-white text-sm font-bold line-clamp-1">{p.name}</p>
                      <p className="text-gray-400 text-xs">Disp: {p.in_stock ? 'Sí' : 'No'} | ${p.price?.toLocaleString('es-CO')}</p>
                    </div>
                    <button
                      onClick={() => addItem(p)}
                      disabled={p.in_stock === false}
                      className="bg-gray-800 hover:bg-kawa-green hover:text-black text-white p-2 rounded transition-colors disabled:opacity-30"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lado Derecho: Carrito y Check-out */}
          <div className="w-full lg:w-1/2 flex flex-col p-4 bg-[#111]">
            <h3 className="text-white font-bold mb-4">Resumen de Venta</h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
              {selectedItems.length === 0 ? (
                <p className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-800 rounded-lg">No hay piezas agregadas</p>
              ) : (
                selectedItems.map(item => (
                  <div key={item.product_id} className="bg-[#1e1e1e] border border-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-white text-sm font-bold line-clamp-2">{item.name}</p>
                      <button onClick={() => removeItem(item.product_id)} className="text-red-500 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-24">
                        <label className="block text-xs text-gray-400 mb-1">Cant.</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={item.quantity}
                          onChange={e => updateItem(item.product_id, 'quantity', Number(e.target.value))}
                          className="w-full bg-black border border-gray-700 text-white rounded px-2 py-1 text-sm text-center"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">Precio Final Negociado (COP)</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-gray-500">$</span>
                          <input
                            type="number"
                            value={item.negotiated_price}
                            onChange={e => updateItem(item.product_id, 'negotiated_price', Number(e.target.value))}
                            className="w-full bg-black border border-gray-700 text-white rounded pl-6 pr-2 py-1 text-sm font-mono focus:border-kawa-green focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Costo Envío (COP)</label>
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={e => setShippingCost(Number(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Estado de la Orden</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="paid">Pagada (Cerrada)</option>
                    <option value="pending">Pendiente (Reservada)</option>
                  </select>
                </div>
              </div>

              {status === 'paid' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-gray-700 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="transfer">Transferencia (Bancolombia / Nequi)</option>
                    <option value="cash">Efectivo</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1">Notas (Opcional)</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-gray-700 text-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="bg-black/50 p-3 rounded-lg flex justify-between items-center border border-gray-800 mt-2">
                <span className="text-gray-300 font-bold">TOTAL VENTA</span>
                <span className="text-kawa-green text-xl font-bold font-mono">${total.toLocaleString('es-CO')}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || selectedItems.length === 0}
                className="w-full py-3 bg-kawa-green text-black font-bold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Procesando...' : 'Confirmar Venta Manual'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
