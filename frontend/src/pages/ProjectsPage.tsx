// =========================================================
// src/pages/ProjectsPage.tsx
//
// Full Project Management & Directory View.
// Provides search debouncing, status category pills, sorting options,
// creation trigger, and list/grid layout with complete CRUD capabilities.
// =========================================================

import { useEffect, useState, useCallback } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  SortAsc,
  RefreshCw,
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

type StatusFilter = ProjectStatus | 'all';
type SortKey = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All Projects', value: 'all' },
  { label: 'Ready to Print', value: 'ready' },
  { label: 'Draft', value: 'draft' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Recently Updated', value: 'updated_desc' },
  { label: 'Oldest Updated', value: 'updated_asc' },
  { label: 'Recently Created', value: 'created_desc' },
  { label: 'Name (A → Z)', value: 'name_asc' },
  { label: 'Name (Z → A)', value: 'name_desc' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('updated_desc');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort,
      });
      setProjects(data);
    } catch {
      setError('Unable to retrieve project database. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchProjects, search]);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleRename = async (project: Project, newName: string) => {
    try {
      const updated = await updateProject(project.id, { name: newName });
      setProjects((prev) => prev.map((p) => (p.id === project.id ? updated : p)));
    } catch {
      alert('Failed to rename project.');
    }
  };

  const handleDeleteRequest = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch {
      alert('Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (project: Project) => {
    try {
      const copy = await duplicateProject(project.id);
      setProjects((prev) => [copy, ...prev]);
    } catch {
      alert('Failed to duplicate project.');
    }
  };

  const handleToggleSave = async (project: Project) => {
    try {
      if (project.is_saved) {
        await unsaveProject(project.id);
      } else {
        await saveProject(project.id);
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, is_saved: !p.is_saved } : p))
      );
    } catch {
      alert('Failed to update bookmark.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderKanban size={24} className="text-indigo-600 dark:text-indigo-400 stroke-[2.25]" />
            <span>My Projects</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your CAD models, print configurations, and generative iterations.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary self-start sm:self-auto inline-flex items-center gap-2"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>New 3D Project</span>
        </button>
      </div>

      {/* Control Bar: Search + Filter + Sort */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by part name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === value
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="relative min-w-[180px]">
          <SortAsc size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input-field pl-9.5 pr-8 text-xs font-medium cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-2">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={fetchProjects}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            <RefreshCw size={13} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-0 overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3 pt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <div className="card text-center py-16 px-6 border-dashed border-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <FolderKanban size={24} />
          </div>
          {search || statusFilter !== 'all' ? (
            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No matching projects found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try adjusting your search query or reset the status filters to view all components.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="btn-secondary text-xs mt-3 inline-flex items-center gap-1.5"
              >
                <span>Reset all filters</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No 3D projects created yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Initialize your workspace by creating your first 3D model component.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Create New Project</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid of Project Cards */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleProjectCreated}
        />
      )}

      {projectToDelete && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to permanently delete "${projectToDelete.name}"? This will delete all slicing metadata and references.`}
          confirmLabel="Delete Project"
          isDestructive
          isLoading={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
}
