import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Review } from '../types';
import { AppModal } from './ui/Modal';
import { ROUTES } from '../routes/paths';
import { ReviewAvatar } from './UserAvatar';

interface GuestReviewsMarqueeProps {
  reviews: Review[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 mb-3" aria-label={`${rating} de 5 estrellas`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onExpand,
}: {
  review: Review;
  onExpand: (review: Review) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onExpand(review)}
      className="group/card mx-3 w-[300px] shrink-0 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:scale-[1.05] hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:w-[340px] md:w-[380px]"
    >
      <StarRating rating={review.rating} />
      <p className="mb-5 line-clamp-3 text-sm italic leading-relaxed text-slate-600 group-hover/card:text-slate-800">
        &ldquo;{review.comment}&rdquo;
      </p>
      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <ReviewAvatar review={review} size="md" ring />
        <div className="min-w-0 flex-1">
          <span className="block truncate font-bold text-slate-900">{review.userName}</span>
          <span className="text-xs text-slate-400">{review.date}</span>
        </div>
      </div>
      <span className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-indigo-500 opacity-0 transition-opacity group-hover/card:opacity-100">
        Clic para expandir
      </span>
    </button>
  );
}

function MarqueeTrack({
  reviews,
  direction,
  onExpand,
}: {
  reviews: Review[];
  direction: 'left' | 'right';
  onExpand: (review: Review) => void;
}) {
  const loop = useMemo(() => [...reviews, ...reviews], [reviews]);
  const duration = Math.max(reviews.length * 7, 28);

  if (reviews.length === 0) return null;

  return (
    <div
      className={`flex w-max ${direction === 'left' ? 'animate-reviews-marquee-left' : 'animate-reviews-marquee-right'}`}
      style={{ animationDuration: `${duration}s` }}
    >
      {loop.map((review, index) => (
        <ReviewCard
          key={`${review.id}-${index}`}
          review={review}
          onExpand={onExpand}
        />
      ))}
    </div>
  );
}

export default function GuestReviewsMarquee({ reviews }: GuestReviewsMarqueeProps) {
  const [expanded, setExpanded] = useState<Review | null>(null);

  const { rowA, rowB } = useMemo(() => {
    const rowA = reviews.filter((_, i) => i % 2 === 0);
    const rowB = reviews.filter((_, i) => i % 2 === 1);
    return { rowA, rowB };
  }, [reviews]);

  if (reviews.length === 0) {
    return (
      <p className="text-center text-slate-500">
        Aún no hay reseñas publicadas.
      </p>
    );
  }

  return (
    <>
      <div className="relative space-y-6">
        {/* Degradados laterales */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-20" />

        <div className="overflow-hidden py-1">
          <MarqueeTrack reviews={rowA} direction="left" onExpand={setExpanded} />
        </div>
        <div className="overflow-hidden py-1">
          <MarqueeTrack reviews={rowB.length > 0 ? rowB : rowA} direction="right" onExpand={setExpanded} />
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link
          to={ROUTES.reviews}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
        >
          Ver todas las reseñas ({reviews.length})
        </Link>
      </div>

      <AppModal
        open={expanded !== null}
        onClose={() => setExpanded(null)}
        title={expanded?.userName ?? ''}
        subtitle={expanded ? `Reseña del ${expanded.date}` : undefined}
        size="md"
      >
        {expanded && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ReviewAvatar review={expanded} size="lg" ring />
              <div>
                <p className="font-bold text-slate-900">{expanded.userName}</p>
                <p className="text-sm text-slate-500">{expanded.date}</p>
              </div>
            </div>
            <StarRating rating={expanded.rating} />
            <p className="text-base italic leading-relaxed text-slate-700">
              &ldquo;{expanded.comment}&rdquo;
            </p>
            <p className="text-sm text-slate-500">
              Huésped verificado · {expanded.rating}/5 estrellas
            </p>
          </div>
        )}
      </AppModal>
    </>
  );
}
