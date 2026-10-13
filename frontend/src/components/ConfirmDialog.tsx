// =========================================================
// src/components/ConfirmDialog.tsx
//
// FEATURE 2: Reusable confirmation dialog (modal).
//
// CONCEPT: Modal / Dialog
// A modal is a box that appears on top of the current page
// and blocks interaction until the user responds.
//
// Used for:
// - Delete confirmation: "Are you sure you want to delete 'Project X'?"
//
// CONCEPT: Props
// Props are how parent components pass data to child components.
// This component receives:
//   - title: the heading text
//   - message: the body text
//   - confirmLabel: text for the confirm button
//   - onConfirm: function to call when user confirms
//   - onCancel: function to call when user cancels
//   - isDestructive: if true, the confirm button is red
//
// CONCEPT: Portals (simplified here)
// In a real app, modals are rendered using React Portals to
// ensure they appear above ALL other content. Here we use
// fixed positioning + high z-index which achieves the same
// visual effect without the added complexity.
// =========================================================

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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    // ---- BACKDROP ----
    // The semi-transparent dark overlay behind the dialog.
    // Clicking it cancels the dialog (same as Cancel button).
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onCancel}  // click outside = cancel
    >
      {/* ---- DIALOG BOX ----
          stopPropagation() prevents the click-outside handler from
          firing when the user clicks INSIDE the dialog box. */}
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          {/* Cancel button */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>

          {/* Confirm button — red if destructive action */}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
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
