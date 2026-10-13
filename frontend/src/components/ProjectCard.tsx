// =========================================================
// src/components/ProjectCard.tsx
//
// FEATURE 2: Full project card with context menu.
//
// This component is used on:
// - Dashboard (recent projects preview)
// - /projects page (full grid)
// - /saved page (bookmarked projects)
//
// CONCEPT: Props
// Props = data passed from parent to child.
// The parent (ProjectsPage) passes the project data and
// callback functions (onDelete, onRename, etc.) to this card.
// The card calls those callbacks when the user interacts.
//
// CONCEPT: Context Menu (3-dot menu)
// Shows a dropdown with: Open, Rename, Duplicate, Save, Delete
// We track `menuOpen` state (boolean) to show/hide it.
//
// CONCEPT: Lifting State Up
// The actual delete/rename operations happen in the PARENT page,
// not this card. The card just notifies the parent via callbacks.
// This way, the parent can update its list of projects without
// re-fetching from the API.
//
// CONCEPT: Inline Rename
// When the user clicks "Rename", the title becomes an editable
// input field. On Enter or blur, the new name is saved.
// =========================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MoreVertical,
  ExternalLink,
  Edit2,
  Copy,
  Bookmark,
  BookmarkCheck,
  Trash2,
} from 'lucide-react';
import type { Project } from '../types';

// ---- Status display config ----
// Map each status to a color class and display label
const STATUS_CONFIG: Record<
  Project['status'],
  { label: string; className: string }
> = {
  draft:      { label: 'Draft',      className: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
  generating: { label: 'Generating', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  processing: { label: 'Processing', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  ready:      { label: 'Ready',      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  completed:  { label: 'Completed',  className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  failed:     { label: 'Failed',     className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

interface ProjectCardProps {
  project: Project;
  isSaved?: boolean;        // show "Saved" badge (used on SavedPage)
  showMenu?: boolean;       // show the 3-dot context menu (default: true)
  onOpen?: (project: Project) => void;
  onRename?: (project: Project, newName: string) => void;
  onDelete?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onToggleSave?: (project: Project) => void;
}

export default function ProjectCard({
  project,
  isSaved = false,
  showMenu = true,
  onOpen,
  onRename,
  onDelete,
  onDuplicate,
  onToggleSave,
}: ProjectCardProps) {
  const navigate = useNavigate();

  // ---- LOCAL STATE ----
  const [menuOpen, setMenuOpen] = useState(false);       // context menu open/closed
  const [isRenaming, setIsRenaming] = useState(false);   // inline rename mode
  const [renameValue, setRenameValue] = useState(project.name);

  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ---- CLOSE MENU ON CLICK OUTSIDE ----
  // CONCEPT: useEffect for side effects
  // This adds a document-level click listener when the menu opens,
  // and removes it when the menu closes or the component unmounts.
  // This is a common "click outside to close" pattern.
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // ---- AUTO-FOCUS rename input ----
  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select(); // select all text for easy editing
    }
  }, [isRenaming]);

  // ---- HANDLERS ----
  const handleOpen = () => {
    if (onOpen) {
      onOpen(project);
    } else {
      // Default: navigate to project workspace
      navigate(`/projects/${project.id}`);
    }
  };

  const handleRenameStart = () => {
    setRenameValue(project.name);
    setIsRenaming(true);
    setMenuOpen(false);
  };

  const handleRenameSubmit = () => {
    const newName = renameValue.trim();
    setIsRenaming(false);
    // Only call the callback if the name actually changed and is valid
    if (newName && newName !== project.name && onRename) {
      onRename(project, newName);
    } else {
      // Reset to original name
      setRenameValue(project.name);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameValue(project.name);
    }
  };

  // Format dates for display
  const updatedDate = new Date(project.updated_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
  const isSavedNow = project.is_saved || isSaved;

  return (
    <div className="card hover:shadow-md transition-all cursor-pointer group relative">
      {/* ---- THUMBNAIL ---- */}
      <div
        className="aspect-video bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/40 dark:to-brand-800/40 rounded-lg mb-4 flex items-center justify-center overflow-hidden"
        onClick={handleOpen}
      >
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          // Placeholder for projects without thumbnails
          <div className="flex flex-col items-center gap-2 text-brand-400 dark:text-brand-500">
            <span className="text-4xl select-none">🎲</span>
            <span className="text-xs font-medium opacity-70 capitalize">
              {statusConfig.label}
            </span>
          </div>
        )}
      </div>

      {/* ---- CARD BODY ---- */}
      <div className="space-y-2">
        {/* Title row: name + status + more-menu */}
        <div className="flex items-start justify-between gap-2">
          {/* ---- INLINE RENAME / TITLE ---- */}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              maxLength={200}
              className="input-field py-0.5 px-2 text-sm font-semibold flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              className="font-semibold text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1 cursor-pointer flex-1 min-w-0"
              onClick={handleOpen}
              title={project.name}
            >
              {project.name}
            </h3>
          )}

          {/* Status badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusConfig.className}`}>
            {statusConfig.label}
          </span>

          {/* ---- 3-DOT CONTEXT MENU ---- */}
          {showMenu && (
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                aria-label="Project options"
                title="More options"
              >
                <MoreVertical size={16} />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10">
                  {/* Open */}
                  <button
                    className="menu-item"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleOpen(); }}
                  >
                    <ExternalLink size={14} /> Open
                  </button>

                  {/* Rename */}
                  {onRename && (
                    <button
                      className="menu-item"
                      onClick={(e) => { e.stopPropagation(); handleRenameStart(); }}
                    >
                      <Edit2 size={14} /> Rename
                    </button>
                  )}

                  {/* Duplicate */}
                  {onDuplicate && (
                    <button
                      className="menu-item"
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(project); }}
                    >
                      <Copy size={14} /> Duplicate
                    </button>
                  )}

                  {/* Save / Unsave */}
                  {onToggleSave && (
                    <button
                      className="menu-item"
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onToggleSave(project); }}
                    >
                      {isSavedNow
                        ? <><BookmarkCheck size={14} className="text-brand-500" /> Unsave</>
                        : <><Bookmark size={14} /> Save</>
                      }
                    </button>
                  )}

                  {/* Delete — separated with a divider */}
                  {onDelete && (
                    <>
                      <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                      <button
                        className="menu-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(project); }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Footer: date + save indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {updatedDate}
          </span>
          {isSavedNow && (
            <span className="flex items-center gap-1 text-brand-500">
              <BookmarkCheck size={12} />
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
