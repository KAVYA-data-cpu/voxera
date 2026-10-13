// =========================================================
// src/components/ThemeToggle.tsx
//
// A button that cycles through: light → dark → system
// Uses the ThemeContext we created earlier.
// =========================================================

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Cycle: light → dark → system → light ...
  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const label =
    theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System mode';

  return (
    <button
      onClick={cycle}
      title={label}
      aria-label={label}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
    >
      <Icon size={20} />
    </button>
  );
}
