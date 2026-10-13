// =========================================================
// src/components/ConfirmDialog.tsx
//
// Reusable Confirmation Modal Dialog.
// Used for destructive actions such as permanent deletion.
// =========================================================

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${
              isDestructive
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            <AlertTriangle size={20} />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary text-xs"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`text-xs font-semibold py-2 px-4 rounded-lg transition-all shadow-xs disabled:opacity-50 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white'
                : 'btn-primary'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
