// =========================================================
// src/pages/SignupPage.tsx
//
// Clean, professional Registration page for Voxera.
// =========================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Eye, EyeOff, UserPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      const msg =
        axiosError?.response?.data?.detail ||
        'Registration failed. Please check the provided information.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand header */}
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
            Create your Engineer Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Start designing and validating 3D models with intelligent AI assistance.
          </p>
        </div>

        {/* Form Card */}
        <div className="card p-6 sm:p-8 space-y-5 border-slate-200/80 dark:border-slate-800 shadow-md">
          {error && (
            <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="input-field"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="label">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="janedoe"
                className="input-field"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password (Min 8 Characters)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  autoComplete="new-password"
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
              <UserPlus size={16} />
              <span>{isLoading ? 'Creating Account...' : 'Get Started'}</span>
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Sign in here →
              </Link>
            </p>
          </div>
        </div>

        {/* Trust badge */}
        <div className="text-center flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Local SQLite & PostgreSQL security verified</span>
        </div>
      </div>
    </div>
  );
}
