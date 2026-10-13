// =========================================================
// src/pages/SavedPage.tsx
//
// FEATURE 2: Saved (bookmarked) projects page.
//
// Changes from Feature 1:
// - Real API data instead of placeholders
// - Unsave button on each card
// - Loading/empty/error states
// - Real count from the API
//
// CONCEPT: Derived state
// The `saved` state holds SavedProject objects (each containing
// a nested `project` object). We extract just the `project`
// field to pass into ProjectCard.
//
// CONCEPT: Optimistic update
// When the user clicks "Unsave", we immediately remove it from
// the local `saved` list (optimistic) and then make the API call.
// If the API call fails, we re-fetch to restore the correct state.
// This makes the UI feel instant instead of waiting for the network.
// =========================================================

import { useEffect, useState, useCallback } from 'react';
import { Bookmark, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import ProjectCard from '../components/ProjectCard';
import { unsaveProject } from '../services/projectService';
import type { SavedProject, Project } from '../types';

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- FETCH SAVED PROJECTS ----
  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SavedProject[]>('/projects/saved');
      setSaved(res.data);
    } catch {
      setError('Failed to load saved projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  // ---- UNSAVE HANDLER ----
  // CONCEPT: Optimistic update
  // 1. Immediately remove from the list (fast feedback)
  // 2. Send DELETE /projects/{id}/save to the API
  // 3. If the API fails, re-fetch to restore correct state
  const handleUnsave = async (project: Project) => {
    // Step 1: Optimistic — remove from list instantly
    setSaved((prev) => prev.filter((s) => s.project_id !== project.id));

    try {
      // Step 2: Tell the backend to remove the bookmark
      await unsaveProject(project.id);
    } catch {
      // Step 3: API failed — re-fetch to restore correct state
      fetchSaved();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ---- HEADER ---- */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bookmark size={24} className="text-brand-500" />
          Saved Projects
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {loading
            ? 'Loading...'
            : `${saved.length} saved project${saved.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* ---- ERROR STATE ---- */}
      {error && (
        <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button
            onClick={fetchSaved}
            className="flex items-center gap-2 mx-auto text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      {/* ---- LOADING STATE (skeleton) ---- */}
      {loading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* ---- EMPTY STATE ---- */}
      {!loading && !error && saved.length === 0 && (
        <div className="card text-center py-16">
          <Bookmark size={56} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">No saved projects yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Open any project and click &ldquo;Save&rdquo; from the menu to bookmark it here.
          </p>
        </div>
      )}

      {/* ---- SAVED PROJECTS GRID ---- */}
      {/* CONCEPT: Extracting nested objects
          Each SavedProject contains a `project` field (the nested Project).
          We pass `s.project` to ProjectCard (which expects a Project).
          We override `is_saved=true` so the card always shows the
          bookmark icon as filled, even if the backend value differs.  */}
      {!loading && !error && saved.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {saved.map((s) => (
            <ProjectCard
              key={s.id}
              project={{ ...s.project, is_saved: true }}
              isSaved
              // Only show the save/unsave action (not rename/delete —
              // these might be other users' projects in future community feature)
              onToggleSave={handleUnsave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
