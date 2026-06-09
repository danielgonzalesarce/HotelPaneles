import React, { useState } from 'react';
import { resolveReviewAvatar, resolveUserAvatar } from '../utils/userAvatar';
import type { Review, User } from '../types';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: Size;
  className?: string;
  ring?: boolean;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  ring = false,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const src = avatarUrl?.trim() ? avatarUrl : resolveUserAvatar({ name, avatarUrl });
  const ringClass = ring ? 'ring-2 ring-white shadow-md' : '';

  if (failed) {
    return (
      <div
        className={`${sizeClasses[size]} ${ringClass} shrink-0 rounded-full bg-slate-900 flex items-center justify-center font-bold text-white ${className}`}
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Foto de ${name}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClasses[size]} ${ringClass} shrink-0 rounded-full object-cover bg-slate-100 ${className}`}
    />
  );
}

interface ReviewAvatarProps {
  review: Review;
  users?: User[];
  size?: Size;
  className?: string;
  ring?: boolean;
}

export function ReviewAvatar({ review, users, size = 'md', className, ring }: ReviewAvatarProps) {
  const avatarUrl = resolveReviewAvatar(review, users);
  return (
    <UserAvatar
      name={review.userName}
      avatarUrl={avatarUrl}
      size={size}
      className={className}
      ring={ring}
    />
  );
}
