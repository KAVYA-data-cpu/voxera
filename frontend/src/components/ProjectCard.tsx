// =========================================================
// src/components/ProjectCard.tsx
//
// Refined ProjectCard component with:
// - Clean industrial design & accurate status pills
// - Integrated context menu with accessible actions
// - Inline rename input
// - Clear metadata formatting
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
  Box,
} from 'lucide-react';
import type { Project } from '../types';

const STATUS_CONFIG: Record<
  Project['status'],
  { label: string; badgeClass: string; dotClass: string }
> = {
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

interface ProjectCardProps {
  project: Project;
  isSaved?: boolean;
  showMenu?: boolean;
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);

  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const handleOpen = () => {
    if (onOpen) onOpen(project);
    else navigate(`/projects/${project.id}`);
  };

  const handleRenameStart = () => {
    setRenameValue(project.name);
    setIsRenaming(true);
    setMenuOpen(false);
  };

  const handleRenameSubmit = () => {
    const newName = renameValue.trim();
    setIsRenaming(false);
    if (newName && newName !== project.name && onRename) {
      onRename(project, newName);
    } else {
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

  const formattedDate = new Date(project.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const statusConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
  const isSavedState = project.is_saved || isSaved;

  return (
    <div className="card group relative flex flex-col justify-between overflow-hidden p-0 hover:shadow-md transition-all duration-200 border border-slate-200/80 dark:border-slate-800">
      
      {/* Top Preview Canvas */}
      <div
        onClick={handleOpen}
        className="aspect-[16/10] bg-slate-100 dark:bg-slate-800/60 relative cursor-pointer flex items-center justify-center border-b border-slate-100 dark:border-slate-800/80 overflow-hidden group-hover:bg-slate-200/60 dark:group-hover:bg-slate-800 transition-colors"
      >
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400 dark:text-slate-500">
            <Box size={32} className="stroke-[1.5] text-indigo-400 dark:text-indigo-500 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              CAD Workspace
            </span>
          </div>
        )}

        {/* Status Pill on thumbnail */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md ${statusConf.badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dotClass}`} />
            <span>{statusConf.label}</span>
          </span>
        </div>

        {/* Bookmark indicator */}
        {isSavedState && (
          <div className="absolute top-2.5 right-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-md text-amber-500 shadow-2xs">
            <BookmarkCheck size={14} className="fill-amber-500/20" />
          </div>
        )}
      </div>

      {/* Body Information */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            {isRenaming ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                maxLength={200}
                className="input-field py-1 px-2 text-sm font-semibold flex-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3
                onClick={handleOpen}
                className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1 cursor-pointer flex-1"
                title={project.name}
              >
                {project.name}
              </h3>
            )}

            {/* 3-Dot Dropdown Trigger */}
            {showMenu && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((p) => !p);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="More actions"
                >
                  <MoreVertical size={16} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-7 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      className="menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        handleOpen();
                      }}
                    >
                      <ExternalLink size={14} /> <span>Open</span>
                    </button>

                    {onRename && (
                      <button
                        className="menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameStart();
                        }}
                      >
                        <Edit2 size={14} /> <span>Rename</span>
                      </button>
                    )}

                    {onDuplicate && (
                      <button
                        className="menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onDuplicate(project);
                        }}
                      >
                        <Copy size={14} /> <span>Duplicate</span>
                      </button>
                    )}

                    {onToggleSave && (
                      <button
                        className="menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onToggleSave(project);
                        }}
                      >
                        {isSavedState ? (
                          <>
                            <BookmarkCheck size={14} className="text-amber-500" />
                            <span>Unsave</span>
                          </>
                        ) : (
                          <>
                            <Bookmark size={14} />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    )}

                    {onDelete && (
                      <div className="border-t border-slate-100 dark:border-slate-700 my-1 pt-1">
                        <button
                          className="menu-item text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onDelete(project);
                          }}
                        >
                          <Trash2 size={14} /> <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">
            {project.description || 'No component description provided.'}
          </p>
        </div>

        {/* Footer info: updated date */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1 font-mono">
            <Calendar size={11} />
            <span>Updated {formattedDate}</span>
          </span>
          <button
            onClick={handleOpen}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Launch →
          </button>
        </div>
      </div>
    </div>
  );
}
