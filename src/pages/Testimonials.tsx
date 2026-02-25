import { useEffect, useState } from 'react';
import { Star, Play, X } from 'lucide-react';
import { reviewService } from '../services/reviewService';
import type { PublicTestimonial } from '../types/review';

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaModal, setMediaModal] = useState<{ url: string; type: string } | null>(null);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      setIsLoading(true);
      const data = await reviewService.getPublic(20);
      // Sort: featured first, then by submitted_at desc
      data.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });
      setTestimonials(data);
    } catch (error) {
      console.error('Error loading testimonials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-[#111] border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-kawa-green">KAWADOJO</h1>
          <p className="text-gray-400 mt-2 text-lg">Lo que dicen nuestros clientes</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Average rating */}
        {testimonials.length > 0 && (
          <div className="text-center mb-10">
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((i) => {
                const avg = testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length;
                return (
                  <Star
                    key={i}
                    size={28}
                    className={i <= Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                  />
                );
              })}
            </div>
            <p className="text-gray-400">
              {(testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1)} de 5 ·{' '}
              {testimonials.length} reseñas
            </p>
          </div>
        )}

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className={`bg-[#111] rounded-xl border overflow-hidden transition-shadow hover:shadow-lg hover:shadow-kawa-green/5 ${
                t.is_featured ? 'border-kawa-green/40 md:col-span-2 lg:col-span-1' : 'border-gray-800'
              }`}
            >
              {/* Media thumbnail */}
              {t.media && t.media.length > 0 && (
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setMediaModal({ url: t.media[0].url, type: t.media[0].type })}
                >
                  {t.media[0].type === 'video' ? (
                    <>
                      <video
                        src={t.media[0].url}
                        className="w-full h-48 object-cover"
                        preload="metadata"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                        <div className="w-12 h-12 bg-kawa-green rounded-full flex items-center justify-center">
                          <Play size={20} className="text-black ml-0.5" fill="black" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={t.media[0].url}
                      alt="Entrega"
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                    />
                  )}

                  {/* Featured badge */}
                  {t.is_featured && (
                    <span className="absolute top-2 left-2 px-2 py-1 bg-kawa-green text-black text-xs font-bold rounded">
                      ⭐ Destacada
                    </span>
                  )}

                  {/* More media */}
                  {t.media.length > 1 && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                      +{t.media.length - 1} más
                    </span>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  {renderStars(t.rating)}
                  <span className="text-gray-500 text-xs">{formatDate(t.submitted_at)}</span>
                </div>

                <div>
                  <p className="font-semibold text-white">{t.customer_name}</p>
                  <p className="text-gray-500 text-xs">{t.admin_caption}</p>
                </div>

                {t.comment && (
                  <p className="text-gray-300 text-sm italic leading-relaxed">"{t.comment}"</p>
                )}

                {/* Products */}
                {t.products && t.products.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-800">
                    {t.products.map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-kawa-green/10 text-kawa-green text-xs rounded-full border border-kawa-green/20"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {testimonials.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Aún no hay testimonios publicados</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-10">
          <p className="text-gray-600 text-sm">KAWADOJO · Repuestos Kawasaki Colombia</p>
        </div>
      </main>

      {/* ===== MEDIA MODAL ===== */}
      {mediaModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setMediaModal(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMediaModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            {mediaModal.type === 'image' ? (
              <img src={mediaModal.url} alt="Preview" className="max-w-full max-h-[85vh] rounded-lg" />
            ) : (
              <video
                src={mediaModal.url}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[85vh] rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
