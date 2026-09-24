import React from 'react';
import { AlertTriangle, Info, Check, Trash2, X } from 'lucide-react';
import { ButtonLoader } from './Skeletons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case 'success':
        return <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      default:
        return 'bg-amber-600 hover:bg-amber-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-gray-100 dark:bg-slate-800 shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 ${getConfirmButtonClass()}`}
          >
            {loading ? <ButtonLoader text="Processing..." /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
