import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Sparkles,
  Shield,
  Database,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  Mail,
  School,
  Calendar,
  Layers,
} from 'lucide-react';
import { CollegeSettings } from '@/types/timetable';
import { getCollegeSettings, saveCollegeSettings } from '@/services/settingsService';
import { seedInitialDataset } from '@/services/seedService';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { logAuditEvent } from '@/services/auditService';
import { getCurrentEngineeringAcademicYear } from '@/utils/dateUtils';

export default function AdminSettings() {
  const [settings, setSettings] = useState<CollegeSettings>({
    collegeName: 'National College of Engineering',
    collegeCode: 'NCE-9513',
    department: 'Computer Science and Engineering',
    academicYear: getCurrentEngineeringAcademicYear(),
    semester: 4,
    hodName: 'Dr. S. Sundaram, Ph.D.',
    principalName: 'Dr. M. Ramanathan, Ph.D.',
    workingDaysPerWeek: 5,
    periodsPerDay: 7,
    periodDurationMinutes: 50,
    naanMudhalvanDay: 'WEDNESDAY',
    naanMudhalvanSlots: [5, 6, 7],
    enableAiAssistant: true,
    notificationEmails: ['admin@nce.edu.in', 'hod.cse@nce.edu.in'],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getCollegeSettings();
      setSettings((prev) => ({
        ...prev,
        ...data,
        collegeName: data.collegeName || prev.collegeName || '',
        collegeCode: data.collegeCode || prev.collegeCode || '',
        department: data.department || prev.department || '',
        academicYear: data.academicYear || prev.academicYear || '',
        hodName: data.hodName || prev.hodName || '',
        principalName: data.principalName || prev.principalName || '',
        workingDaysPerWeek: data.workingDaysPerWeek ?? prev.workingDaysPerWeek ?? 5,
        periodsPerDay: data.periodsPerDay ?? prev.periodsPerDay ?? 7,
        periodDurationMinutes: data.periodDurationMinutes ?? prev.periodDurationMinutes ?? 50,
      }));
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveCollegeSettings(settings);
      await logAuditEvent('UPDATE_SETTINGS', 'SETTINGS', 'college_config', 'Updated institutional configuration parameters');
      toast.success('Institutional configuration saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSeed = async () => {
    setIsResetting(true);
    try {
      const res = await seedInitialDataset(true);
      await logAuditEvent('SEED_DATABASE', 'SETTINGS', 'system', 'Re-seeded Section 48 master dataset');
      toast.success(res.message);
      setSeedModalOpen(false);
      await loadSettings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to re-seed');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `NCE_Timecraft_Config_${settings.academicYear}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Configuration backup exported');
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={seedModalOpen}
        onClose={() => setSeedModalOpen(false)}
        onConfirm={handleResetSeed}
        title="Reset and Re-Seed Master Dataset?"
        message="This will reset Section 48 faculty, subjects, laboratories, lecture rooms, and time-slots to official college defaults. Proceed?"
        confirmText="Confirm Re-Seed"
        type="danger"
        loading={isResetting}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-luna-primary-blue dark:text-cyan-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Institutional Settings & Academic Setup
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure college identifiers, academic calendar years, bell timings, and administrative parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Backup Config</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: College Identity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <Building2 className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Institution & Department Identity
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  College / University Name
                </label>
                <input
                  type="text"
                  value={settings.collegeName || ''}
                  onChange={(e) => setSettings({ ...settings, collegeName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-luna-primary-blue"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  College Code / Counseling Code
                </label>
                <input
                  type="text"
                  value={settings.collegeCode || ''}
                  onChange={(e) => setSettings({ ...settings, collegeCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-luna-primary-blue"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  Department Name
                </label>
                <input
                  type="text"
                  value={settings.department || ''}
                  onChange={(e) => setSettings({ ...settings, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-luna-primary-blue"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={settings.academicYear || ''}
                  onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-luna-primary-blue"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  Head of Department (HOD)
                </label>
                <input
                  type="text"
                  value={settings.hodName || ''}
                  onChange={(e) => setSettings({ ...settings, hodName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-luna-primary-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  Principal / Dean
                </label>
                <input
                  type="text"
                  value={settings.principalName || ''}
                  onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-luna-primary-blue"
                />
              </div>
            </div>
          </div>

          {/* Academic Bell Schedule */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <Sliders className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Academic Bell Schedule & Slots
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  Working Days per Week
                </label>
                <input
                  type="number"
                  min="5"
                  max="6"
                  value={settings.workingDaysPerWeek ?? 5}
                  onChange={(e) => setSettings({ ...settings, workingDaysPerWeek: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  Periods per Day
                </label>
                <input
                  type="number"
                  min="6"
                  max="8"
                  value={settings.periodsPerDay ?? 7}
                  onChange={(e) => setSettings({ ...settings, periodsPerDay: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] mb-1.5">
                  Period Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="45"
                  max="60"
                  value={settings.periodDurationMinutes ?? 50}
                  onChange={(e) => setSettings({ ...settings, periodDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-luna-dark-navy hover:bg-luna-deep-blue text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Database Seed & Diagnostics */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Master Database Presets
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Auto-populate Nellai College of Engineering standard 8-faculty, 5-course, 3-lab Section 48 academic model with one-click restoration.
            </p>

            <button
              type="button"
              onClick={() => setSeedModalOpen(true)}
              className="w-full py-2.5 px-4 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Re-Seed Section 48 Dataset</span>
            </button>
          </div>

          {/* Engine Status Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 p-6 rounded-3xl border border-emerald-200/60 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Deterministic Constraint Engine</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Full-Stack verified on Google Cloud Firestore with real-time reactive sync, Anna University regulation rules, and locked Tamil Nadu skill directives.
            </p>
            <div className="pt-2 flex items-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Production Version 5.0 Live</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
