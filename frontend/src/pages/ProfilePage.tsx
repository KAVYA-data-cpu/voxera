// =========================================================
// src/pages/ProfilePage.tsx
//
// STEP 11: User Profile — view and edit profile.
//
// Two modes:
// - View mode: shows avatar, name, username, bio, email
// - Edit mode: form to update name, username, bio, avatar URL
//
// Calls PATCH /users/me via updateUser() from AuthContext.
// =========================================================

import { useState, type FormEvent } from 'react';
import { Camera, Pencil, X, Check, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UpdateProfileData } from '../types';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state — pre-filled with current user data
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
    // Reset form to current values before opening edit mode
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
    setSaveSuccess(false);
    try {
      await updateUser(formData);
      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(axiosError?.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const joinedDate = new Date(user.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Profile Card */}
      <div className="card">
        {!isEditing ? (
          /* ---- VIEW MODE ---- */
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-brand-400"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-3xl">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-xl font-bold">{user.name}</h2>
                  <p className="text-brand-500 dark:text-brand-400">@{user.username}</p>
                </div>
                <button onClick={handleEdit} className="btn-secondary flex items-center gap-2 self-center sm:self-auto">
                  <Pencil size={16} />
                  Edit Profile
                </button>
              </div>

              {user.bio ? (
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">
                  {user.bio}
                </p>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 text-sm mb-4 italic">
                  No bio added yet. Click Edit Profile to add one.
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} />
                  {user.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  Joined {joinedDate}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ---- EDIT MODE ---- */
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">Edit Profile</h2>
              <button type="button" onClick={handleCancel} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
                <Check size={16} /> Profile updated successfully!
              </div>
            )}

            {/* Avatar URL */}
            <div>
              <label className="label flex items-center gap-2">
                <Camera size={14} /> Avatar URL
              </label>
              <input
                type="url"
                value={formData.avatar || ''}
                onChange={(e) => setFormData((p) => ({ ...p, avatar: e.target.value }))}
                className="input-field"
                placeholder="https://example.com/avatar.jpg"
              />
              <p className="text-xs text-slate-400 mt-1">Paste a direct image URL (JPG, PNG, WebP)</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="input-field"
              />
            </div>

            {/* Username */}
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                <input
                  type="text"
                  required
                  value={formData.username || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value.toLowerCase() }))}
                  className="input-field pl-7"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="label">Bio</label>
              <textarea
                rows={3}
                value={formData.bio || ''}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                className="input-field resize-none"
                placeholder="Tell the community about yourself and your 3D printing interests..."
                maxLength={300}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">
                {(formData.bio || '').length}/300
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account info (read-only) */}
      <div className="card">
        <h3 className="font-semibold mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">User ID</span>
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">#{user.id}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500 dark:text-slate-400">Member since</span>
            <span className="font-medium">{joinedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
