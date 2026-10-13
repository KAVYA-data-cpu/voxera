// =========================================================
// src/components/CreateProjectModal.tsx
//
// FEATURE 2: Modal form to create a new project.
//
// CONCEPT: Controlled Form
// In React, form inputs are "controlled" — the input's value is
// stored in React state (useState), and onChange updates that state.
// This gives React full control over what the user sees.
//
//   const [name, setName] = useState('');
//   <input value={name} onChange={(e) => setName(e.target.value)} />
//
// Compare to "uncontrolled" forms where you use refs to read values
// after submission. Controlled is the React recommended way.
//
// CONCEPT: Form submission flow
// 1. User fills form
// 2. User clicks "Create"
// 3. onSubmit fires
// 4. We call projectService.createProject()
// 5. On success: parent callback receives the new project
// 6. Modal closes
// =========================================================

import { useState, useRef, useEffect } from 'react';
import { X, Plus, FolderKanban } from 'lucide-react';
import { createProject } from '../services/projectService';
import type { Project } from '../types';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (project: Project) => void;  // called with the new project when created
}

export default function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  // ---- STATE ----
  // Each piece of form data has its own state variable.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-focus the name input when modal opens
  // useRef lets us access the actual DOM element directly.
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // ---- FORM SUBMISSION ----
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the browser's default form submit (which would reload the page)
    e.preventDefault();

    // Client-side validation (before hitting the API)
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Project name must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the API service
      const newProject = await createProject({
        name: trimmedName,
        description: description.trim() || undefined,
      });

      // Notify parent with the newly created project
      onCreate(newProject);
      onClose();
    } catch (err: unknown) {
      // CONCEPT: Error handling with Axios
      // When FastAPI returns a 4xx/5xx, Axios throws an error.
      // The error has a response.data.detail field from FastAPI.
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Failed to create project. Please try again.');
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    // ---- BACKDROP ----
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      {/* ---- MODAL BOX ---- */}
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FolderKanban size={20} className="text-brand-500" />
            <h2 className="text-lg font-semibold">New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className="label">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null); // clear error when user types
              }}
              placeholder="e.g. Drone Frame v2, Phone Stand..."
              maxLength={200}
              className="input-field"
            />
            {/* Character counter */}
            <p className="text-xs text-slate-400 mt-1 text-right">
              {name.length}/200
            </p>
          </div>

          {/* Description (optional) */}
          <div>
            <label htmlFor="project-desc" className="label">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this project is about..."
              rows={3}
              maxLength={2000}
              className="input-field resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {/* Placeholder note about 3D workspace */}
          <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            💡 A blank 3D workspace will be created. AI generation is coming in Feature 3.
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
