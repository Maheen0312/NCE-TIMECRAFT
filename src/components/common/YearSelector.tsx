import React from 'react';
import { useYearFilter } from '@/contexts/YearFilterContext';
import { CanonicalYear, YEAR_CONFIGS } from '@/utils/yearUtils';
import { GraduationCap } from 'lucide-react';

interface YearSelectorProps {
  value?: CanonicalYear | 'ALL';
  onChange?: (year: CanonicalYear | 'ALL') => void;
  showAllOption?: boolean;
  allOptionLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  value,
  onChange,
  showAllOption = false,
  allOptionLabel = 'All Years',
  size = 'md',
  className = '',
}) => {
  const context = useYearFilter();
  const currentYear = value !== undefined ? value : context.selectedYear;
  const handleSelect = (y: CanonicalYear | 'ALL') => {
    if (onChange) {
      onChange(y);
    } else if (y !== 'ALL') {
      context.setSelectedYear(y);
    }
  };

  const padClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : size === 'lg' ? 'px-4 py-2 text-sm' : 'px-3.5 py-1.5 text-xs';

  return (
    <div className={`inline-flex items-center p-1 rounded-xl bg-gray-100 dark:bg-slate-800/90 border border-gray-200/80 dark:border-slate-700/80 shadow-xs ${className}`}>
      {showAllOption && (
        <button
          type="button"
          onClick={() => handleSelect('ALL')}
          className={`${padClass} font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            currentYear === 'ALL'
              ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs border border-gray-200/80 dark:border-slate-700'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {allOptionLabel}
        </button>
      )}

      {YEAR_CONFIGS.map((cfg) => {
        const isSelected = currentYear === cfg.key;
        return (
          <button
            key={cfg.key}
            type="button"
            onClick={() => handleSelect(cfg.key)}
            className={`${padClass} font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              isSelected
                ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs border border-gray-200/80 dark:border-slate-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className={`w-3.5 h-3.5 ${isSelected ? 'text-luna-primary-blue dark:text-cyan-400' : 'text-gray-400'}`} />
            <span>{cfg.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isSelected
                  ? 'bg-blue-100 dark:bg-cyan-950/60 text-luna-primary-blue dark:text-cyan-300'
                  : 'bg-gray-200/70 dark:bg-slate-700/60 text-gray-500 dark:text-gray-400'
              }`}
            >
              Sem {cfg.defaultSemester}
            </span>
          </button>
        );
      })}
    </div>
  );
};
