// =========================================================
// src/pages/LoginPage.tsx
//
// STEP 8: Login UI
//
// CONCEPT: Controlled forms in React.
// - useState tracks each input field's value.
// - onSubmit calls the login() function from AuthContext.
// - Error messages shown using try/catch on the API call.
// - On success, redirect to dashboard (or where they came from).
// =========================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Box, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target: where the user tried to go before being redirected to login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // Prevent page reload (default form behavior)
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      // Redirect to original destination or dashboard
      navigate(from, { replace: true });
    } catch (err: unknown) {
      // Extract the error message from the API response
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const msg =
        axiosError?.response?.data?.detail ||
        'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 dark:from-slate-950 dark:to-brand-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 text-2xl font-bold mb-2">
            <Box size={32} />
            Voxera
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            AI 3D Print Assistant
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <h1 className="text-xl font-bold mb-1">Welcome back</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Sign in to your Voxera account
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
