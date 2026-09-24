import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }


  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-slate-800 space-y-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                An unexpected application error occurred in NCE Timecraft. Your data in Firestore remains secure.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50 text-left">
                <p className="text-[11px] font-mono text-red-700 dark:text-red-300 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-luna-dark-navy hover:bg-luna-deep-blue text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-4 py-2.5 border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
