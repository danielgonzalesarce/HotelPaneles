import type { Review, User } from '../types';

/** Avatar generado por iniciales (usuarios locales sin foto). */
export function buildAvatarFromName(name: string): string {
  const label = encodeURIComponent(name.trim() || 'Usuario');
  return `https://ui-avatars.com/api/?name=${label}&background=0f172a&color=fff&size=128&bold=true`;
}

export function resolveUserAvatar(user?: Pick<User, 'avatarUrl' | 'name'> | null): string {
  if (user?.avatarUrl?.trim()) return user.avatarUrl.trim();
  return buildAvatarFromName(user?.name ?? 'Usuario');
}

/** Foto en reseña: guardada al publicar o resuelta desde el usuario registrado. */
export function resolveReviewAvatar(review: Review, users: User[] = []): string {
  if (review.userAvatarUrl?.trim()) return review.userAvatarUrl.trim();
  const user = users.find((u) => u.id === review.userId);
  return resolveUserAvatar(user ?? { name: review.userName });
}

export function extractGoogleAvatar(metadata: Record<string, unknown> | undefined): string | undefined {
  if (!metadata) return undefined;
  const avatar = metadata.avatar_url ?? metadata.picture;
  return typeof avatar === 'string' && avatar.trim() ? avatar.trim() : undefined;
}

/** Al crear reseña, copia la foto actual del perfil del usuario. */
export function avatarForNewReview(user: User): string {
  return resolveUserAvatar(user);
}
