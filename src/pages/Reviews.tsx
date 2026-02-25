import { useEffect, useState, useRef } from 'react';
import {
  Star,
  Plus,
  Filter,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Award,
  Upload,
  RefreshCw,
  X,
  MessageSquare,
  Image,
  Video,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { reviewService } from '../services/reviewService';
import { orderService } from '../services/orderService';
import type {
  Review,
  ReviewFilters,
  ReviewStatus,
  ReviewPagination,
} from '../types/review';
import { REVIEW_STATUSES } from '../types/review';
import type { Order } from '../types/order';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<ReviewPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ReviewFilters>({ page: 1, limit: 20 });

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [adminCaption, setAdminCaption] = useState('');
  const [creating, setCreating] = useState(false);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadReviewId, setUploadReviewId] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expand detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Media preview
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string } | null>(null);

  useEffect(() => {
    loadReviews();
  }, [filters]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const response = await reviewService.getAll(filters);
      setReviews(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = async () => {
    setShowCreateModal(true);
    setSelectedOrderId('');
    setAdminCaption('');
    setOrdersLoading(true);
    try {
      const data = await orderService.getAll({ status: 'delivered' });
      setOrders(data);
    } catch {
      // Try loading all orders if delivered filter fails
      try {
        const data = await orderService.getAll();
        setOrders(data);
      } catch (e) {
        console.error('Error loading orders:', e);
      }
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedOrderId || !adminCaption.trim()) return;
    try {
      setCreating(true);
      await reviewService.create(selectedOrderId, { admin_caption: adminCaption.trim() });
      setShowCreateModal(false);
      loadReviews();
    } catch (error) {
      console.error('Error creating review:', error);
      alert('Error al crear la reseña');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (review: Review) => {
    const url = `${window.location.origin}/review/${review.review_token}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado al portapapeles');
  };

  const handleStatusChange = async (review: Review, newStatus: ReviewStatus) => {
    try {
      await reviewService.update(review.id, { status: newStatus });
      loadReviews();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleToggleFeatured = async (review: Review) => {
    try {
      await reviewService.update(review.id, { is_featured: !review.is_featured });
      loadReviews();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const handleDelete = async (review: Review) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta reseña?')) return;
    try {
      await reviewService.delete(review.id);
      loadReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('¿Eliminar este archivo?')) return;
    try {
      await reviewService.deleteMedia(mediaId);
      loadReviews();
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  };

  const handleRegenerateToken = async (review: Review) => {
    if (!confirm('¿Regenerar el token? El link anterior dejará de funcionar.')) return;
    try {
      await reviewService.regenerateToken(review.id);
      loadReviews();
    } catch (error) {
      console.error('Error regenerating token:', error);
    }
  };

  const handleOpenUpload = (reviewId: string) => {
    setUploadReviewId(reviewId);
    setUploadCaption('');
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      await reviewService.uploadMedia(uploadReviewId, file, uploadCaption || undefined);
      setShowUploadModal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadReviews();
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

  const getStatusInfo = (status: ReviewStatus) =>
    REVIEW_STATUSES.find((s) => s.value === status) || REVIEW_STATUSES[0];

  const renderStars = (rating: number | null, size = 16) => {
    if (rating === null) return <span className="text-gray-500 text-sm">Sin calificación</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
          />
        ))}
      </div>
    );
  };

  if (isLoading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Reseñas</h1>
          <p className="text-gray-400 mt-1">Administra testimonios y reseñas de clientes</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-kawa-green hover:bg-kawa-green-dark text-black font-medium rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nueva Reseña
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {REVIEW_STATUSES.map((s) => {
          const count = reviews.filter((r) => r.status === s.value).length;
          return (
            <div key={s.value} className="bg-kawa-gray p-4 rounded-lg border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{s.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{count}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${s.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-kawa-gray p-4 rounded-lg border border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filters.status || ''}
            onChange={(e) =>
              setFilters({ ...filters, status: (e.target.value || undefined) as ReviewStatus | undefined, page: 1 })
            }
            className="px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            {REVIEW_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {filters.status && (
            <button
              onClick={() => setFilters({ page: 1, limit: 20 })}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const statusInfo = getStatusInfo(review.status);
          const isExpanded = expandedId === review.id;

          return (
            <div
              key={review.id}
              className="bg-kawa-gray rounded-lg border border-gray-800 overflow-hidden"
            >
              {/* Row summary */}
              <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white truncate">{review.order?.order_number || 'N/A'}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {review.is_featured && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-600 text-white">
                        ⭐ Destacada
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm truncate">{review.admin_caption}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {review.customer_name || review.order?.user?.name || 'Sin nombre'} · {formatDate(review.created_at)}
                  </p>
                </div>

                {/* Rating */}
                <div className="shrink-0">{renderStars(review.rating)}</div>

                {/* Media count */}
                <div className="flex items-center gap-1 text-gray-400 text-sm shrink-0">
                  <Image size={14} />
                  <span>{review.media?.filter((m) => m.type === 'image').length || 0}</span>
                  <Video size={14} className="ml-1" />
                  <span>{review.media?.filter((m) => m.type === 'video').length || 0}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyLink(review)}
                    className="p-2 text-gray-400 hover:text-kawa-green rounded-lg hover:bg-gray-800 transition-colors"
                    title="Copiar link"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => handleOpenUpload(review.id)}
                    className="p-2 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-gray-800 transition-colors"
                    title="Subir media"
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : review.id)}
                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                    title="Ver detalles"
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-800 p-4 space-y-4">
                  {/* Customer info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Cliente</p>
                      <p className="text-white">{review.order?.user?.name || 'N/A'}</p>
                      <p className="text-gray-400 text-sm">{review.order?.user?.email}</p>
                      <p className="text-gray-400 text-sm">{review.order?.user?.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Orden</p>
                      <p className="text-white">{review.order?.order_number}</p>
                      <p className="text-gray-400 text-sm">Total: {formatCurrency(review.order?.total || 0)}</p>
                      {review.order?.delivered_at && (
                        <p className="text-gray-400 text-sm">Entregado: {formatDate(review.order.delivered_at)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Productos</p>
                      {review.order?.items?.map((item, i) => (
                        <p key={i} className="text-gray-300 text-sm">
                          {item.quantity}x {item.product_name}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Comentario del cliente</p>
                      <div className="bg-kawa-black p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MessageSquare size={16} className="text-kawa-green mt-0.5 shrink-0" />
                          <p className="text-gray-300 text-sm italic">"{review.comment}"</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Media */}
                  {review.media && review.media.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Media</p>
                      <div className="flex flex-wrap gap-3">
                        {review.media.map((m) => (
                          <div key={m.id} className="relative group">
                            {m.type === 'image' ? (
                              <img
                                src={m.url}
                                alt={m.caption || 'Review media'}
                                className="w-28 h-28 object-cover rounded-lg cursor-pointer border border-gray-700"
                                onClick={() => setPreviewMedia({ url: m.url, type: 'image' })}
                              />
                            ) : (
                              <div
                                className="w-28 h-28 bg-kawa-black rounded-lg flex flex-col items-center justify-center cursor-pointer border border-gray-700"
                                onClick={() => setPreviewMedia({ url: m.url, type: 'video' })}
                              >
                                <Video size={24} className="text-kawa-green" />
                                <span className="text-xs text-gray-400 mt-1">Video</span>
                              </div>
                            )}
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-gray-300">
                              {m.uploaded_by === 'admin' ? 'Admin' : 'Cliente'}
                            </span>
                            <button
                              onClick={() => handleDeleteMedia(m.id)}
                              className="absolute top-1 right-1 p-1 bg-red-600/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} className="text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review link */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Link de reseña</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-kawa-black px-3 py-2 rounded-lg text-sm text-kawa-green flex-1 truncate">
                        {window.location.origin}/review/{review.review_token}
                      </code>
                      <button
                        onClick={() => handleCopyLink(review)}
                        className="p-2 bg-kawa-green hover:bg-kawa-green-dark text-black rounded-lg transition-colors"
                        title="Copiar"
                      >
                        <Copy size={16} />
                      </button>
                      <a
                        href={`/review/${review.review_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        title="Abrir"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                    {/* Status change */}
                    {review.status !== 'published' && (
                      <button
                        onClick={() => handleStatusChange(review, 'published')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Eye size={14} />
                        Publicar
                      </button>
                    )}
                    {review.status === 'published' && (
                      <button
                        onClick={() => handleStatusChange(review, 'hidden')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <EyeOff size={14} />
                        Ocultar
                      </button>
                    )}

                    {/* Toggle featured */}
                    <button
                      onClick={() => handleToggleFeatured(review)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        review.is_featured
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      <Award size={14} />
                      {review.is_featured ? 'Quitar destacada' : 'Destacar'}
                    </button>

                    {/* Regenerate token */}
                    <button
                      onClick={() => handleRegenerateToken(review)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                    >
                      <RefreshCw size={14} />
                      Regenerar token
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(review)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors ml-auto"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {reviews.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <MessageSquare size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No hay reseñas</p>
          <p className="text-gray-500 text-sm mt-1">Crea una reseña para una orden entregada</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setFilters({ ...filters, page })}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                page === pagination.page
                  ? 'bg-kawa-green text-black font-medium'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* ===== CREATE MODAL ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-kawa-gray rounded-xl border border-gray-800 w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Nueva Reseña</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Order selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Orden</label>
                {ordersLoading ? (
                  <div className="text-gray-400 text-sm py-2">Cargando órdenes...</div>
                ) : (
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent"
                  >
                    <option value="">Selecciona una orden</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.order_number} - {order.user?.name || 'N/A'} ({formatCurrency(order.total)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción / Caption</label>
                <textarea
                  value={adminCaption}
                  onChange={(e) => setAdminCaption(e.target.value)}
                  placeholder="Ej: Entrega de kit de arrastre en Bogotá"
                  className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedOrderId || !adminCaption.trim() || creating}
                className="px-4 py-2 bg-kawa-green hover:bg-kawa-green-dark text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creando...' : 'Crear Reseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== UPLOAD MODAL ===== */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-kawa-gray rounded-xl border border-gray-800 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Subir Media</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Archivo (imagen o video)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="w-full text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-kawa-green file:text-black file:font-medium file:cursor-pointer hover:file:bg-kawa-green-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Caption (opcional)</label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Ej: Video de entrega"
                  className="w-full px-4 py-2 bg-kawa-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-800">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-kawa-green hover:bg-kawa-green-dark text-black font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {uploading ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MEDIA PREVIEW MODAL ===== */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            {previewMedia.type === 'image' ? (
              <img src={previewMedia.url} alt="Preview" className="max-w-full max-h-[85vh] rounded-lg" />
            ) : (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
