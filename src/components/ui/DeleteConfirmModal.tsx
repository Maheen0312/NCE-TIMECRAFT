import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName?: string;
  description?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description = 'This action cannot be undone. It will be permanently removed from the system and Firestore database.',
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 w-full max-w-md overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {itemName && (
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700 rounded-xl">
                <span className="text-xs text-gray-400 dark:text-gray-500 block font-medium">Selected Item:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{itemName}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
          </div>

          <div className="p-5 pt-0 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm shadow-red-200"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
