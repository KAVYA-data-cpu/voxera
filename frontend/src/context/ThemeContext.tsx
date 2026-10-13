// =========================================================
// src/context/ThemeContext.tsx
//
// CONCEPT: Persisting user preferences with localStorage.
//
// We store the theme in localStorage so it survives page
// refreshes. We also toggle a 'dark' class on the <html>
// element — this is how Tailwind's darkMode: 'class' works.
// =========================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark'; // what is actually applied right now
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper: Apply the correct class to <html>
function applyTheme(effective: 'light' | 'dark') {
  const root = document.documentElement;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Helper: Resolve 'system' to 'light' or 'dark' using OS preference
function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read saved theme from localStorage, default to 'system'
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('voxera_theme') as Theme | null;
    return saved ?? 'system';
  });

  const effectiveTheme = resolveEffective(theme);

  // Whenever theme changes → update DOM and localStorage
  useEffect(() => {
    applyTheme(effectiveTheme);
    localStorage.setItem('voxera_theme', theme);
  }, [theme, effectiveTheme]);

  // Listen for OS-level dark/light changes when theme = 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(resolveEffective('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
