import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquarePlus } from 'lucide-react';
import type { Review, Room } from '../types';
import { getRoomReviewStats, getRoomReviews } from '../utils/reviewHelpers';
import { ReviewAvatar } from './UserAvatar';
import { ROUTES } from '../routes/paths';

interface RoomReviewsSectionProps {
  room: Room;
  allReviews: Review[];
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className="flex gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconClass} ${
            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function RoomReviewsSection({ room, allReviews }: RoomReviewsSectionProps) {
  const roomReviews = useMemo(
    () =>
      getRoomReviews(allReviews, room.id).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [allReviews, room.id]
  );
  const stats = useMemo(() => getRoomReviewStats(roomReviews), [roomReviews]);

  return (
    <section className="mt-20 border-t border-slate-100 pt-16">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">
            Satisfacción del huésped
          </p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Reseñas de la habitación {room.number}
          </h2>
          <p className="text-slate-500 mt-2">
            Opiniones verificadas sobre {room.name}
          </p>
        </div>
        <Link
          to={`${ROUTES.reviews}?roomId=${room.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Dejar reseña de esta habitación
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Valoración media</p>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-5xl font-extrabold text-slate-900">{stats.average || '—'}</span>
            <span className="text-slate-400 pb-2">/ 5</span>
          </div>
          {stats.count > 0 && <StarRow rating={Math.round(stats.average)} size="md" />}
          <p className="mt-4 text-lg font-semibold text-indigo-700">{stats.label}</p>
          <p className="text-sm text-slate-500 mt-1">
            {stats.count} {stats.count === 1 ? 'reseña' : 'reseñas'}
          </p>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-4">Distribución por estrellas</p>
          <div className="space-y-3">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = stats.distribution[star];
              const pct = stats.count ? Math.round((count / stats.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-semibold text-slate-600">{star}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {roomReviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-slate-600 font-medium">Aún no hay reseñas para esta habitación.</p>
          <p className="text-sm text-slate-400 mt-2">Sea el primero en compartir su experiencia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roomReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <ReviewAvatar review={review} size="md" ring />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{review.userName}</p>
                    <p className="text-xs text-slate-400">{review.date}</p>
                  </div>
                </div>
                <StarRow rating={review.rating} />
              </div>
              <p className="text-slate-600 italic leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
