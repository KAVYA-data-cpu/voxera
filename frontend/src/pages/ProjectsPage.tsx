// =========================================================
// src/pages/ProjectsPage.tsx
//
// FEATURE 2: Full project management page.
//
// This page implements:
// 1. Fetch all projects from the API
// 2. Create new project (via modal)
// 3. Rename project (inline in card)
// 4. Delete project (with confirmation dialog)
// 5. Duplicate project
// 6. Save/unsave project
// 7. Search by name
// 8. Filter by status
// 9. Sort (recently updated, name A-Z, etc.)
// 10. Loading state (skeleton)
// 11. Empty state (no projects)
// 12. Error state (API failure)
//
// CONCEPT: State Management
// React state = the data a component "remembers" between renders.
// useState returns [currentValue, setterFunction].
// When the setter is called, React re-renders the component.
//
// CONCEPT: Lifting state up
// When multiple components need the same data, put the state
// in the closest common ancestor (this page) and pass it down
// via props. ProjectCard doesn't manage the project list —
// it just notifies this page via callbacks.
//
// DATA FLOW:
// 1. useEffect → getProjects() → FastAPI GET /projects
// 2. Response stored in `projects` state
// 3. `filtered` = derived from `projects` using search/filter/sort
// 4. ProjectCard renders each item
// 5. User actions (delete/rename) → API call → update state locally
// =========================================================

import { useEffect, useState, useCallback } from 'react';
import {
  FolderKanban, Plus, Search, SortAsc, RefreshCw,
} from 'lucide-react';
import type { Project, ProjectStatus } from '../types';
import {
  getProjects,
  updateProject,
  deleteProject,
  duplicateProject,
  saveProject,
  unsaveProject,
} from '../services/projectService';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';
import ConfirmDialog from '../components/ConfirmDialog';

// ---- Filter / Sort options ----
type StatusFilter = ProjectStatus | 'all';
type SortKey = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Draft',      value: 'draft' },
  { label: 'Processing', value: 'processing' },
  { label: 'Ready',      value: 'ready' },
  { label: 'Completed',  value: 'completed' },
  { label: 'Failed',     value: 'failed' },
];

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Recently Updated', value: 'updated_desc' },
  { label: 'Oldest Updated',   value: 'updated_asc' },
  { label: 'Recently Created', value: 'created_desc' },
  { label: 'Name A → Z',       value: 'name_asc' },
  { label: 'Name Z → A',       value: 'name_desc' },
];

export default function ProjectsPage() {
  // ---- STATE ----
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('updated_desc');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Delete confirmation
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---- FETCH PROJECTS ----
  // CONCEPT: useCallback
  // useCallback memoizes a function so it doesn't get recreated
  // on every render. This matters here because fetchProjects is
  // used as a dependency in useEffect — without useCallback, it
  // would cause an infinite loop (render → new fetchProjects →
  // useEffect fires → fetchProjects → render → ...).
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Send search/filter/sort to the backend
      // DECISION: Backend filtering for correctness & scalability
      // The backend has DB indexes and handles arbitrary dataset sizes.
      const data = await getProjects({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort,
      });
      setProjects(data);
    } catch {
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort]);

  // Run fetchProjects when the component mounts and whenever
  // search/filter/sort changes.
  // CONCEPT: useEffect dependency array
  // The effect re-runs when any value in the array changes.
  // Empty [] = runs only once on mount.
  // [fetchProjects] = runs when fetchProjects changes (= when search/filter/sort change).
  useEffect(() => {
    // CONCEPT: Debouncing
    // Instead of hitting the API on EVERY keystroke (every letter
    // the user types), we wait 300ms after the user stops typing.
    // If they type again within 300ms, we cancel the previous timer.
    const timer = setTimeout(() => {
      fetchProjects();
    }, search ? 300 : 0); // debounce search; no debounce for filter/sort

    return () => clearTimeout(timer); // cleanup on next render
  }, [fetchProjects, search]);

  // ---- HANDLERS ----

  // Called by CreateProjectModal when a project is created
  const handleProjectCreated = (newProject: Project) => {
    // Prepend to list without refetching (optimistic UI update)
    setProjects((prev) => [newProject, ...prev]);
  };

  // Called by ProjectCard when user confirms rename
  const handleRename = async (project: Project, newName: string) => {
    try {
      const updated = await updateProject(project.id, { name: newName });
      // Update the specific project in the list
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? updated : p))
      );
    } catch {
      alert('Failed to rename project. Please try again.');
    }
  };

  // Called by ProjectCard 3-dot menu → Delete
  // Shows confirmation dialog first
  const handleDeleteRequest = (project: Project) => {
    setProjectToDelete(project);
  };

  // Called when user confirms deletion in the dialog
  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      // Remove from list
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch {
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Called by ProjectCard 3-dot menu → Duplicate
  const handleDuplicate = async (project: Project) => {
    try {
      const copy = await duplicateProject(project.id);
      setProjects((prev) => [copy, ...prev]);
    } catch {
      alert('Failed to duplicate project. Please try again.');
    }
  };

  // Called by ProjectCard 3-dot menu → Save / Unsave
  const handleToggleSave = async (project: Project) => {
    try {
      if (project.is_saved) {
        await unsaveProject(project.id);
      } else {
        await saveProject(project.id);
      }
      // Flip is_saved locally (optimistic update)
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, is_saved: !p.is_saved } : p
        )
      );
    } catch {
      alert('Failed to update saved status. Please try again.');
    }
  };

  // ---- RENDER ----
  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ---- PAGE HEADER ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban size={24} className="text-brand-500" />
            My Projects
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {loading ? 'Loading...' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Create New button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {/* ---- SEARCH + FILTER + SORT ---- */}
      <div className="flex flex-col gap-3">
        {/* Search input */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <SortAsc size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="input-field pl-9 py-2 pr-8 appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                statusFilter === value
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- ERROR STATE ---- */}
      {error && (
        <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button
            onClick={fetchProjects}
            className="flex items-center gap-2 mx-auto text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      {/* ---- LOADING STATE (Skeleton) ---- */}
      {/* CONCEPT: Skeleton loader
          Instead of a spinner (which makes the layout shift when content loads),
          a skeleton shows gray boxes in the shape of the real content.
          This gives the user a preview of the layout while data loads. */}
      {loading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* ---- EMPTY STATE ---- */}
      {!loading && !error && projects.length === 0 && (
        <div className="card text-center py-16">
          <FolderKanban size={56} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          {search || statusFilter !== 'all' ? (
            <>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No projects match your filters</p>
              <p className="text-sm text-slate-400 mt-1">Try a different search term or filter</p>
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No projects yet</p>
              <p className="text-sm text-slate-400 mt-1">Create your first project to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center gap-2 mx-auto mt-4"
              >
                <Plus size={16} />
                Create Your First Project
              </button>
            </>
          )}
        </div>
      )}

      {/* ---- PROJECT GRID ---- */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onRename={handleRename}
              onDelete={handleDeleteRequest}
              onDuplicate={handleDuplicate}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      )}

      {/* ---- CREATE PROJECT MODAL ---- */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleProjectCreated}
        />
      )}

      {/* ---- DELETE CONFIRMATION DIALOG ---- */}
      {projectToDelete && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${projectToDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          isDestructive
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
}
