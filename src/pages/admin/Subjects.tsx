import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Search, Edit2, Trash2, BookOpen, Clock, UserCheck, X, RefreshCw, Sparkles, Filter, Camera, GraduationCap } from 'lucide-react';
import { getAllSubjects, createSubject, updateSubject, deleteSubject, Subject } from '@/services/subjectService';
import { getAllStaff, StaffProfile } from '@/services/staffService';
import { seedInitialDataset } from '@/services/seedService';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { TimetableImageModal } from '@/components/timetable/TimetableImageModal';
import { YearSelector } from '@/components/common/YearSelector';
import { useYearFilter } from '@/contexts/YearFilterContext';
import { matchYear, CanonicalYear } from '@/utils/yearUtils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const { selectedYear, setSelectedYear, yearConfig } = useYearFilter();
  const [viewYearFilter, setViewYearFilter] = useState<CanonicalYear | 'ALL'>(selectedYear);

  useEffect(() => {
    setViewYearFilter(selectedYear);
  }, [selectedYear]);

  // Delete State
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    type: 'THEORY' as 'THEORY' | 'LAB' | 'SPECIAL',
    weeklyHours: 4,
    assignedStaff: [] as string[],
    department: 'Computer Science & Engineering',
    year: 'II',
    semester: '3',
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subs, staff] = await Promise.all([
        getAllSubjects(),
        getAllStaff(),
      ]);
      setSubjects(subs);
      setStaffList(staff);
    } catch (error) {
      console.error('Failed to fetch subjects data:', error);
      toast.error('Failed to load subjects data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    const activeY = viewYearFilter !== 'ALL' ? viewYearFilter : selectedYear;
    const defaultSem = activeY === 'II' ? '3' : activeY === 'III' ? '5' : '7';
    setEditingSubject(null);
    setFormData({
      subjectCode: '',
      subjectName: '',
      type: 'THEORY',
      weeklyHours: 4,
      assignedStaff: staffList.length > 0 ? [staffList[0].staffCode] : [],
      department: 'Computer Science & Engineering',
      year: activeY,
      semester: defaultSem,
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      subjectCode: subject.subjectCode || '',
      subjectName: subject.subjectName || '',
      type: subject.type || 'THEORY',
      weeklyHours: subject.weeklyHours || 4,
      assignedStaff: subject.assignedStaff || [],
      department: subject.department || 'Computer Science & Engineering',
      year: subject.year || 'II',
      semester: subject.semester || '3',
      active: subject.active !== undefined ? subject.active : true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectCode.trim() || !formData.subjectName.trim()) {
      toast.error('Please enter subject code and name');
      return;
    }

    if (formData.assignedStaff.length === 0) {
      toast.error('Please assign at least one faculty member');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubject?.id) {
        await updateSubject(editingSubject.id, formData);
        toast.success(`Subject "${formData.subjectCode}" updated`);
      } else {
        await createSubject(formData);
        toast.success(`Subject "${formData.subjectCode}" created`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubject) return;
    const targetId = deletingSubject.id || `sub_${deletingSubject.subjectCode}`;
    setIsDeleting(true);
    try {
      await deleteSubject(targetId);
      setSubjects(prev => prev.filter(s => (s.id ? s.id !== targetId : s.subjectCode !== deletingSubject.subjectCode)));
      toast.success(`Subject "${deletingSubject.subjectCode}" deleted`);
      setDeletingSubject(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const q = (searchQuery || '').toLowerCase();
    const code = (s.subjectCode || '').toLowerCase();
    const name = (s.subjectName || '').toLowerCase();
    const staffMatch = Array.isArray(s.assignedStaff) && s.assignedStaff.some(sc => (sc || '').toLowerCase().includes(q));
    
    const matchesSearch = !q || code.includes(q) || name.includes(q) || staffMatch;
    const matchesType = filterType === 'ALL' || s.type === filterType;

    // Year matching
    let matchesYear = true;
    if (viewYearFilter !== 'ALL') {
      matchesYear = matchYear(s.year, viewYearFilter) || s.semester === (viewYearFilter === 'II' ? '3' : viewYearFilter === 'III' ? '5' : '7');
    }

    return matchesSearch && matchesType && matchesYear;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-luna-dark-navy dark:text-white">Subject Management & Staff Allocation</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define theory and lab subjects, weekly hours, and faculty assignments for automatic scheduling.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImageModal(true)}
            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60"
          >
            <Camera className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            Scan Timetable Image
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Subject
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
            allOptionLabel="All Subjects"
            value={viewYearFilter}
            onChange={(y) => {
              setViewYearFilter(y);
              if (y !== 'ALL') setSelectedYear(y);
            }}
          />
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {viewYearFilter === 'ALL' ? (
            <span>Showing all <strong>{subjects.length}</strong> college curriculum subjects</span>
          ) : (
            <span>
              Showing <strong>{filteredSubjects.length}</strong> subjects for <strong>{yearConfig.label} (Semester {yearConfig.defaultSemester})</strong>
            </span>
          )}
        </div>
      </div>

      {/* Filter & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-1 items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              placeholder="Search by code, subject name, or staff..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex items-center space-x-1 border border-gray-200 dark:border-slate-700 rounded-lg p-1 bg-gray-50 dark:bg-slate-800 text-xs">
            {['ALL', 'THEORY', 'LAB', 'SPECIAL'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filterType === t 
                    ? 'bg-white dark:bg-slate-900 text-luna-dark-navy dark:text-white shadow-xs font-semibold' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Subjects: <strong className="text-luna-dark-navy dark:text-white">{filteredSubjects.length}</strong></span>
          <span>Theory Hours: <strong className="text-luna-primary-blue dark:text-cyan-400">{filteredSubjects.filter(s => s.type === 'THEORY').reduce((a, b) => a + (b.weeklyHours || 4), 0)} hrs</strong></span>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-8 px-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Subjects Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
              Loading subjects from Firestore...
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No subjects registered yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                Get started by creating course subjects for your department curriculum.
              </p>
              <Button size="sm" onClick={handleOpenAdd}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Subject
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Subject Code</th>
                    <th className="py-3.5 px-4">Title & Details</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Weekly Hours</th>
                    <th className="py-3.5 px-4">Assigned Faculty</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredSubjects.map((sub, idx) => (
                    <tr key={sub.id || `${sub.subjectCode}_${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-luna-dark-navy dark:text-cyan-300">
                        {sub.subjectCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{sub.subjectName}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">Year {sub.year} • Sem {sub.semester} • {sub.department}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                          sub.type === 'LAB' 
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50' 
                            : sub.type === 'SPECIAL'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                        }`}>
                          {sub.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-gray-700 dark:text-gray-300 font-medium text-xs">
                          <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          <span>{sub.weeklyHours || (sub.type === 'LAB' ? 2 : 4)} hrs/week</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {sub.assignedStaff && sub.assignedStaff.length > 0 ? (
                            sub.assignedStaff.map(sc => {
                              const staffInfo = staffList.find(s => s.staffCode === sc);
                              return (
                                <span 
                                  key={sc}
                                  title={staffInfo?.name || sc}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-luna-primary-blue/10 dark:bg-cyan-950/40 text-luna-dark-navy dark:text-cyan-300 border border-luna-primary-blue/20 dark:border-cyan-800/40"
                                >
                                  {sc}
                                  {staffInfo && <span className="ml-1 text-[10px] font-normal text-gray-500 dark:text-gray-400">({staffInfo.name.split(' ')[1] || staffInfo.name})</span>}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-red-500 dark:text-red-400 font-medium italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1.5 text-gray-400 hover:text-luna-primary-blue dark:hover:text-cyan-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSubject(sub)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingSubject}
        onClose={() => setDeletingSubject(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Subject"
        itemName={deletingSubject ? `${deletingSubject.subjectCode} — ${deletingSubject.subjectName}` : undefined}
        description="Are you sure you want to delete this course from the syllabus? It will no longer be scheduled in the timetable."
        isDeleting={isDeleting}
      />

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 w-full max-w-lg overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
                <h3 className="font-bold text-luna-dark-navy dark:text-white text-lg">
                  {editingSubject ? 'Edit Subject Details' : 'Create New Subject'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Subject Code <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. CS3501"
                      value={formData.subjectCode}
                      onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                      required
                      className="font-mono uppercase text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Subject Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        setFormData({
                          ...formData,
                          type: newType,
                          weeklyHours: newType === 'LAB' ? 2 : 4,
                        });
                      }}
                      className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    >
                      <option value="THEORY">Theory (4 hrs default)</option>
                      <option value="LAB">Laboratory (2 continuous hrs)</option>
                      <option value="SPECIAL">Special / Elective</option>
                    </select>
                  </div>
                </div>

                {formData.type === 'LAB' && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs text-purple-900 dark:text-purple-300 flex items-start space-x-2">
                    <span className="font-bold shrink-0">⚡ Auto-Sync:</span>
                    <span>
                      Saving this practical course will automatically create/update the corresponding facility entry in the <strong>Laboratory Management</strong> section.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Subject Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Compiler Design"
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Weekly Hours
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.weeklyHours}
                      onChange={(e) => setFormData({ ...formData, weeklyHours: Number(e.target.value) })}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Academic Year
                    </label>
                    <select
                      value={formData.year || 'II'}
                      onChange={(e) => {
                        const y = e.target.value;
                        const defaultSem = y === 'II' ? '3' : y === 'III' ? '5' : '7';
                        setFormData({ ...formData, year: y, semester: defaultSem });
                      }}
                      className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium"
                    >
                      <option value="II">2nd Year (Sem 3)</option>
                      <option value="III">3rd Year (Sem 5)</option>
                      <option value="IV">4th Year (Sem 7)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Semester
                    </label>
                    <select
                      value={formData.semester || '3'}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium"
                    >
                      <option value="3">Semester 3 (2nd Yr)</option>
                      <option value="4">Semester 4 (2nd Yr)</option>
                      <option value="5">Semester 5 (3rd Yr)</option>
                      <option value="6">Semester 6 (3rd Yr)</option>
                      <option value="7">Semester 7 (Final Yr)</option>
                      <option value="8">Semester 8 (Final Yr)</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Faculty Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Assigned Faculty Member <span className="text-red-500">*</span>
                  </label>
                  {staffList.length === 0 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      No staff members registered. Please add faculty first in Staff Management or Seed Demo Faculty.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={formData.assignedStaff?.[0] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, assignedStaff: val ? [val] : [] });
                        }}
                        className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium"
                      >
                        <option value="">-- Select Primary Staff Member --</option>
                        {staffList.filter(s => s.active).map((s, idx) => (
                          <option key={s.id || `${s.staffCode}_${idx}`} value={s.staffCode}>
                            {s.staffCode} — {s.name} ({s.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="font-semibold shadow-sm">
                    {isSubmitting ? 'Saving...' : editingSubject ? 'Update Subject' : 'Save Subject'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showImageModal && (
        <TimetableImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onCatalogImported={fetchData}
        />
      )}
    </div>
  );
}
