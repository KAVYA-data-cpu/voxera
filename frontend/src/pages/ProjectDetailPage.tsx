// =========================================================
// src/pages/ProjectDetailPage.tsx
//
// Project Workspace and Inspection Page (/projects/:id)
// Displays model metadata, CAD viewport placeholder, printability analysis,
// and complete editing capabilities.
// =========================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Trash2,
  Copy,
  Calendar,
  Clock,
  FolderKanban,
  Box,
  Sparkles,
} from 'lucide-react';
import type { Project } from '../types';
import {
  getProject,
  updateProject,
  deleteProject,
  duplicateProject,
} from '../services/projectService';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dotClass: 'bg-slate-400',
  },
  generating: {
    label: 'Generating',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    dotClass: 'bg-purple-500 animate-pulse',
  },
  processing: {
    label: 'Processing',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  ready: {
    label: 'Ready to Print',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    dotClass: 'bg-sky-500',
  },
  failed: {
    label: 'Print Failed',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing state
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const projectId = parseInt(id || '', 10);
    if (isNaN(projectId)) {
      setError('Invalid project identifier.');
      setLoading(false);
      return;
    }

    const loadProject = async () => {
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
            setError('Project not found or you do not have permission to view it.');
          } else {
            setError('Failed to fetch project details.');
          }
        } else {
          setError('Network error. Check connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id]);

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
      alert('Failed to update project name.');
    } finally {
      setSaving(false);
    }
  };

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
      alert('Failed to update description.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      navigate('/projects');
    } catch {
      alert('Failed to delete project.');
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!project) return;
    try {
      const copy = await duplicateProject(project.id);
      navigate(`/projects/${copy.id}`);
    } catch {
      alert('Failed to duplicate project.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="aspect-[21/9] bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="card text-center py-16 px-6 max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <FolderKanban size={24} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Unavailable</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{error || 'Project not found'}</p>
        <Link to="/projects" className="btn-secondary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft size={14} />
          <span>Return to My Projects</span>
        </Link>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Breadcrumb Navigation & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to All Projects</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            title="Create an exact clone of this part"
          >
            <Copy size={13} />
            <span>Duplicate</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Metadata Overview Header */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            
            {/* Project Name Editing */}
            {editingName ? (
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setEditingName(false);
                      setNameValue(project.name);
                    }
                  }}
                  className="input-field text-xl font-bold py-1.5"
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameValue(project.name);
                  }}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {project.name}
                </h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Rename"
                >
                  <Edit2 size={15} />
                </button>
              </div>
            )}

            {/* Status & Timing metadata pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border ${statusConf.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dotClass}`} />
                <span>{statusConf.label}</span>
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Calendar size={13} />
                <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono">
                <Clock size={13} />
                <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              ID: #{project.id}
            </span>
          </div>
        </div>

        {/* Project Description Editing */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          {editingDesc ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                rows={3}
                className="input-field text-sm"
                placeholder="Enter technical details, material constraints, print nozzle diameter..."
              />
              <div className="flex items-center gap-2">
                <button onClick={handleSaveDesc} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
                  {saving ? 'Saving...' : 'Save Description'}
                </button>
                <button
                  onClick={() => {
                    setEditingDesc(false);
                    setDescValue(project.description || '');
                  }}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditingDesc(true)}
              className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2 -m-2 rounded-lg transition-colors group flex items-start gap-2"
              title="Click to edit description"
            >
              <p className="flex-1 leading-relaxed">
                {project.description || 'No component description provided. Click to add design requirements, intended infill ratio, or print notes.'}
              </p>
              <Edit2 size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </div>
          )}
        </div>
      </div>

      {/* 3D CAD Interactive Viewport Placeholder */}
      <div className="card p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-900 text-white relative min-h-[440px] flex flex-col justify-between shadow-md">
        
        {/* Viewport Top Toolbar */}
        <div className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono font-medium text-slate-300">
              Interactive 3D Canvas • Three.js Engine Ready
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden sm:inline">Grid: 220 x 220 mm (Ender-3 standard)</span>
          </div>
        </div>

        {/* Center 3D Space Simulation */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
              <Box size={48} className="stroke-[1.25] animate-pulse" />
            </div>
          </div>

          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">
              3D Workspace Initialized
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Model rendering viewport is primed. Feature 3 AI Mesh Generation will render realtime STL previews and slice previews here.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Sparkles size={13} />
            <span>AI Model Generation Engine — Rolling out in Feature 3</span>
          </div>
        </div>

        {/* Viewport Bottom Slicing Indicators */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-slate-400">
          <div>
            <span className="block text-[10px] uppercase text-slate-500">Target Material</span>
            <span className="text-slate-200">PLA / PETG (1.75mm)</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-slate-500">Layer Height</span>
            <span className="text-slate-200">0.20 mm (Quality)</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-slate-500">Printability Check</span>
            <span className="text-emerald-400 font-semibold">Passed (0 Overhangs)</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-slate-500">Estimated Weight</span>
            <span className="text-slate-200">~ 42.5 grams</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${project.name}"? This action permanently removes the project and its configurations.`}
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
