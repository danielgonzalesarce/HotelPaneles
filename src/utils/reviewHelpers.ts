import type { Review } from '../types';

export function isGeneralReview(review: Review): boolean {
  return !review.roomId;
}

export function isRoomReview(review: Review): boolean {
  return Boolean(review.roomId);
}

export function getGeneralReviews(reviews: Review[], approvedOnly = true): Review[] {
  return reviews.filter((r) => (!approvedOnly || r.approved) && isGeneralReview(r));
}

export function getRoomReviews(reviews: Review[], roomId: string, approvedOnly = true): Review[] {
  return reviews.filter((r) => (!approvedOnly || r.approved) && r.roomId === roomId);
}

export interface RoomReviewStats {
  count: number;
  average: number;
  label: string;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function getRoomReviewStats(reviews: Review[]): RoomReviewStats {
  const distribution: RoomReviewStats['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (reviews.length === 0) {
    return { count: 0, average: 0, label: 'Sin valoraciones', distribution };
  }

  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] += 1;
  });

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const rounded = Math.round(average * 10) / 10;

  let label = 'Satisfactorio';
  if (rounded >= 4.5) label = 'Excelente';
  else if (rounded >= 4) label = 'Muy satisfactorio';
  else if (rounded >= 3) label = 'Satisfactorio';
  else if (rounded >= 2) label = 'Regular';
  else label = 'Mejorable';

  return { count: reviews.length, average: rounded, label, distribution };
}

export function getReviewScopeLabel(review: Review): string {
  if (isGeneralReview(review)) return 'Experiencia general';
  return review.roomNumber ? `Hab. ${review.roomNumber}` : 'Habitación';
}
