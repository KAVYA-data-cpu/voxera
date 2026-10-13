// =========================================================
// src/components/CreateProjectModal.tsx
//
// Controlled modal dialog for initializing new CAD projects.
// =========================================================

import { useState, useRef, useEffect } from 'react';
import { X, Plus, Sparkles, Box } from 'lucide-react';
import { createProject } from '../services/projectService';
import type { Project } from '../types';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (project: Project) => void;
}

export default function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please provide a project name.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Project name must be at least 2 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newProject = await createProject({
        name: trimmed,
        description: description.trim() || undefined,
      });
      onCreate(newProject);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Failed to initialize project.');
      } else {
        setError('Connection failure.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Box size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Initialize 3D Project
              </h2>
              <p className="text-[11px] text-slate-400">
                Setup model environment for CAD modeling & slicing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Component Name *</label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Drone Motor Mount, Ergonomic Handle..."
              maxLength={200}
              className="input-field"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
              <span>Must be distinctive within your directory</span>
              <span className="font-mono">{name.length}/200</span>
            </div>
          </div>

          <div>
            <label className="label">Technical Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify design requirements, filament material (PLA, ABS, TPU), infill density..."
              rows={3}
              maxLength={2000}
              className="input-field resize-none text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
            <Sparkles size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              Upon initialization, an interactive 3D canvas viewport will be created with default layer parameters and print bed settings.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>{isLoading ? 'Creating...' : 'Create Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
