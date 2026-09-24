import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { updateStaff } from '@/services/staffService';
import { getAllSubjects, Subject } from '@/services/subjectService';
import { BookOpen, CheckCircle2, Save, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StaffProfile() {
  const { authorizedStaff, profile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Computer Science & Engineering',
  });

  const staffCode = authorizedStaff?.staffCode || profile?.staffCode || '';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const subList = await getAllSubjects();
        setSubjects(subList);

        if (authorizedStaff) {
          setFormData({
            name: authorizedStaff.name || profile?.name || '',
            email: authorizedStaff.email || profile?.email || '',
            phone: authorizedStaff.phone || '',
            designation: authorizedStaff.designation || 'Assistant Professor',
            department: authorizedStaff.department || 'Computer Science & Engineering',
          });
        } else if (profile) {
          setFormData({
            name: profile.name || '',
            email: profile.email || '',
            phone: '',
            designation: 'Faculty Member',
            department: 'Computer Science & Engineering',
          });
        }
      } catch (e) {
        console.error('Failed to load profile data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [authorizedStaff, profile]);

  const mySubjects = subjects.filter(s => staffCode && s.assignedStaff?.includes(staffCode));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (!authorizedStaff?.id) {
      toast.error('Unable to update profile: staff record not found');
      return;
    }

    setIsSaving(true);
    try {
      await updateStaff(authorizedStaff.id, {
        phone: formData.phone.trim(),
        designation: formData.designation.trim(),
      });

      toast.success(`Faculty profile updated successfully!`);
    } catch (error: any) {
      console.error('Save profile error:', error);
      toast.error(error.message || 'Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-luna-dark-navy dark:text-white">Faculty Profile</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View your institutional faculty profile, designated staff code, and assigned course loads.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-luna-primary-blue text-white flex items-center justify-center text-xl font-bold shadow-md">
                {staffCode || 'NCE'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {formData.name || authorizedStaff?.name || profile?.name || 'Faculty Member'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-cyan-950/60 text-blue-800 dark:text-cyan-300 border border-blue-200 dark:border-cyan-800/40">
                    Code: {staffCode || 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formData.designation || 'Assistant Professor'} • {formData.department || 'CSE'}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active Faculty
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Full Name
                    </label>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Admin Managed</span>
                  </div>
                  <Input
                    value={formData.name}
                    readOnly
                    disabled
                    className="text-sm font-medium bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Institutional Email
                    </label>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Authorized Identity</span>
                  </div>
                  <Input
                    type="email"
                    value={formData.email}
                    readOnly
                    disabled
                    className="text-sm font-mono bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
                    Designation
                  </label>
                  <Input
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Associate Professor, HOD"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
                    Contact Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Department
                    </label>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Institutional Division</span>
                  </div>
                  <Input
                    value={formData.department}
                    readOnly
                    disabled
                    className="text-sm bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Explicit Save Profile Button */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Profile edits are synchronized with department records.
                </span>
                <Button 
                  type="submit" 
                  disabled={isSaving} 
                  className="font-semibold shadow-md flex items-center bg-luna-primary-blue hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Assigned Courses Overview */}
        <Card className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Course Allocations</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Assigned courses for your profile</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {loading ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 p-4 text-center">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-luna-primary-blue" />
                  Loading courses...
                </div>
              ) : mySubjects.length === 0 ? (
                <div className="text-xs text-gray-600 dark:text-gray-300 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl text-center font-medium">
                  No courses currently assigned to staff code {staffCode || 'N/A'}.
                </div>
              ) : (
                mySubjects.map((s, idx) => (
                  <div key={s.id || `${s.subjectCode}_${idx}`} className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-luna-dark-navy dark:text-cyan-300">{s.subjectCode}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-cyan-200 border border-blue-200 dark:border-blue-800">
                        {s.type}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs mt-1 line-clamp-1">{s.subjectName}</div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 font-medium">{s.weeklyHours} hours/week</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

