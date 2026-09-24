import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Search, Edit2, Trash2, FlaskConical, Clock, X, RefreshCw, Sparkles, CheckCircle2, ArrowLeftRight, UserCheck, GraduationCap } from 'lucide-react';
import { getAllLabs, createLab, updateLab, deleteLab, syncLabsWithSubjects, Lab } from '@/services/labService';
import { getAllSubjects, Subject } from '@/services/subjectService';
import { getAllStaff, StaffProfile } from '@/services/staffService';
import { seedInitialDataset } from '@/services/seedService';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { YearSelector } from '@/components/common/YearSelector';
import { useYearFilter } from '@/contexts/YearFilterContext';
import { matchYear, CanonicalYear } from '@/utils/yearUtils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLabs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);

  const { selectedYear, setSelectedYear, yearConfig } = useYearFilter();
  const [viewYearFilter, setViewYearFilter] = useState<CanonicalYear | 'ALL'>(selectedYear);

  useEffect(() => {
    setViewYearFilter(selectedYear);
  }, [selectedYear]);

  // Delete State
  const [deletingLab, setDeletingLab] = useState<Lab | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    labCode: '',
    labName: '',
    capacity: 35,
    duration: 2,
    preferredPeriod: 'Afternoon' as 'Morning' | 'Afternoon' | 'Any',
    department: 'Computer Science & Engineering',
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const [labsData, subsData, staffData] = await Promise.all([
        getAllLabs(),
        getAllSubjects(),
        getAllStaff(),
      ]);
      setLabs(labsData);
      setSubjects(subsData);
      setStaffList(staffData);
    } catch (error) {
      console.error('Failed to fetch labs:', error);
      toast.error('Failed to load laboratories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleSyncLabs = async () => {
    setIsSyncing(true);
    try {
      const res = await syncLabsWithSubjects();
      toast.success(`Successfully synced ${res.count} practical laboratory course(s) with Subjects!`);
      await fetchLabs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync labs with subjects');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingLab(null);
    setFormData({
      labCode: '',
      labName: '',
      capacity: 35,
      duration: 2,
      preferredPeriod: 'Afternoon',
      department: 'Computer Science & Engineering',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lab: Lab) => {
    setEditingLab(lab);
    setFormData({
      labCode: lab.labCode || '',
      labName: lab.labName || '',
      capacity: lab.capacity || 35,
      duration: lab.duration || 2,
      preferredPeriod: lab.preferredPeriod || 'Afternoon',
      department: lab.department || 'Computer Science & Engineering',
      active: lab.active !== undefined ? lab.active : true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.labCode.trim() || !formData.labName.trim()) {
      toast.error('Please enter lab code and name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingLab?.id) {
        await updateLab(editingLab.id, formData);
        toast.success(`Lab "${formData.labCode}" updated & synced with Subjects`);
      } else {
        await createLab(formData);
        toast.success(`Lab "${formData.labCode}" created & synced with Subjects`);
      }
      setIsModalOpen(false);
      fetchLabs();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save laboratory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLab) return;
    const targetId = deletingLab.id || `lab_${deletingLab.labCode}`;
    setIsDeleting(true);
    try {
      await deleteLab(targetId);
      setLabs(prev => prev.filter(l => (l.id ? l.id !== targetId : l.labCode !== deletingLab.labCode)));
      toast.success('Laboratory removed');
      setDeletingLab(null);
      await fetchLabs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete laboratory');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to find associated subject for a lab code from Subjects
  const getSubjectForLab = (labCode: string) => {
    const targetCode = (labCode || '').toUpperCase().trim();
    const targetName = (labCode || '').toLowerCase().trim();
    return subjects.find(
      s => (s.subjectCode || '').toUpperCase().trim() === targetCode ||
           (s.subjectName || '').toLowerCase().trim() === targetName
    );
  };

  const filteredLabs = labs.filter(l => {
    const q = (searchQuery || '').toLowerCase();
    const code = (l.labCode || '').toLowerCase();
    const name = (l.labName || '').toLowerCase();
    const matchesSearch = !q || code.includes(q) || name.includes(q);
    if (!matchesSearch) return false;

    if (viewYearFilter !== 'ALL') {
      const matchedSubject = getSubjectForLab(l.labCode);
      if (matchedSubject) {
        return matchYear(matchedSubject.year, viewYearFilter) ||
               matchedSubject.semester === (viewYearFilter === 'II' ? '3' : viewYearFilter === 'III' ? '5' : '7');
      }
      return false;
    }

    return true;
  });

  // Helper to find assigned faculty for a lab code from Subjects
  const getAssignedStaffForLab = (labCode: string) => {
    const matchedSubject = getSubjectForLab(labCode);
    if (!matchedSubject || !Array.isArray(matchedSubject.assignedStaff) || !matchedSubject.assignedStaff.length) return null;
    return matchedSubject.assignedStaff.map(code => {
      const staff = staffList.find(st => (st.staffCode || '').toUpperCase() === (code || '').toUpperCase());
      return staff ? `${staff.name} (${staff.staffCode})` : code;
    }).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Laboratory Management</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure practical laboratory facilities, batch capacities, and continuous period rules (auto-synchronized with Subjects).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncLabs} disabled={isSyncing} className="text-xs">
            <ArrowLeftRight className={`w-3.5 h-3.5 mr-1.5 text-luna-primary-blue dark:text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Practical Subjects'}
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Laboratory
          </Button>
        </div>
      </div>

      {/* Year Selector Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
            <span>Select Year:</span>
          </span>
          <YearSelector
            showAllOption
            allOptionLabel="All Labs"
            value={viewYearFilter}
            onChange={(y) => {
              setViewYearFilter(y);
              if (y !== 'ALL') setSelectedYear(y);
            }}
          />
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {viewYearFilter === 'ALL' ? (
            <span>Showing all <strong>{labs.length}</strong> college laboratories</span>
          ) : (
            <span>
              Showing <strong>{filteredLabs.length}</strong> labs for <strong>{yearConfig.label} (Semester {yearConfig.defaultSemester})</strong>
            </span>
          )}
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Search laboratory name or code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Labs: <strong className="text-gray-900 dark:text-white">{filteredLabs.length}</strong></span>
          <span>Active: <strong className="text-green-600 dark:text-green-400">{filteredLabs.filter(l => l.active).length}</strong></span>
          <Button variant="outline" size="sm" onClick={fetchLabs} className="h-8 px-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Labs Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
            Loading laboratories from Firestore...
          </div>
        ) : filteredLabs.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
            <FlaskConical className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              {viewYearFilter === 'ALL' ? 'No laboratories configured' : `No laboratories configured for ${yearConfig.label}`}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 max-w-md mx-auto">
              {viewYearFilter === 'ALL' 
                ? 'Add lab resources or sync practical courses from the Subjects catalog.'
                : `Sync practical courses from the ${yearConfig.label} curriculum or add a custom laboratory for this year.`}
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Button size="sm" variant="outline" onClick={handleSyncLabs}>
                <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                Sync Practical Subjects
              </Button>
              <Button size="sm" onClick={handleOpenAdd}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Laboratory
              </Button>
            </div>
          </div>
        ) : (
          filteredLabs.map((lab, idx) => {
            const assignedFaculty = getAssignedStaffForLab(lab.labCode);
            const matchedSub = getSubjectForLab(lab.labCode);
            return (
              <Card key={lab.id || `${lab.labCode}_${idx}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-base">{lab.labName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-semibold text-purple-700 dark:text-purple-400">{lab.labCode}</span>
                          {matchedSub && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                              {matchedSub.year === 'II' || matchedSub.semester === '3' ? '2nd Year (Sem 3)' :
                               matchedSub.year === 'III' || matchedSub.semester === '5' ? '3rd Year (Sem 5)' :
                               matchedSub.year === 'IV' || matchedSub.semester === '7' ? '4th Year (Sem 7)' :
                               `Sem ${matchedSub.semester || '5'}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(lab)}
                        className="p-1.5 text-gray-400 hover:text-luna-primary-blue dark:hover:text-cyan-400 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800"
                        title="Edit Lab"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingLab(lab)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Delete Lab"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {assignedFaculty && (
                    <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs flex items-center">
                      <UserCheck className="w-3.5 h-3.5 mr-1.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span className="truncate">Faculty: <strong className="font-semibold">{assignedFaculty}</strong></span>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 block">Session Length</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center mt-0.5">
                        <Clock className="w-3.5 h-3.5 mr-1 text-gray-400 dark:text-gray-500" />
                        {lab.duration || 2} Continuous Periods
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 block">Preferred Time</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5 block">
                        {lab.preferredPeriod || 'Period 6 + 7'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 block">Capacity</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5 block">
                        {lab.capacity || 35} Students
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 block">Status</span>
                      <span className={`inline-flex items-center mt-0.5 font-medium ${lab.active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {lab.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingLab}
        onClose={() => setDeletingLab(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Laboratory"
        itemName={deletingLab ? `${deletingLab.labCode} — ${deletingLab.labName}` : undefined}
        description="Are you sure you want to delete this lab? Lab sessions scheduled in this facility will be unassigned."
        isDeleting={isDeleting}
      />

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-luna-dark-navy text-lg">
                  {editingLab ? 'Edit Laboratory' : 'Add New Laboratory'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Lab Code / Subject Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. CD3581 or LAB-01"
                    value={formData.labCode}
                    onChange={(e) => setFormData({ ...formData, labCode: e.target.value.toUpperCase() })}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Auto-syncs with matching Subject codes in the Subjects catalog.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Laboratory Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Networks and Security Laboratory"
                    value={formData.labName}
                    onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Continuous Periods
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 2 })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Batch Capacity
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 35 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Preferred Session Slot
                  </label>
                  <select
                    value={formData.preferredPeriod || 'Afternoon'}
                    onChange={(e) => setFormData({ ...formData, preferredPeriod: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-luna-primary-blue"
                  >
                    <option value="Afternoon">Afternoon (Periods 6 & 7)</option>
                    <option value="Morning">Morning</option>
                    <option value="Any">Any Slot</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="activeLab"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded text-luna-primary-blue focus:ring-luna-primary-blue border-gray-300"
                  />
                  <label htmlFor="activeLab" className="text-sm font-medium text-gray-700">
                    Active (Available for Timetable Scheduling)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="font-semibold">
                    {isSubmitting ? 'Saving...' : editingLab ? 'Update Lab' : 'Create Lab'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

