// =========================================================
// src/pages/ProjectDetailPage.tsx
//
// FEATURE 2: Project workspace page (/projects/:id)
//
// This is a PLACEHOLDER workspace. In Feature 3+, this page
// will contain the actual 3D design studio with AI generation.
//
// For now it shows:
// - Project info (name, status, description, dates)
// - A "workspace" placeholder area (the future 3D viewport)
// - Edit name / description inline
// - Quick actions (delete, duplicate, back)
//
// CONCEPT: Dynamic Routes
// In App.tsx we define: <Route path="/projects/:id" element={...} />
// The ":id" part is a URL parameter. When the user goes to
// /projects/42, React Router sets params.id = "42".
// We read it with the useParams() hook.
//
// CONCEPT: useParams()
// const { id } = useParams();
// id is always a STRING from the URL, even if it looks like a number.
// We must convert it: parseInt(id!) → 42 (number)
//
// CONCEPT: useEffect for data fetching
// We fetch the project data when the component mounts ([] dependency).
// If the ID changes (user navigates to /projects/43), the effect
// re-runs because we include `id` in the dependency array.
// =========================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Check, X, Trash2, Copy,
  Cpu, Calendar, Clock, FolderKanban,
} from 'lucide-react';
import type { Project } from '../types';
import {
  getProject,
  updateProject,
  deleteProject,
  duplicateProject,
} from '../services/projectService';
import ConfirmDialog from '../components/ConfirmDialog';

// Status color config (same logic as ProjectCard, centralized in types ideally)
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:      { label: 'Draft',      className: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
  generating: { label: 'Generating', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  processing: { label: 'Processing', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  ready:      { label: 'Ready',      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  completed:  { label: 'Completed',  className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  failed:     { label: 'Failed',     className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

export default function ProjectDetailPage() {
  // ---- URL PARAMETER ----
  // useParams() reads the :id from the URL /projects/:id
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ---- STATE ----
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline edit state
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---- FETCH PROJECT ----
  useEffect(() => {
    const projectId = parseInt(id!, 10);

    // Validate the ID is a real number
    if (isNaN(projectId)) {
      setError('Invalid project ID');
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProject(projectId);
        setProject(data);
        setNameValue(data.name);
        setDescValue(data.description || '');
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number } };
          if (axiosErr.response?.status === 404) {
            setError('Project not found or you do not have access to it.');
          } else if (axiosErr.response?.status === 403) {
            setError('You do not have permission to view this project.');
          } else {
            setError('Failed to load project.');
          }
        } else {
          setError('Network error. Check your connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]); // re-run if ID changes

  // ---- SAVE NAME ----
  const handleSaveName = async () => {
    if (!project || !nameValue.trim() || nameValue.trim() === project.name) {
      setEditingName(false);
      setNameValue(project?.name || '');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProject(project.id, { name: nameValue.trim() });
      setProject(updated);
      setNameValue(updated.name);
      setEditingName(false);
    } catch {
      alert('Failed to rename. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- SAVE DESCRIPTION ----
  const handleSaveDesc = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const updated = await updateProject(project.id, {
        description: descValue.trim() || undefined,
      });
      setProject(updated);
      setEditingDesc(false);
    } catch {
      alert('Failed to update description. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- DELETE ----
  const handleDeleteConfirm = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      navigate('/projects'); // go back to list
    } catch {
      alert('Failed to delete project.');
      setIsDeleting(false);
    }
  };

  // ---- DUPLICATE ----
  const handleDuplicate = async () => {
    if (!project) return;
    try {
      const copy = await duplicateProject(project.id);
      navigate(`/projects/${copy.id}`); // navigate to the copy
    } catch {
      alert('Failed to duplicate project.');
    }
  };

  // ---- LOADING STATE ----
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
    );
  }

  // ---- ERROR STATE ----
  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="card text-center py-16">
          <FolderKanban size={56} className="text-red-300 dark:text-red-600 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">{error}</p>
          <Link to="/projects" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
            ← Back to My Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const statusConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ---- BREADCRUMB + ACTIONS ---- */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Back link */}
        <Link
          to="/projects"
          className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <ArrowLeft size={16} />
          My Projects
        </Link>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            className="btn-secondary flex items-center gap-2 text-sm py-1.5 px-3"
            title="Duplicate this project"
          >
            <Copy size={14} />
            Duplicate
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm py-1.5 px-3 font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
            title="Delete this project"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* ---- PROJECT HEADER ---- */}
      <div className="card">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Project icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/40 dark:to-brand-800/40 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
            🎲
          </div>

          <div className="flex-1 min-w-0">
            {/* Inline editable name */}
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') { setEditingName(false); setNameValue(project.name); }
                  }}
                  maxLength={200}
                  className="input-field text-xl font-bold py-1"
                />
                <button onClick={handleSaveName} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                  <Check size={18} />
                </button>
                <button onClick={() => { setEditingName(false); setNameValue(project.name); }} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold truncate">{project.name}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Rename project"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}

            {/* Status + dates */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.className}`}>
                {statusConf.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar size={12} />
                Created {new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock size={12} />
                Updated {new Date(project.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Inline editable description */}
            <div className="mt-3">
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="input-field resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveDesc} disabled={saving} className="btn-primary text-sm py-1 px-3">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingDesc(false); setDescValue(project.description || ''); }} className="btn-secondary text-sm py-1 px-3">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors group flex items-start gap-1"
                  onClick={() => setEditingDesc(true)}
                  title="Click to edit description"
                >
                  <span>{project.description || 'Add a description...'}</span>
                  <Edit2 size={12} className="opacity-0 group-hover:opacity-100 mt-0.5 flex-shrink-0 transition-opacity" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- WORKSPACE PLACEHOLDER ---- */}
      {/* This will become the 3D design studio in Feature 3+ */}
      <div className="card min-h-[400px] flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 to-brand-50/30 dark:from-slate-800 dark:to-brand-900/10 border-dashed">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/40 dark:to-brand-800/40 flex items-center justify-center">
          <Cpu size={40} className="text-brand-500" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold mb-2">Your 3D Workspace is Ready</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
            AI-powered 3D design generation is coming in Feature 3.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            For now, you can manage your project's metadata using the panel above.
          </p>
        </div>
        <span className="text-xs bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 px-3 py-1 rounded-full font-medium">
          AI Design Studio — Coming Soon
        </span>
      </div>

      {/* ---- DELETE CONFIRMATION ---- */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to permanently delete "${project.name}"? This cannot be undone.`}
          confirmLabel="Delete Project"
          isDestructive
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
