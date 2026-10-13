// =========================================================
// src/components/NotificationPanel.tsx
//
// Refined Notification Panel Dropdown.
// Displays recent notifications with unread states and mark-all-read.
// =========================================================

import { useEffect, useState, useRef } from 'react';
import { Bell, CheckCheck, X, CheckCircle2, Clock } from 'lucide-react';
import api from '../lib/api';
import type { Notification } from '../types';

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    api
      .get<Notification[]>('/notifications')
      .then((res) => setNotifications(res.data))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/80 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <CheckCheck size={13} />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2">
            <CheckCircle2 size={24} className="text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              You&apos;re completely up to date
            </p>
            <p className="text-[11px] text-slate-400">
              Alerts regarding completed slicing jobs or generation runs appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 text-xs transition-colors ${
                !n.is_read
                  ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`font-semibold ${!n.is_read ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                  {n.title}
                </p>
                <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono flex items-center gap-0.5">
                  <Clock size={10} />
                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {n.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
