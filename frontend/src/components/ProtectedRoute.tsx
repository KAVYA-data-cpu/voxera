// =========================================================
// src/components/ProtectedRoute.tsx
//
// CONCEPT: Route guards / Protected Routes.
//
// Some pages (Dashboard, Profile, Settings) should ONLY be
// accessible to logged-in users. This component checks the
// auth state and redirects to /login if the user is not
// authenticated.
//
// <Outlet /> renders whatever nested child route matched.
// =========================================================

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While we're checking localStorage on app load, show nothing
  // to prevent a flash of the login page
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading Voxera…</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to /login, but remember where they
  // were trying to go (so we can redirect back after login)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in → render the actual page
  return <Outlet />;
}
