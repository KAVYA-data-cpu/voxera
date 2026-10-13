// =========================================================
// src/pages/DashboardPage.tsx
//
// Modern, professionally engineered dashboard for Voxera.
// Features:
// - Professional Hero & Status banner with quick launch
// - Key workspace operational metrics
// - Recent projects gallery with stateful cards
// - Saved items preview
// - System announcements & activity stream
// =========================================================

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  FolderKanban,
  Bookmark,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Clock,
  Printer,
  ChevronRight,
  HardDriveDownload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../lib/api';
import type { Project, Notification, SavedProject } from '../types';
import {
  updateProject,
  deleteProject,
  duplicateProject,
  saveProject,
  unsaveProject,
  getProjects,
} from '../services/projectService';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Dialog state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Engineer';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, notifRes, savedRes] = await Promise.all([
        getProjects({ sort: 'updated_desc' }),
        api.get<Notification[]>('/notifications'),
        api.get<SavedProject[]>('/projects/saved'),
      ]);
      setProjects(projData);
      setNotifications(notifRes.data);
      setSavedProjects(savedRes.data);
    } catch {
      setProjects([]);
      setNotifications([]);
      setSavedProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Project Actions
  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    navigate(`/projects/${newProject.id}`);
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
        setSavedProjects((prev) => prev.filter((s) => s.project_id !== project.id));
      } else {
        await saveProject(project.id);
        setSavedProjects((prev) => [
          {
            id: Date.now(),
            user_id: user?.id || 0,
            project_id: project.id,
            project,
            saved_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, is_saved: !p.is_saved } : p))
      );
    } catch {
      alert('Failed to update bookmark.');
    }
  };

  const readyCount = projects.filter((p) => p.status === 'ready' || p.status === 'completed').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* ================= HERO & WELCOME BANNER ================= */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-6 sm:p-8 md:p-10 shadow-lg">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Sparkles size={13} className="text-indigo-400" />
              <span>AI 3D CAD & Print Assistant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Design, analyze printability, and slice complex parts for additive manufacturing with automated AI validation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Create New Model</span>
            </button>
            <Link
              to="/projects"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <span>Explore Projects</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Quick Capabilities Highlights Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-indigo-400" />
            <span>FDM & SLA Slicing Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-indigo-400" />
            <span>Overhang & Wall Validation</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-indigo-400" />
            <span>Geometric AI Infill Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDriveDownload size={16} className="text-indigo-400" />
            <span>STL / OBJ / 3MF Support</span>
          </div>
        </div>
      </section>

      {/* ================= WORKSPACE METRICS ================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          {
            label: 'Total Models',
            value: loading ? '-' : projects.length,
            desc: 'Stored in your CAD cloud',
            icon: FolderKanban,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-950/40',
          },
          {
            label: 'Print-Ready',
            value: loading ? '-' : readyCount,
            desc: 'Validated geometry & sliced',
            icon: TrendingUp,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          },
          {
            label: 'Saved & Bookmarked',
            value: loading ? '-' : savedProjects.length,
            desc: 'Curated references',
            icon: Bookmark,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
          },
          {
            label: 'Pending Inquiries',
            value: loading ? '-' : notifications.filter((n) => !n.is_read).length,
            desc: 'Unread alerts & notifications',
            icon: Clock,
            color: 'text-sky-600 dark:text-sky-400',
            bg: 'bg-sky-50 dark:bg-sky-950/40',
          },
        ].map((item) => (
          <div key={item.label} className="card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white">
                  {item.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                <item.icon size={20} />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      {/* ================= MAIN CONTENT SPLIT ================= */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* LEFT 2/3: Recent Projects Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Recent Projects</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {projects.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active components in your current workspace
              </p>
            </div>
            <Link
              to="/projects"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1"
            >
              <span>View all projects</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-5 animate-pulse space-y-3">
                  <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="card text-center py-14 px-6 border-dashed border-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                <FolderKanban size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No 3D projects created yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                Start your additive manufacturing workflow by creating your first project workspace.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Create First Project</span>
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {projects.slice(0, 4).map((project) => (
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
        </div>

        {/* RIGHT 1/3: Quick Actions, AI Capabilities & Recent Alerts */}
        <div className="space-y-6">
          
          {/* Quick Workflow Navigation */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quick Shortcuts
            </h3>
            <div className="space-y-1.5">
              {[
                { label: 'Browse Project Directory', to: '/projects', sub: 'Filter, search & sort CAD files' },
                { label: 'Bookmarked Designs', to: '/saved', sub: 'Saved community & reference parts' },
                { label: 'Engineering Profile', to: '/profile', sub: 'Profile customization & credentials' },
                { label: 'Platform Preferences', to: '/settings', sub: 'Theme & notification settings' },
              ].map(({ label, to, sub }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* AI 3D Print Studio Roadmap Box */}
          <div className="card p-5 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/40 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <Cpu size={18} />
              <h3 className="text-sm font-bold">AI Design Engine v0.3</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Automated mesh repair, overhang minimization, and prompt-to-3D generation capabilities are currently in active rollout.
            </p>
            <div className="flex items-center justify-between text-xs pt-1 font-medium text-indigo-600 dark:text-indigo-400">
              <span>Status: Feature 3 In Progress</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Recent System Alerts */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                System Log
              </h3>
              <span className="text-[11px] text-slate-400">Real-time</span>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No unread notifications.</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 3).map((notif) => (
                  <div key={notif.id} className="text-xs border-l-2 border-indigo-500 pl-3 py-0.5 space-y-0.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {notif.title}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODALS & DIALOGS ================= */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleProjectCreated}
        />
      )}

      {projectToDelete && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to permanently delete "${projectToDelete.name}"? This action cannot be undone.`}
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
