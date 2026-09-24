import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
      title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
      aria-label="Toggle theme"
    >
      {theme === 'light' && <Sun className="w-5 h-5 text-amber-500" />}
      {theme === 'dark' && <Moon className="w-5 h-5 text-cyan-400" />}
      {theme === 'system' && <Laptop className="w-5 h-5 text-blue-400" />}
    </button>
  );
};
