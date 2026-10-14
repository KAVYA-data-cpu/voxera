// =========================================================
// src/App.tsx
//
// Root component — sets up all Providers and the Router.
//
// CONCEPT: React Router v6 nested routes.
// - <Routes> matches URL patterns to components.
// - <Route> with element={<ProtectedRoute />} guards child routes.
// - <Outlet> in AppLayout renders the matched child page.
// =========================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Route guards and layout
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Public pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Protected pages
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ProjectsPage from './pages/ProjectsPage';
import SavedPage from './pages/SavedPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import GenerationPage from './pages/GenerationPage';

export default function App() {
  return (
    // ThemeProvider: manages light/dark/system theme globally
    <ThemeProvider>
      {/* AuthProvider: manages JWT + user state globally */}
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ---- PUBLIC ROUTES ---- */}
            {/* Anyone can visit /login and /signup */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* ---- PROTECTED ROUTES ---- */}
            {/* ProtectedRoute checks isAuthenticated.
                If false → redirects to /login.
                If true → renders <Outlet> = AppLayout */}
            <Route element={<ProtectedRoute />}>
              {/* AppLayout renders Navbar + Sidebar + <Outlet> */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/generation" element={<GenerationPage />} />
                <Route path="/saved" element={<SavedPage />} />
              </Route>
            </Route>

            {/* Root redirect: / → /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
