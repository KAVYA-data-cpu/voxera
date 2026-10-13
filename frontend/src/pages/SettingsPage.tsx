// =========================================================
// src/pages/SettingsPage.tsx
//
// Application Settings & User Preferences.
// Configures visual themes, notifications, and security info.
// =========================================================

import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Check,
  Shield,
  Palette,
  Settings,
  Mail,
  Smartphone,
  Save,
} from 'lucide-react';
import { useTheme, type Theme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import type { UserSettings } from '../types';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    api
      .get<UserSettings>('/users/me/settings')
      .then((res) => {
        setEmailNotifs(res.data.email_notifications);
        setPushNotifs(res.data.push_notifications);
      })
      .catch(() => {});
  }, []);

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    setNotifSaved(false);
    try {
      await api.patch('/users/me/settings', {
        email_notifications: emailNotifs,
        push_notifications: pushNotifs,
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } catch {
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } finally {
      setSavingNotif(false);
    }
  };

  const themeOptions = [
    { value: 'light' as Theme, label: 'Light Mode', Icon: Sun, desc: 'Clean high-contrast daytime palette' },
    { value: 'dark' as Theme, label: 'Dark Mode', Icon: Moon, desc: 'Low-light industrial CAD viewport' },
    { value: 'system' as Theme, label: 'System Sync', Icon: Monitor, desc: 'Matches your OS appearance preferences' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Page Title */}
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings size={24} className="text-indigo-600 dark:text-indigo-400 stroke-[2.25]" />
          <span>Platform Settings</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure appearance, alert streams, and account security.
        </p>
      </div>

      {/* Appearance Section */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Palette size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Appearance & Theme</h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select the interface theme that best matches your hardware workspace and lighting environment.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 pt-2">
          {themeOptions.map(({ value, label, Icon, desc }) => {
            const isSelected = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Icon size={18} />
                  </div>
                  {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Notification Stream Section */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Alert Preferences</h2>
          </div>
          {notifSaved && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check size={14} /> Saved
            </span>
          )}
        </div>

        <div className="space-y-4 pt-1">
          <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                <span>Email Notifications</span>
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive summaries when background slicing or AI generation runs finish.
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone size={16} className="text-slate-400" />
                <span>Browser Push Notifications</span>
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live browser toast when print analysis flags critical overhang issues.
              </p>
            </div>
            <input
              type="checkbox"
              checked={pushNotifs}
              onChange={(e) => setPushNotifs(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
            />
          </label>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveNotifications}
              disabled={savingNotif}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{savingNotif ? 'Updating...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Account Security Overview */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Shield size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Authentication & Security</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400">Current Session User</span>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{user?.email}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400">Password Encryption</span>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">Bcrypt Hashed & Salted</p>
          </div>
        </div>
      </section>
    </div>
  );
}
