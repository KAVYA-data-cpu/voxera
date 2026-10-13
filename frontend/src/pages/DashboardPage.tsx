// =========================================================
// src/pages/DashboardPage.tsx
//
// FEATURE 2: Updated dashboard with real project CRUD.
//
// Changes from Feature 1:
// - "New 3D Project" button is now active (opens CreateProjectModal)
// - Recent projects use real API data (no more placeholders)
// - ProjectCard now has full context menu (rename/delete/duplicate/save)
// - Stats are computed from real data
// - Saved count fetched from API
// =========================================================

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FolderKanban, Bookmark, Bell, Cpu, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProfileCard from '../components/ProfileCard';
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Delete confirmation
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const firstName = user?.name.split(' ')[0] || 'there';

  // ---- FETCH DATA ----
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
      setSavedCount(savedRes.data.length);
    } catch {
      // On error, show empty state (graceful degradation)
      setProjects([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- PROJECT ACTION HANDLERS ----
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
        setSavedCount((c) => Math.max(0, c - 1));
      } else {
        await saveProject(project.id);
        setSavedCount((c) => c + 1);
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, is_saved: !p.is_saved } : p))
      );
    } catch {
      alert('Failed to update saved status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ---- HEADER GREETING ---- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Good{' '}
            {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
            , {firstName}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Here&apos;s what&apos;s happening with your 3D projects.
          </p>
        </div>

        {/* ---- CREATE NEW PROJECT BUTTON ---- */}
        {/* Feature 2: now active, opens modal */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 btn-primary self-start md:self-auto"
        >
          <Plus size={18} />
          New 3D Project
        </button>
      </div>

      {/* ---- STATS ROW ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FolderKanban, label: 'Total Projects',  value: loading ? '-' : projects.length,                                            color: 'text-brand-500' },
          { icon: Bookmark,    label: 'Saved',            value: loading ? '-' : savedCount,                                                color: 'text-emerald-500' },
          { icon: Bell,        label: 'Notifications',    value: loading ? '-' : notifications.filter((n) => !n.is_read).length,            color: 'text-orange-500' },
          { icon: TrendingUp,  label: 'Ready to Print',   value: loading ? '-' : projects.filter((p) => p.status === 'ready').length,       color: 'text-blue-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card flex items-center gap-4 p-4">
            <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-700 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---- MAIN GRID: Projects left, sidebar right ---- */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left 2/3: Recent Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI placeholder CTA */}
          <div className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-800 p-6 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={20} />
                <span className="font-semibold">AI Design Studio</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Coming Soon</span>
              </div>
              <p className="text-brand-200 text-sm">
                Generate, edit and optimize 3D models with AI. Feature 3 is in development.
              </p>
            </div>
          </div>

          {/* Recent Projects section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Recent Projects</h2>
              <Link to="/projects" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
                View all →
              </Link>
            </div>

            {/* Loading skeleton */}
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              // Empty state
              <div className="card text-center py-10">
                <FolderKanban size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No projects yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 btn-primary text-sm py-1.5 px-3 flex items-center gap-1 mx-auto"
                >
                  <Plus size={14} />
                  Create First Project
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Show only 4 most recent projects on dashboard */}
                {projects.slice(0, 4).map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onRename={handleRename}
                    onDelete={handleDeleteRequest}
                    onDuplicate={handleDuplicate}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3: Profile + Quick Actions + Notifications */}
        <div className="space-y-6">
          {/* Profile widget */}
          {user && <ProfileCard user={user} />}

          {/* Quick links */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Edit Profile',     to: '/profile' },
                { label: 'My Projects',      to: '/projects' },
                { label: 'Saved Projects',   to: '/saved' },
                { label: 'Settings',         to: '/settings' },
              ].map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between py-2 px-3 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>{label}</span>
                  <span className="text-slate-400">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Notifications widget */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Recent Notifications</h3>
              <Bell size={16} className="text-slate-400" />
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400">No notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="text-sm">
                    <p className={`font-medium ${!n.is_read ? 'text-brand-600 dark:text-brand-400' : ''}`}>
                      {n.title}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- MODALS ---- */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleProjectCreated}
        />
      )}

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
