// =========================================================
// src/components/Sidebar.tsx
//
// Left sidebar navigation for protected pages.
// Highlights the active route using NavLink.
// =========================================================

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Bookmark,
  User,
  Settings,
  Box,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: FolderKanban, label: 'My Projects', to: '/projects' },
  { icon: Bookmark, label: 'Saved', to: '/saved' },
  { icon: User, label: 'Profile', to: '/profile' },
  { icon: Settings, label: 'Settings', to: '/settings' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 w-64 bg-white dark:bg-slate-800
          border-r border-slate-200 dark:border-slate-700
          z-30 flex flex-col
          transition-transform duration-300
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* App identity */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
            <Box size={20} />
            <span className="font-bold text-sm">AI 3D Print Assistant</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Final Year Project</p>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Placeholder for future AI features */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="px-3 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Coming Soon
            </p>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed select-none">
              <Cpu size={18} />
              AI Design Studio
            </div>
          </div>
        </nav>

        {/* Version footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            Voxera v0.2.0 — Feature 2
          </p>
        </div>
      </aside>
    </>
  );
}
