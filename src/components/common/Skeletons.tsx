import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading NCE Timecraft...' }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
    <div className="relative flex items-center justify-center mb-4">
      <div className="w-12 h-12 rounded-full border-4 border-luna-primary-blue/20 border-t-luna-primary-blue animate-spin" />
      <div className="absolute w-6 h-6 rounded-full bg-luna-cyan/20 animate-ping" />
    </div>
    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{message}</p>
    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Nellai College of Engineering</p>
  </div>
);

export const ButtonLoader: React.FC<{ text?: string }> = ({ text }) => (
  <div className="inline-flex items-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
    {text && <span>{text}</span>}
  </div>
);

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="bg-gray-100 dark:bg-slate-800/60 rounded-2xl p-5 border border-gray-200/60 dark:border-slate-800 space-y-3"
      >
        <div className="flex justify-between items-start">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
          <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="h-7 bg-gray-300 dark:bg-slate-600 rounded w-16" />
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-32" />
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden animate-pulse">
    <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-36" />
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-24" />
    </div>
    <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-4 flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`h-4 bg-gray-200 dark:bg-slate-700 rounded ${
                c === 0 ? 'w-1/3' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const TimetableSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center px-4 justify-between">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-48" />
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-20" />
        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-20" />
      </div>
    </div>
    <div className="grid grid-cols-6 gap-2">
      {Array.from({ length: 36 }).map((_, i) => (
        <div
          key={i}
          className="h-20 bg-gray-100 dark:bg-slate-800/50 rounded-xl border border-gray-200/50 dark:border-slate-800/80 p-2 space-y-2"
        >
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16" />
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-10" />
        </div>
      ))}
    </div>
  </div>
);
