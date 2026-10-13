// =========================================================
// src/pages/LoginPage.tsx
//
// Clean, professional Sign-In page for Voxera.
// =========================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Box, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const msg =
        axiosError?.response?.data?.detail ||
        'Authentication failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Logo and heading */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Box size={22} className="stroke-[2.25]" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              Voxera
            </span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white pt-2">
            Sign in to your CAD Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access your 3D design projects, slicing presets, and print history.
          </p>
        </div>

        {/* Card Form */}
        <div className="card p-6 sm:p-8 space-y-5 border-slate-200/80 dark:border-slate-800 shadow-md">
          {error && (
            <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@company.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 mt-2"
            >
              <LogIn size={16} />
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don&apos;t have an account yet?{' '}
              <Link to="/signup" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Create one now →
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="text-center flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Protected by JWT & Argon2/Bcrypt encryption</span>
        </div>
      </div>
    </div>
  );
}
