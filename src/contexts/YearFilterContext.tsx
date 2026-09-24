import React, { createContext, useContext, useState, useEffect } from 'react';
import { CanonicalYear, YEAR_CONFIGS, YearConfig, normalizeYear } from '@/utils/yearUtils';

interface YearFilterContextType {
  selectedYear: CanonicalYear;
  setSelectedYear: (year: CanonicalYear) => void;
  selectedSemester: string;
  yearConfig: YearConfig;
  allYears: YearConfig[];
}

const YearFilterContext = createContext<YearFilterContextType | undefined>(undefined);

const STORAGE_KEY = 'nce_timecraft_selected_academic_year';

export const YearFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedYear, setSelectedYearState] = useState<CanonicalYear>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const normalized = normalizeYear(saved);
      if (normalized === 'II' || normalized === 'III' || normalized === 'IV') {
        return normalized;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'II'; // Default to 2nd Year as per user instruction
  });

  const setSelectedYear = (year: CanonicalYear) => {
    setSelectedYearState(year);
    try {
      localStorage.setItem(STORAGE_KEY, year);
    } catch {
      // Ignore localStorage errors
    }
  };

  const yearConfig = YEAR_CONFIGS.find(cfg => cfg.key === selectedYear) || YEAR_CONFIGS[0];
  const selectedSemester = yearConfig.defaultSemester;

  return (
    <YearFilterContext.Provider
      value={{
        selectedYear,
        setSelectedYear,
        selectedSemester,
        yearConfig,
        allYears: YEAR_CONFIGS,
      }}
    >
      {children}
    </YearFilterContext.Provider>
  );
};

export const useYearFilter = (): YearFilterContextType => {
  const context = useContext(YearFilterContext);
  if (!context) {
    throw new Error('useYearFilter must be used within a YearFilterProvider');
  }
  return context;
};
