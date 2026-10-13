// =========================================================
// src/components/AppLayout.tsx
//
// The shell layout for all protected pages:
// [ Navbar ]
// [ Sidebar | Page Content ]
//
// Manages sidebar open/close state.
// =========================================================

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        sidebarOpen={sidebarOpen}
      />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 relative">
        {/* Sidebar — fixed on desktop, slide-in on mobile */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area — offset by sidebar width on desktop */}
        <main className="flex-1 lg:ml-64 p-6 overflow-auto">
          {/* <Outlet /> renders the matched child route */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
