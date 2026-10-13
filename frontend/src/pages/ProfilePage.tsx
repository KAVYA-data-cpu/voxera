// =========================================================
// src/pages/ProfilePage.tsx
//
// User Profile & Engineering Credentials Page.
// Allows updating name, username, bio, and avatar with clear feedback.
// =========================================================

import { useState, type FormEvent } from 'react';
import { Pencil, Check, Mail, Calendar, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UpdateProfileData } from '../types';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<UpdateProfileData>({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleEdit = () => {
    setFormData({
      name: user.name,
      username: user.username,
      bio: user.bio || '',
      avatar: user.avatar || '',
    });
    setSaveError('');
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleCancel = () => setIsEditing(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');

    try {
      await updateUser({
        name: formData.name?.trim() || undefined,
        username: formData.username?.trim().toLowerCase() || undefined,
        bio: formData.bio?.trim() || undefined,
        avatar: formData.avatar?.trim() || undefined,
      });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(axiosError?.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <User size={24} className="text-indigo-600 dark:text-indigo-400 stroke-[2.25]" />
            <span>Engineer Profile</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Personal credentials, bio, and community identity.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={handleEdit}
            className="btn-secondary self-start sm:self-auto inline-flex items-center gap-2 text-xs"
          >
            <Pencil size={14} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check size={16} />
          <span>Profile updated successfully.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {saveError}
        </div>
      )}

      {/* Profile Card View */}
      <div className="card p-6 sm:p-8 space-y-6">
        
        {/* Avatar and basic info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-indigo-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold tracking-tight shadow-md">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-900 rounded-full shadow-2xs">
              <ShieldCheck size={18} className="text-emerald-500" />
            </div>
          </div>

          <div className="text-center sm:text-left space-y-1 flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {user.name}
            </h2>
            <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
              @{user.username}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 pt-1 leading-relaxed max-w-xl">
              {user.bio || 'Additive manufacturing engineer & 3D CAD designer.'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail size={14} />
                <span>{user.email}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>Member since {new Date(user.created_at).toLocaleDateString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSave} className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                  required
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="label">Avatar Image URL</label>
              <input
                type="url"
                value={formData.avatar || ''}
                onChange={(e) => setFormData((p) => ({ ...p, avatar: e.target.value }))}
                placeholder="https://example.com/avatar.jpg"
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                placeholder="Describe your design focus (e.g. drone airframes, functional mechanical prototypes, cosplay props)..."
                className="input-field"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary text-xs"
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
