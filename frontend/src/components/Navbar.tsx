// =========================================================
// src/components/Navbar.tsx
//
// Horizontal Top Navigation Bar for Voxera.
// Contains:
// - Left: Brand identity (Logo + name + status pill)
// - Center: Horizontal primary feature navigation with active states
// - Right: Global utility controls (Quick Action, Notifications, Theme, User Profile)
// =========================================================

import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  LayoutDashboard,
  FolderKanban,
  Bookmark,
  User,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';
import CreateProjectModal from './CreateProjectModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close mobile menu whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Projects', to: '/projects', icon: FolderKanban },
    { label: 'Saved', to: '/saved', icon: Bookmark },
    { label: 'Profile', to: '/profile', icon: User },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* ================= LEFT: Brand Identity ================= */}
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="group flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1 -m-1"
                aria-label="Voxera home"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <Box size={20} className="stroke-[2.25]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                      Voxera
                    </span>
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                      v0.2
                    </span>
                  </div>
                  <span className="hidden md:block text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-1">
                    AI 3D Print Studio
                  </span>
                </div>
              </Link>
            </div>

            {/* ================= CENTER: Horizontal Top Navigation ================= */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" aria-label="Main navigation">
              {navItems.map(({ label, to, icon: Icon }) => {
                const isActive =
                  to === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(to);

                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon
                      size={16}
                      className={isActive ? 'text-indigo-600 dark:text-indigo-400 stroke-[2.25]' : 'text-slate-400 dark:text-slate-500'}
                    />
                    <span>{label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* ================= RIGHT: Utilities & Profile ================= */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              
              {/* Quick Action: New Project CTA */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition-colors shadow-2xs"
                title="Create a new 3D project"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>New Project</span>
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-0.5" />

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications((p) => !p);
                    setShowUserMenu(false);
                  }}
                  className={`relative p-2 rounded-lg transition-colors ${
                    showNotifications
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  aria-label="View notifications"
                >
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full ring-2 ring-white dark:ring-slate-900" />
                </button>

                {showNotifications && (
                  <NotificationPanel onClose={() => setShowNotifications(false)} />
                )}
              </div>

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    setShowUserMenu((p) => !p);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-2 p-1 pl-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Open user menu"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold tracking-tight">
                      {initials}
                    </div>
                  )}
                  <span className="hidden lg:block text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate text-left">
                    {user?.name || 'Account'}
                  </span>
                  <ChevronDown size={14} className="text-slate-400 hidden lg:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        @{user?.username} • {user?.email}
                      </p>
                    </div>

                    {/* Navigation Items */}
                    <div className="p-1 space-y-0.5">
                      {navItems.map(({ label, to, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setShowUserMenu(false)}
                          className="menu-item"
                        >
                          <Icon size={16} className="text-slate-400" />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-slate-100 dark:border-slate-800 p-1 mt-1">
                      <button
                        onClick={handleLogout}
                        className="menu-item text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <LogOut size={16} />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu hamburger button */}
              <button
                onClick={() => setMobileMenuOpen((p) => !p)}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* ================= MOBILE EXPANDABLE MENU ================= */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 space-y-1">
            <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowCreateModal(true);
                }}
                className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>New 3D Project</span>
              </button>
            </div>

            {navItems.map(({ label, to, icon: Icon }) => {
              const isActive =
                to === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(to);

              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      {/* Quick Create Project Modal Accessible from Navbar */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(newProject) => {
            navigate(`/projects/${newProject.id}`);
          }}
        />
      )}
    </>
  );
}
