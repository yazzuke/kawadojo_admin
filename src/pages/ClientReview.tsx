import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle, Package, Calendar, Play } from 'lucide-react';
import { reviewService } from '../services/reviewService';
import type { ReviewTokenData } from '../types/review';

export default function ClientReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [review, setReview] = useState<ReviewTokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Video player
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  useEffect(() => {
    if (token) loadReview();
  }, [token]);

  const loadReview = async () => {
    try {
      setIsLoading(true);
      const data = await reviewService.getByToken(token!);
      setReview(data);
      setCustomerName(data.customer_name || '');
      if (data.already_submitted) {
        setSubmitted(true);
        setRating(data.rating || 0);
        setComment(data.comment || '');
      }
    } catch (err: unknown) {
      console.error(err);
      setError('No se encontró esta reseña o el enlace ha expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!rating) {
      alert('Por favor selecciona una calificación');
      return;
    }
    try {
      setSubmitting(true);

      await reviewService.submitByToken(token!, {
        rating,
        comment: comment.trim() || undefined,
        customer_name: customerName.trim() || undefined,
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Error al enviar la reseña. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  const adminVideos = review?.media?.filter((m) => m.type === 'video' && m.uploaded_by === 'admin') || [];
  const adminImages = review?.media?.filter((m) => m.type === 'image' && m.uploaded_by === 'admin') || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏍️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Enlace no válido</h1>
          <p className="text-gray-400">{error || 'No se pudo cargar la reseña.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-[#111] border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-kawa-green">KAWADOJO</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Admin caption */}
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white">{review.admin_caption}</h2>
          <div className="flex items-center justify-center gap-4 mt-2 text-gray-400 text-sm">
            <span className="flex items-center gap-1">
              <Package size={14} />
              {review.order_number}
            </span>
            {review.delivered_at && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(review.delivered_at)}
              </span>
            )}
          </div>
        </div>

        {/* Delivery videos */}
        {adminVideos.length > 0 && (
          <div className="space-y-4">
            {adminVideos.map((media) => (
              <div key={media.id} className="rounded-xl overflow-hidden border border-gray-800">
                {playingVideo === media.id ? (
                  <video
                    src={media.url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full rounded-xl"
                    onEnded={() => setPlayingVideo(null)}
                  />
                ) : (
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setPlayingVideo(media.id)}
                  >
                    <video
                      src={media.url}
                      className="w-full rounded-xl"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors rounded-xl">
                      <div className="w-16 h-16 bg-kawa-green rounded-full flex items-center justify-center shadow-lg">
                        <Play size={28} className="text-black ml-1" fill="black" />
                      </div>
                    </div>
                    {media.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-3 rounded-b-xl">
                        <p className="text-white text-sm">{media.caption}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Admin photos */}
        {adminImages.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {adminImages.map((media) => (
              <div key={media.id} className="relative rounded-lg overflow-hidden border border-gray-800">
                <img
                  src={media.url}
                  alt={media.caption || 'Foto de entrega'}
                  className="w-full h-48 object-cover"
                />
                {media.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs">{media.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Products */}
        {review.products && review.products.length > 0 && (
          <div className="bg-[#111] rounded-xl border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Productos comprados</h3>
            <div className="space-y-2">
              {review.products.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-white text-sm">{p.product_name}</span>
                  <span className="text-gray-400 text-sm">x{p.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Green divider */}
        <div className="h-1 bg-linear-to-r from-transparent via-kawa-green to-transparent rounded-full" />

        {/* Already submitted → Thank you */}
        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle size={56} className="mx-auto text-kawa-green" />
            <h3 className="text-2xl font-bold text-white">¡Gracias por tu reseña!</h3>
            <p className="text-gray-400">Tu opinión nos ayuda a seguir mejorando</p>
            <div className="flex justify-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={28}
                  className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                />
              ))}
            </div>
            {comment && (
              <p className="text-gray-300 italic max-w-md mx-auto mt-3">"{comment}"</p>
            )}
          </div>
        ) : (
          /* Review form */
          <div className="bg-[#111] rounded-xl border border-gray-800 p-6 space-y-5">
            <h3 className="text-lg font-bold text-white text-center">¿Cómo fue tu experiencia?</h3>

            {/* Star rating */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(i)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    className={
                      i <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    }
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-gray-400">
                {rating === 1 && 'Malo'}
                {rating === 2 && 'Regular'}
                {rating === 3 && 'Bueno'}
                {rating === 4 && 'Muy bueno'}
                {rating === 5 && '¡Excelente!'}
              </p>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tu nombre</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent"
                placeholder="Nombre visible en la reseña"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Comentario</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-kawa-green focus:border-transparent resize-none"
                rows={4}
                placeholder="Cuéntanos sobre tu experiencia con KAWADOJO..."
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!rating || submitting}
              className="w-full py-3 bg-kawa-green hover:bg-kawa-green-dark text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {submitting ? 'Enviando...' : 'Enviar Reseña'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-gray-600 text-xs">KAWADOJO · Repuestos Kawasaki</p>
        </div>
      </main>
    </div>
  );
}
