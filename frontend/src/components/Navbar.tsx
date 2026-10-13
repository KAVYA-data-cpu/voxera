// =========================================================
// src/components/Navbar.tsx
//
// Top navigation bar shown on all protected pages.
// Contains: Logo | Page title | Notifications | UserMenu
// =========================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Menu,
  X,
  Box,
  LayoutDashboard,
  FolderKanban,
  Bookmark,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function Navbar({ onToggleSidebar, sidebarOpen }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // User's initials for avatar fallback
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <nav className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-4 sticky top-0 z-40">
      {/* Sidebar toggle (mobile) */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors lg:hidden"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 font-bold text-brand-600 dark:text-brand-400 text-lg select-none">
        <Box size={24} />
        <span>Voxera</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Notifications Bell */}
      <div className="relative">
        <button
          onClick={() => {
            setShowNotifications((p) => !p);
            setShowUserMenu(false);
          }}
          className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {/* Unread badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {showNotifications && (
          <NotificationPanel onClose={() => setShowNotifications(false)} />
        )}
      </div>

      {/* User Avatar / Menu */}
      <div className="relative">
        <button
          onClick={() => {
            setShowUserMenu((p) => !p);
            setShowNotifications(false);
          }}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="User menu"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-brand-400"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
              {initials}
            </div>
          )}
          <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
            {user?.name}
          </span>
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="font-semibold text-sm truncate">{user?.name}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs truncate">@{user?.username}</p>
            </div>

            <div className="py-1">
              {[
                { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
                { icon: User, label: 'Profile', to: '/profile' },
                { icon: FolderKanban, label: 'My Projects', to: '/projects' },
                { icon: Bookmark, label: 'Saved', to: '/saved' },
                { icon: Settings, label: 'Settings', to: '/settings' },
              ].map(({ icon: Icon, label, to }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Icon size={16} className="text-slate-500" />
                  {label}
                </Link>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-1">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
