import { useState, useEffect, useCallback } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'sdc-theme-preference';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === 'system') return darkQuery.matches;
  return preference === 'dark';
}

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(getStoredPreference);
  const [isNightMode, setIsNightMode] = useState(() => resolveIsDark(getStoredPreference()));

  // Apply theme class whenever isNightMode changes
  useEffect(() => {
    applyTheme(isNightMode);
  }, [isNightMode]);

  // Listen for system theme changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return;

    const handler = (e: MediaQueryListEvent) => {
      setIsNightMode(e.matches);
    };
    darkQuery.addEventListener('change', handler);
    return () => darkQuery.removeEventListener('change', handler);
  }, [preference]);

  const toggleNight = useCallback(() => {
    const newDark = !isNightMode;
    const newPref: ThemePreference = newDark ? 'dark' : 'light';
    setPreference(newPref);
    setIsNightMode(newDark);
    localStorage.setItem(STORAGE_KEY, newPref);
  }, [isNightMode]);

  return { isNightMode, toggleNight };
}
