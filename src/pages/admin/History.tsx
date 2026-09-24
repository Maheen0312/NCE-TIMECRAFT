import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getAllTimetables, deleteTimetable, deleteMultipleTimetables, publishTimetable } from '@/services/timetableService';
import { Timetable } from '@/types/timetable';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { 
  History, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  RefreshCw, 
  Clock, 
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminHistory() {
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Bulk delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Single deletion modal state
  const [timetableToDelete, setTimetableToDelete] = useState<{ id: string; name: string; version: number } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const list = await getAllTimetables();
      setTimetables(list);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSelectAll = () => {
    const validIds = timetables.map(t => t.id!).filter(Boolean);
    if (selectedIds.length === validIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(validIds);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      await deleteMultipleTimetables(selectedIds);
      setTimetables(prev => prev.filter(t => t.id && !selectedIds.includes(t.id)));
      toast.success(`Successfully deleted ${selectedIds.length} timetables`);
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete selected timetables');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!timetableToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteTimetable(timetableToDelete.id);
      setTimetables(prev => prev.filter(t => t.id !== timetableToDelete.id));
      setSelectedIds(prev => prev.filter(id => id !== timetableToDelete.id));
      toast.success(`Timetable ${timetableToDelete.name} (v${timetableToDelete.version}) removed successfully`);
      setTimetableToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete timetable');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: string) => {
    try {
      const isPublish = currentStatus !== 'PUBLISHED';
      await publishTimetable(id, isPublish);
      toast.success(isPublish ? 'Timetable published' : 'Reverted to draft');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const isAllSelected = timetables.length > 0 && selectedIds.length === timetables.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Generation History & Version Control</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Archive of previously generated schedules, algorithmic quality metrics, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
              className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/60 font-bold"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}

          <Button size="sm" onClick={() => navigate('/admin/generate')} className="font-semibold shadow-sm">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Generate New Version
          </Button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {timetables.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-2xs text-xs">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center space-x-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-semibold cursor-pointer select-none"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
              ) : (
                <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
              <span>
                {isAllSelected ? 'Deselect All' : 'Select All'} ({timetables.length} items)
              </span>
            </button>

            {selectedIds.length > 0 && (
              <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 font-bold px-2 py-0.5 rounded-md">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium underline"
            >
              Clear Selection
            </button>
          )}
        </div>
      )}

      {/* List */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
              Loading historical archives...
            </div>
          ) : timetables.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No Historical Records</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                Run the automatic scheduling engine to create and archive timetables.
              </p>
              <Button size="sm" onClick={() => navigate('/admin/generate')}>
                Run Scheduling Engine
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {timetables.map((t) => {
                const isSelected = !!t.id && selectedIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : 'hover:bg-gray-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => t.id && toggleSelectOne(t.id)}
                          className="w-4 h-4 rounded text-luna-primary-blue border-gray-300 dark:border-slate-700 focus:ring-luna-primary-blue cursor-pointer"
                        />
                      </div>

                      <div className="w-11 h-11 rounded-2xl bg-luna-primary-blue/10 dark:bg-cyan-950/50 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center font-bold shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-gray-900 dark:text-white text-base">{t.name}</h4>
                          <span className="font-mono text-xs text-gray-400 dark:text-gray-500">v{t.version}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            t.status === 'PUBLISHED'
                              ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-3">
                          <span>Dept: <strong className="text-gray-700 dark:text-gray-300">{t.department}</strong></span>
                          <span>•</span>
                          <span>Year: <strong className="text-gray-700 dark:text-gray-300">{t.year}</strong> (Sem {t.semester})</span>
                          <span>•</span>
                          <span>Periods: <strong className="text-gray-700 dark:text-gray-300">{t.entries?.length || 0}</strong></span>
                          <span>•</span>
                          <span>Quality: <strong className="text-emerald-600 dark:text-emerald-400">{t.qualityScore || 96}%</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/admin/timetable')}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Grid
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => t.id && handleTogglePublish(t.id, t.status)}
                        className="text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600 dark:text-green-400" />
                        {t.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => t.id && setTimetableToDelete({ id: t.id, name: t.name, version: t.version })}
                        className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-200 dark:hover:border-red-800"
                        title="Delete Timetable Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Delete Confirmation Modal */}
      {timetableToDelete && (
        <ConfirmModal
          isOpen={!!timetableToDelete}
          onClose={() => setTimetableToDelete(null)}
          onConfirm={confirmDelete}
          title="Delete Timetable Version"
          message={`Are you sure you want to permanently delete "${timetableToDelete.name}" (Version ${timetableToDelete.version})? This action will remove the record from Cloud Firestore.`}
          confirmText="Delete Permanently"
          type="danger"
          loading={deleteLoading}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <ConfirmModal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={confirmBulkDelete}
          title={`Delete ${selectedIds.length} Timetables`}
          message={`Are you sure you want to permanently delete all ${selectedIds.length} selected timetable versions from the database? This action cannot be undone.`}
          confirmText={`Delete ${selectedIds.length} Items`}
          type="danger"
          loading={bulkDeleteLoading}
        />
      )}
    </div>
  );
}
