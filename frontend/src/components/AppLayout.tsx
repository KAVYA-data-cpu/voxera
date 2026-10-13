// =========================================================
// src/components/AppLayout.tsx
//
// Root Layout for all authenticated pages.
// Uses a full-width horizontal top navigation bar, eliminating the
// legacy side bar to maximize productivity and workspace width.
// =========================================================

import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Horizontal Top Navigation Bar */}
      <Navbar />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Modern, unobtrusive footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 py-6 text-xs text-slate-500 dark:text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Voxera</span>
            <span>•</span>
            <span>AI-Driven 3D Design & Print Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500">
            <span>Client v0.2</span>
            <span>•</span>
            <span>System Status: Healthy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
