// =========================================================
// src/components/NotificationPanel.tsx
//
// Dropdown panel showing recent notifications.
// Fetches from GET /notifications on the backend.
// Falls back to placeholder data if the API isn't ready.
// =========================================================

import { useEffect, useState, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import api from '../lib/api';
import type { Notification } from '../types';

// Placeholder data shown while loading or if API returns nothing
const PLACEHOLDER_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    user_id: 0,
    title: 'Welcome to Voxera!',
    message: 'Your account is set up. Start by creating your first 3D project.',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: 0,
    title: 'Feature 1 Complete',
    message: 'User & Account System is live. More features coming soon!',
    is_read: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel if user clicks outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Fetch notifications from backend
  useEffect(() => {
    api
      .get<Notification[]>('/notifications')
      .then((res) => setNotifications(res.data))
      .catch(() => setNotifications(PLACEHOLDER_NOTIFICATIONS))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    // In a real app you'd also call PATCH /notifications/mark-all-read
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-brand-500" />
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-brand-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              title="Mark all as read"
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            >
              <CheckCheck size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-400 text-sm gap-2">
            <Bell size={32} className="opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                !n.is_read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${!n.is_read ? 'text-brand-700 dark:text-brand-300' : ''}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 bg-brand-500 rounded-full mt-1 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
