// =========================================================
// src/pages/SavedPage.tsx
//
// Curated Bookmarks & Saved Projects Directory.
// Allows users to manage bookmarked parts with optimistic unsave.
// =========================================================

import { useEffect, useState, useCallback } from 'react';
import { Bookmark, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import ProjectCard from '../components/ProjectCard';
import { unsaveProject } from '../services/projectService';
import type { SavedProject, Project } from '../types';

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SavedProject[]>('/projects/saved');
      setSaved(res.data);
    } catch {
      setError('Unable to fetch saved projects. Please retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleUnsave = async (project: Project) => {
    setSaved((prev) => prev.filter((s) => s.project_id !== project.id));
    try {
      await unsaveProject(project.id);
    } catch {
      fetchSaved();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bookmark size={24} className="text-amber-500 stroke-[2.25] fill-amber-500/20" />
            <span>Saved Projects</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bookmarked community components, reference CAD geometries, and saved templates.
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 self-start sm:self-auto">
          {saved.length} {saved.length === 1 ? 'Bookmark' : 'Bookmarks'}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-2">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={fetchSaved}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-0 overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && saved.length === 0 && (
        <div className="card text-center py-16 px-6 border-dashed border-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 mx-auto flex items-center justify-center mb-3">
            <Bookmark size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No saved projects yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            When you find a model or community part you want to reference later, click &quot;Save&quot; on its project card.
          </p>
          <Link to="/projects" className="btn-secondary inline-flex items-center gap-2 text-xs">
            <span>Browse My Projects</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Saved Projects Grid */}
      {!loading && !error && saved.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {saved.map((s) => (
            <ProjectCard
              key={s.id}
              project={{ ...s.project, is_saved: true }}
              isSaved
              onToggleSave={handleUnsave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
