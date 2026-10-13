// =========================================================
// src/components/ProfileCard.tsx
//
// Displays user avatar, name, username and bio.
// Used on Profile page and Dashboard sidebar widget.
// =========================================================

import { MapPin, Calendar } from 'lucide-react';
import type { User } from '../types';

interface Props {
  user: User;
  compact?: boolean; // smaller version for dashboard widget
}

export default function ProfileCard({ user, compact }: Props) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const joinedDate = new Date(user.created_at).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-brand-400"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{user.name}</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs truncate">@{user.username}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card text-center">
      {/* Avatar */}
      <div className="flex justify-center mb-4">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-brand-400"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-2xl">
            {initials}
          </div>
        )}
      </div>

      {/* Info */}
      <h2 className="font-bold text-lg">{user.name}</h2>
      <p className="text-brand-500 dark:text-brand-400 text-sm">@{user.username}</p>

      {user.bio && (
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-3 leading-relaxed">
          {user.bio}
        </p>
      )}

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {user.email}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          Joined {joinedDate}
        </span>
      </div>
    </div>
  );
}
