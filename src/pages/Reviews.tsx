import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, Filter, Plus, Bed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../services/storage';
import { Review } from '../types';
import { useAuth } from '../AuthContext';
import { useToast } from '../context/ToastContext';
import { avatarForNewReview, resolveUserAvatar } from '../utils/userAvatar';
import { getReviewScopeLabel, isGeneralReview } from '../utils/reviewHelpers';
import { ReviewAvatar, UserAvatar } from '../components/UserAvatar';

type ScopeFilter = 'all' | 'general' | 'room';

export default function ReviewsPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const roomIdParam = searchParams.get('roomId');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'recent' | 'rating'>('recent');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const { currentUser } = useAuth();

  const targetRoom = useMemo(() => {
    if (!roomIdParam) return null;
    return storage.getRooms().find((r) => r.id === roomIdParam) ?? null;
  }, [roomIdParam]);

  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
  });

  useEffect(() => {
    setReviews(storage.getReviews().filter((r) => r.approved));
  }, []);

  useEffect(() => {
    if (roomIdParam) {
      setShowForm(true);
      setScopeFilter('room');
    }
  }, [roomIdParam]);

  const filteredByScope = useMemo(() => {
    if (scopeFilter === 'general') return reviews.filter(isGeneralReview);
    if (scopeFilter === 'room') return reviews.filter((r) => !isGeneralReview(r));
    return reviews;
  }, [reviews, scopeFilter]);

  const sortedReviews = [...filteredByScope].sort((a, b) => {
    if (filter === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
    return b.rating - a.rating;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Debe iniciar sesión para dejar una reseña.', 'error');
      return;
    }

    const newReview: Review = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatarUrl: avatarForNewReview(currentUser),
      ...(targetRoom
        ? {
            roomId: targetRoom.id,
            roomNumber: targetRoom.number,
            roomName: targetRoom.name,
          }
        : {}),
      rating: formData.rating,
      comment: formData.comment,
      date: new Date().toISOString().split('T')[0],
      approved: false,
    };

    storage.saveReview(newReview);
    showToast(
      targetRoom
        ? `Reseña de la habitación ${targetRoom.number} enviada. Pendiente de aprobación.`
        : 'Reseña general enviada. Pendiente de aprobación del hotel.'
    );
    setShowForm(false);
    setFormData({ rating: 5, comment: '' });
  };

  return (
    <div className="w-full">
      <div className="relative w-full h-[400px] mb-12 shadow-2xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80"
          alt="Restaurante elegante"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center space-y-3 px-4 drop-shadow-lg pt-20">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter">Reseñas de Huéspedes</h1>
          <p className="text-slate-100 font-light text-xl md:text-2xl max-w-2xl mx-auto">
            Experiencias generales y valoraciones por habitación.
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        {targetRoom && (
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-indigo-900">
            <Bed className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Está dejando una reseña para la habitación{' '}
              <strong>{targetRoom.number}</strong> — {targetRoom.name}
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-8 py-4 bg-[var(--color-primary)] text-white rounded-full font-bold hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="h-5 w-5" />
            {targetRoom ? 'Reseña de esta habitación' : 'Dejar reseña general'}
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-4">
                  {currentUser && (
                    <UserAvatar name={currentUser.name} avatarUrl={resolveUserAvatar(currentUser)} size="lg" ring />
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Nueva Reseña</h3>
                    <p className="text-sm text-slate-500">
                      {targetRoom
                        ? `Habitación ${targetRoom.number} · ${targetRoom.name}`
                        : 'Experiencia general del hotel'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block ml-1">Calificación</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className={`p-2 transition-colors ${formData.rating >= star ? 'text-yellow-400' : 'text-slate-200'}`}
                      >
                        <Star className="h-8 w-8 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block ml-1">Comentario</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                    placeholder={
                      targetRoom
                        ? `¿Cómo fue su estancia en la habitación ${targetRoom.number}?`
                        : 'Cuéntenos su experiencia general en el hotel...'
                    }
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  />
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="btn-primary flex-1 !py-4">
                    Enviar Reseña
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 !py-4">
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-5 w-5 text-slate-400" />
            <select
              className="bg-transparent text-sm font-bold text-[var(--color-primary)] focus:outline-none"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
            >
              <option value="all">Todas</option>
              <option value="general">Generales</option>
              <option value="room">Por habitación</option>
            </select>
            <span className="text-slate-300">|</span>
            <select
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'recent' | 'rating')}
            >
              <option value="recent">Más recientes</option>
              <option value="rating">Mejor puntuación</option>
            </select>
          </div>
          <div className="text-sm text-slate-500 font-medium">{sortedReviews.length} reseñas</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedReviews.map((review) => (
            <motion.div
              key={review.id}
              layout
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow space-y-6"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-400 font-medium shrink-0">{review.date}</span>
              </div>
              <span
                className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isGeneralReview(review)
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                {getReviewScopeLabel(review)}
              </span>
              <p className="text-slate-600 leading-relaxed italic">&ldquo;{review.comment}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <ReviewAvatar review={review} size="md" ring />
                <span className="font-bold text-slate-900">{review.userName}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
