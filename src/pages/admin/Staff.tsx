import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Search, Edit2, Trash2, UserCheck, UserX, X, RefreshCw, Sparkles, BookOpen, Save, Check, Phone, Briefcase, Building2, Mail, User, GraduationCap } from 'lucide-react';
import { getAllStaff, createStaff, updateStaff, deleteStaff, StaffProfile } from '@/services/staffService';
import { getAllSubjects } from '@/services/subjectService';
import { Subject } from '@/types/timetable';
import { seedInitialDataset } from '@/services/seedService';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { YearSelector } from '@/components/common/YearSelector';
import { useYearFilter } from '@/contexts/YearFilterContext';
import { matchYear, CanonicalYear } from '@/utils/yearUtils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminStaff() {
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);

  const { selectedYear, setSelectedYear, yearConfig } = useYearFilter();
  const [viewYearFilter, setViewYearFilter] = useState<CanonicalYear | 'ALL'>('ALL');
  const [filterOnlyAssignedInYear, setFilterOnlyAssignedInYear] = useState(false);

  // Inline edit state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<{
    name: string;
    email: string;
    designation: string;
    department: string;
    active: boolean;
  }>({
    name: '',
    email: '',
    designation: '',
    department: 'Computer Science & Engineering',
    active: true,
  });
  const [isInlineSaving, setIsInlineSaving] = useState(false);

  // Delete confirmation state
  const [deletingStaff, setDeletingStaff] = useState<StaffProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal Form State
  const [formData, setFormData] = useState({
    staffCode: '',
    name: '',
    email: '',
    designation: 'Assistant Professor',
    phone: '',
    department: 'Computer Science & Engineering',
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const [staffData, subjectsData] = await Promise.all([
        getAllStaff(),
        getAllSubjects(),
      ]);
      setStaffList(staffData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      staffCode: '',
      name: '',
      email: '',
      designation: 'Assistant Professor',
      phone: '',
      department: 'Computer Science & Engineering',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffProfile) => {
    setEditingStaff(staff);
    setFormData({
      staffCode: staff.staffCode || '',
      name: staff.name || '',
      email: staff.email || '',
      designation: staff.designation || 'Assistant Professor',
      phone: staff.phone || '',
      department: staff.department || 'Computer Science & Engineering',
      active: staff.active !== undefined ? staff.active : true,
    });
    setIsModalOpen(true);
  };

  const handleStartInlineEdit = (staff: StaffProfile) => {
    const id = staff.id || staff.staffCode;
    setInlineEditingId(id);
    setInlineData({
      name: staff.name || '',
      email: staff.email || '',
      designation: staff.designation || 'Assistant Professor',
      department: staff.department || 'Computer Science & Engineering',
      active: staff.active !== undefined ? staff.active : true,
    });
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  const handleSaveInlineEdit = async (staff: StaffProfile) => {
    const targetId = staff.id || `staff_${staff.staffCode}`;
    if (!inlineData.name.trim() || !inlineData.email.trim()) {
      toast.error('Name and email cannot be empty');
      return;
    }

    setIsInlineSaving(true);
    try {
      await updateStaff(targetId, {
        name: inlineData.name.trim(),
        email: inlineData.email.trim(),
        designation: inlineData.designation.trim(),
        department: inlineData.department,
        active: inlineData.active,
      });

      // Update local state immediately
      setStaffList(prev => prev.map(s => {
        if ((s.id && s.id === targetId) || s.staffCode === staff.staffCode) {
          return {
            ...s,
            name: inlineData.name.trim(),
            email: inlineData.email.trim(),
            designation: inlineData.designation.trim(),
            department: inlineData.department,
            active: inlineData.active,
          };
        }
        return s;
      }));

      toast.success(`Saved changes for ${staff.staffCode} (${inlineData.name})`);
      setInlineEditingId(null);
    } catch (error: any) {
      console.error('Inline save error:', error);
      toast.error(error.message || 'Failed to save staff updates');
    } finally {
      setIsInlineSaving(false);
    }
  };

  const handleToggleActiveStatus = async (staff: StaffProfile) => {
    const targetId = staff.id || `staff_${staff.staffCode}`;
    const newStatus = !staff.active;
    try {
      await updateStaff(targetId, { active: newStatus });
      setStaffList(prev => prev.map(s => {
        if ((s.id && s.id === targetId) || s.staffCode === staff.staffCode) {
          return { ...s, active: newStatus };
        }
        return s;
      }));
      toast.success(`Staff "${staff.staffCode}" marked as ${newStatus ? 'Active' : 'Inactive'} & saved`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staffCode.trim() || !formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields (Staff Code, Name, and Email)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff?.id || editingStaff?.staffCode) {
        const targetId = editingStaff.id || `staff_${editingStaff.staffCode}`;
        await updateStaff(targetId, formData);
        toast.success(`Staff "${formData.staffCode}" updated and saved successfully!`);
      } else {
        await createStaff(formData);
        toast.success(`Staff member "${formData.name}" (${formData.staffCode}) added and saved!`);
      }
      setIsModalOpen(false);
      await fetchStaff();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    const targetId = deletingStaff.id || `staff_${deletingStaff.staffCode}`;
    setIsDeleting(true);
    try {
      await deleteStaff(targetId);
      // Optimistic update
      setStaffList(prev => prev.filter(s => (s.id ? s.id !== targetId : s.staffCode !== deletingStaff.staffCode)));
      toast.success(`Staff member "${deletingStaff.name}" deleted successfully`);
      setDeletingStaff(null);
      await fetchStaff();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete staff member');
    } finally {
      setIsDeleting(false);
    }
  };

  // Active Year Subjects based on viewYearFilter
  const activeYearSubjects = viewYearFilter === 'ALL'
    ? subjects
    : subjects.filter(s => matchYear(s.year, viewYearFilter) || s.semester === (viewYearFilter === 'II' ? '3' : viewYearFilter === 'III' ? '5' : '7'));

  // Assigned Staff Codes for the selected year
  const assignedCodes = new Set(
    activeYearSubjects.flatMap(s => (s.assignedStaff || []).map(c => (c || '').toUpperCase().trim()))
  );

  const filteredStaff = staffList.filter(s => {
    const q = (searchQuery || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    const code = (s.staffCode || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const designation = (s.designation || '').toLowerCase();
    const department = (s.department || '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || code.includes(q) || email.includes(q) || designation.includes(q) || department.includes(q);

    if (!matchesSearch) return false;

    // If a specific year is selected and user specifically enabled filterOnlyAssignedInYear
    if (viewYearFilter !== 'ALL' && filterOnlyAssignedInYear) {
      return assignedCodes.has((s.staffCode || '').toUpperCase().trim());
    }

    return true;
  });

  const getStaffAssignedSubjects = (staffCode: string) => {
    const codeUpper = (staffCode || '').toUpperCase().trim();
    return activeYearSubjects.filter(s =>
      Array.isArray(s.assignedStaff) && s.assignedStaff.some(c => (c || '').toUpperCase().trim() === codeUpper)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-luna-dark-navy dark:text-white">Faculty & Staff Management</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Year-wise faculty allocation and profiles. Staff accounts are shared across years without duplication.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button size="sm" onClick={handleOpenAdd} className="font-semibold shadow-sm flex items-center">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Year Selector Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Select Year:
          </span>
          <YearSelector
            showAllOption
            allOptionLabel="All Faculty"
            value={viewYearFilter}
            onChange={(y) => {
              setViewYearFilter(y);
              if (y !== 'ALL') setSelectedYear(y);
            }}
          />
        </div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {viewYearFilter === 'ALL' ? (
            <span>Showing all <strong>{staffList.length}</strong> college faculty accounts</span>
          ) : (
            <span>
              Showing <strong>{filteredStaff.length}</strong> faculty teaching <strong>{yearConfig.label} (Semester {yearConfig.defaultSemester})</strong>
            </span>
          )}
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Search by code, name, designation, email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Current View: <strong className="text-luna-dark-navy dark:text-white">{filteredStaff.length}</strong></span>
          <span>Total Registered: <strong className="text-gray-700 dark:text-gray-300">{staffList.length}</strong></span>
          <span>Active: <strong className="text-green-600 dark:text-green-400">{staffList.filter(s => s.active).length}</strong></span>
          <Button variant="outline" size="sm" onClick={fetchStaff} className="h-8 px-2" title="Refresh Staff List">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Staff Table */}
      <Card className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
              Loading faculty members from Firestore...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No staff members found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                {searchQuery ? 'No results matched your search query.' : 'Get started by creating staff profiles.'}
              </p>
              <Button size="sm" onClick={handleOpenAdd}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Staff Member
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Staff Code</th>
                    <th className="py-3.5 px-4">Faculty Name & Designation</th>
                    <th className="py-3.5 px-4">
                      {viewYearFilter === 'ALL' ? 'Assigned Courses' : `Teaching Courses (${yearConfig.shortName})`}
                    </th>
                    <th className="py-3.5 px-4">Email Address</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredStaff.map((staff, idx) => {
                    const isInline = inlineEditingId === (staff.id || staff.staffCode);
                    const assigned = getStaffAssignedSubjects(staff.staffCode);

                    if (isInline) {
                      return (
                        <tr key={staff.id || `${staff.staffCode}_${idx}`} className="bg-blue-50/50 dark:bg-slate-800/80">
                          <td className="py-3 px-4 font-mono font-bold text-luna-dark-navy dark:text-cyan-300">
                            {staff.staffCode}
                          </td>
                          <td className="py-3 px-4 space-y-1.5 min-w-[200px]">
                            <Input
                              value={inlineData.name}
                              onChange={(e) => setInlineData({ ...inlineData, name: e.target.value })}
                              placeholder="Full Name"
                              className="h-8 text-xs font-semibold"
                            />
                            <Input
                              value={inlineData.designation}
                              onChange={(e) => setInlineData({ ...inlineData, designation: e.target.value })}
                              placeholder="Designation (e.g. Associate Professor)"
                              className="h-7 text-[11px]"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {assigned.map(sub => (
                                <span key={sub.id || sub.subjectCode} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 font-mono">
                                  {sub.subjectCode}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 min-w-[180px]">
                            <Input
                              type="email"
                              value={inlineData.email}
                              onChange={(e) => setInlineData({ ...inlineData, email: e.target.value })}
                              placeholder="Email"
                              className="h-8 text-xs font-mono"
                            />
                          </td>
                          <td className="py-3 px-4 min-w-[160px]">
                            <select
                              value={inlineData.department || 'Computer Science & Engineering'}
                              onChange={(e) => setInlineData({ ...inlineData, department: e.target.value })}
                              className="h-8 text-xs w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-2"
                            >
                              <option value="Computer Science & Engineering">CSE</option>
                              <option value="Information Technology">IT</option>
                              <option value="Electronics & Communication">ECE</option>
                              <option value="Mechanical Engineering">MECH</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={inlineData.active}
                                onChange={(e) => setInlineData({ ...inlineData, active: e.target.checked })}
                                className="rounded border-gray-300 text-luna-primary-blue focus:ring-luna-primary-blue h-4 w-4"
                              />
                              <span className={inlineData.active ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-400'}>
                                {inlineData.active ? 'Active' : 'Inactive'}
                              </span>
                            </label>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveInlineEdit(staff)}
                                disabled={isInlineSaving}
                                className="h-8 px-3 text-xs font-bold bg-green-600 hover:bg-green-700 text-white flex items-center shadow-xs"
                              >
                                <Save className="w-3.5 h-3.5 mr-1" />
                                {isInlineSaving ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelInlineEdit}
                                disabled={isInlineSaving}
                                className="h-8 px-2.5 text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={staff.id || `${staff.staffCode}_${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-luna-primary-blue/10 dark:bg-cyan-950/40 text-luna-primary-blue dark:text-cyan-300 border border-luna-primary-blue/20 dark:border-cyan-800/40 font-mono">
                            {staff.staffCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-luna-dark-navy dark:text-white flex items-center space-x-1.5">
                            <span>{staff.name}</span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {staff.designation || 'Assistant Professor'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {assigned.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {assigned.map((sub) => (
                                <span
                                  key={sub.id || sub.subjectCode}
                                  title={`${sub.subjectName} (${sub.type})`}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-800/60"
                                >
                                  {sub.subjectCode}
                                  {sub.type === 'LAB' && <span className="ml-1 text-[9px] font-normal opacity-70">Lab</span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No assigned courses</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-mono text-gray-600 dark:text-gray-300">{staff.email}</div>
                          {staff.phone && <div className="text-[11px] text-gray-400 mt-0.5">{staff.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{staff.department}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleActiveStatus(staff)}
                            title="Click to toggle active status and save"
                            className="group transition-transform hover:scale-105"
                          >
                            {staff.active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50">
                                <UserCheck className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                                <UserX className="w-3 h-3 mr-1 text-gray-400" /> Inactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleStartInlineEdit(staff)}
                              className="px-2 py-1 text-xs font-semibold text-luna-primary-blue dark:text-cyan-400 hover:bg-luna-primary-blue/10 dark:hover:bg-cyan-950/40 rounded-md transition-colors flex items-center"
                              title="Quick inline edit & save"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Quick Edit
                            </button>
                            <button
                              onClick={() => handleOpenEdit(staff)}
                              className="p-1.5 text-gray-400 hover:text-luna-primary-blue dark:hover:text-cyan-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                              title="Full Edit Form"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingStaff(staff)}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Delete Staff"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingStaff}
        onClose={() => setDeletingStaff(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Staff Member"
        itemName={deletingStaff ? `${deletingStaff.staffCode} — ${deletingStaff.name} (${deletingStaff.department})` : undefined}
        description="Are you sure you want to delete this faculty member? Any subjects allocated to them may need to be reassigned."
        isDeleting={isDeleting}
      />

      {/* Add / Edit Modal with explicit Save Button */}
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
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-luna-primary-blue/10 dark:bg-cyan-950/50 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-luna-dark-navy dark:text-white text-lg">
                      {editingStaff ? `Edit Faculty: ${editingStaff.staffCode}` : 'Add New Faculty Member'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {editingStaff ? 'Update staff details and click Save Changes to persist.' : 'Fill in profile information and save to Firestore.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Staff Code <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. JT, UP, CS101"
                      value={formData.staffCode}
                      onChange={(e) => setFormData({ ...formData, staffCode: e.target.value })}
                      required
                      className="font-mono uppercase text-sm"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Unique initials/code used in timetable slots.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Designation
                    </label>
                    <Input
                      placeholder="e.g. Associate Professor, HOD"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Dr. J. Tamilarsi M.E., Ph.D."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="e.g. tamilarsi@nce.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Phone Number (Optional)
                    </label>
                    <Input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department || 'Computer Science & Engineering'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering (CSE)</option>
                    <option value="Information Technology">Information Technology (IT)</option>
                    <option value="Electronics & Communication">Electronics & Communication (ECE)</option>
                    <option value="Mechanical Engineering">Mechanical Engineering (MECH)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-2 bg-gray-50/70 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-200/70 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="staff-active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-gray-300 text-luna-primary-blue focus:ring-luna-primary-blue h-4 w-4"
                  />
                  <label htmlFor="staff-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Active Faculty Member (Available for automatic timetable scheduling & subject allocation)
                  </label>
                </div>

                {/* Explicit Action & Save Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {editingStaff ? 'Changes will be saved immediately.' : 'New faculty profile will be stored.'}
                  </span>
                  <div className="flex items-center space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="font-semibold shadow-md flex items-center bg-luna-primary-blue hover:bg-blue-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      {isSubmitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Save Staff Member'}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

