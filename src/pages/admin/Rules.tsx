import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Sliders, Save, CheckCircle2, RefreshCw, Sparkles, ShieldCheck, Sun, Moon, Calendar } from 'lucide-react';
import { getSchedulingRules, saveSchedulingRules, defaultRules } from '@/services/rulesService';
import { SchedulingRules } from '@/types/timetable';
import { toast } from 'react-hot-toast';

export default function AdminRules() {
  const [rules, setRules] = useState<SchedulingRules>(defaultRules);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getSchedulingRules();
      setRules(data);
    } catch (error) {
      console.error('Failed to load rules:', error);
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSchedulingRules(rules);
      toast.success('Scheduling rules saved to Firestore');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    const current = rules.workingDays || [];
    if (current.includes(day)) {
      if (current.length <= 1) {
        toast.error('At least one working day must be enabled');
        return;
      }
      setRules({ ...rules, workingDays: current.filter(d => d !== day) });
    } else {
      setRules({ ...rules, workingDays: [...current, day] });
    }
  };

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Scheduling Rules & Optimization Engine</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tune hard constraints, soft optimization preferences, and institutional workload policies.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={handleSave} disabled={saving} className="font-semibold shadow-sm">
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Saving Rules...' : 'Save Rules'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
          Loading rules configuration...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Working Days */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-luna-primary-blue/10 dark:bg-cyan-950/50 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Institutional Working Days</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Select active instructional days for timetable allocation.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {allDays.map((day) => {
                  const isActive = (rules.workingDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-luna-primary-blue/10 dark:bg-cyan-950/50 border-luna-primary-blue dark:border-cyan-500 text-luna-dark-navy dark:text-cyan-300'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{day}</span>
                        {isActive && <CheckCircle2 className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Academic Hour Defaults */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Course Default Durations</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Standard weekly hours assigned to newly created subjects.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Theory Default Hours (hrs/week)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={rules.theoryDefaultHours}
                    onChange={(e) => setRules({ ...rules, theoryDefaultHours: Number(e.target.value) })}
                    className="text-sm font-semibold"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Recommended: 4 hours (Anna Univ curriculum)</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Lab Session Length (Periods)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={rules.labDefaultDuration}
                    onChange={(e) => setRules({ ...rules, labDefaultDuration: Number(e.target.value) })}
                    className="text-sm font-semibold"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Recommended: 2 continuous periods</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optimization Rules */}
          <Card className="md:col-span-2">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Soft Optimization Preferences</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">These weights influence quality score computation and slot selection order.</p>
                </div>
              </div>

              <div className="space-y-4 pt-2 divide-y divide-gray-100 dark:divide-slate-800">
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center space-x-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Prefer Theory in Morning Periods (09:10 - 12:50)</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Places theoretical lectures when student attention is sharpest.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rules.preferTheoryMorning}
                    onChange={(e) => setRules({ ...rules, preferTheoryMorning: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-luna-primary-blue focus:ring-luna-primary-blue"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center space-x-2">
                      <Moon className="w-4 h-4 text-purple-500" />
                      <span>Prefer Laboratory Sessions in Afternoon (01:40 - 04:20)</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Schedules hands-on practicals during post-lunch continuous slots.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rules.preferLabsAfternoon}
                    onChange={(e) => setRules({ ...rules, preferLabsAfternoon: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-luna-primary-blue focus:ring-luna-primary-blue"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      Avoid Same Theory Subject Consecutively on the Same Day
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Spreads the 4 weekly hours across 4 distinct days.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rules.avoidConsecutiveSameSubject}
                    onChange={(e) => setRules({ ...rules, avoidConsecutiveSameSubject: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-luna-primary-blue focus:ring-luna-primary-blue"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      Max Consecutive Classes for Faculty
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Prevents faculty burnout by capping back-to-back lectures.</p>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={rules.maxConsecutiveClasses}
                      onChange={(e) => setRules({ ...rules, maxConsecutiveClasses: Number(e.target.value) })}
                      className="text-sm font-semibold text-center"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
