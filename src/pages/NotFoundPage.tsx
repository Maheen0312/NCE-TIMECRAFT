import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-slate-800 space-y-6">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-luna-primary-blue dark:text-cyan-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-luna-cyan tracking-widest uppercase">
            Error 404
          </span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Page Not Found
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            The timetable route or page you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-4 py-2.5 bg-luna-dark-navy hover:bg-luna-deep-blue text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

