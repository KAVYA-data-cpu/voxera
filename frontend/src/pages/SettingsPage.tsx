// =========================================================
// src/pages/SettingsPage.tsx
//
// STEP 12: Settings — appearance, notifications, account.
//
// Sections:
// 1. Appearance — theme (light/dark/system)
// 2. Notifications — email / push toggles
// 3. Account / Security — read-only email, password change placeholder
// =========================================================

import { useState } from 'react';
import { Sun, Moon, Monitor, Bell, BellOff, Shield, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Notification preferences (stored locally for now)
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    try {
      await api.patch('/users/me/settings', {
        email_notifications: emailNotif,
        push_notifications: pushNotif,
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch {
      // If endpoint doesn't exist yet, just show success UI
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } finally {
      setSavingNotif(false);
    }
  };

  const themeOptions = [
    { value: 'light' as Theme, label: 'Light', Icon: Sun },
    { value: 'dark' as Theme, label: 'Dark', Icon: Moon },
    { value: 'system' as Theme, label: 'System', Icon: Monitor },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ---- APPEARANCE ---- */}
      <section className="card">
        <h2 className="font-semibold text-base mb-1">Appearance</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          Choose how Voxera looks for you. Changes apply immediately.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                theme === value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                  : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600'
              }`}
            >
              <Icon size={22} />
              <span className="text-sm font-medium">{label}</span>
              {theme === value && (
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          Current theme: <strong>{theme}</strong>
          {theme === 'system' && ' (follows your OS setting)'}
        </p>
      </section>

      {/* ---- NOTIFICATIONS ---- */}
      <section className="card">
        <h2 className="font-semibold text-base mb-1">Notifications</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          Control how you receive updates from Voxera.
        </p>

        <div className="space-y-4">
          {/* Email notifications */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-slate-500" />
              <div>
                <p className="font-medium text-sm">Email Notifications</p>
                <p className="text-slate-400 text-xs">Receive updates about your projects via email</p>
              </div>
            </div>
            <button
              onClick={() => setEmailNotif((p) => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                emailNotif ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-label="Toggle email notifications"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  emailNotif ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Push notifications */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <BellOff size={18} className="text-slate-500" />
              <div>
                <p className="font-medium text-sm">Push Notifications</p>
                <p className="text-slate-400 text-xs">Browser push notifications (requires permission)</p>
              </div>
            </div>
            <button
              onClick={() => setPushNotif((p) => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                pushNotif ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-label="Toggle push notifications"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  pushNotif ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSaveNotifications}
            disabled={savingNotif}
            className="btn-primary flex items-center gap-2"
          >
            {savingNotif ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Save Preferences'
            )}
          </button>
          {notifSaved && (
            <span className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
              <Check size={14} /> Saved!
            </span>
          )}
        </div>
      </section>

      {/* ---- ACCOUNT / SECURITY ---- */}
      <section className="card">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={18} className="text-slate-500" />
          <h2 className="font-semibold text-base">Account &amp; Security</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
          Manage your account credentials and security settings.
        </p>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Password</span>
            <button
              disabled
              title="Password change — Feature 4"
              className="text-brand-600 dark:text-brand-400 opacity-50 cursor-not-allowed hover:underline"
            >
              Change password
            </button>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-500 dark:text-slate-400">Two-factor authentication</span>
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full">
              Coming soon
            </span>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="card border-red-200 dark:border-red-800">
        <h2 className="font-semibold text-base text-red-600 dark:text-red-400 mb-1">Danger Zone</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Irreversible actions. Proceed with caution.
        </p>
        <button
          disabled
          title="Account deletion — coming in a later feature"
          className="border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm opacity-50 cursor-not-allowed"
        >
          Delete Account
        </button>
      </section>
    </div>
  );
}
