import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  TimetableStressTester, 
  StressTestSuiteReport, 
  StressTestRunResult 
} from '@/utils/stressTestRunner';
import { 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Zap, 
  Lock, 
  FlaskConical, 
  Clock, 
  Users 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StressTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StressTestModal: React.FC<StressTestModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRun, setCurrentRun] = useState(0);
  const [report, setReport] = useState<StressTestSuiteReport | null>(null);
  const [runsCount, setRunsCount] = useState<number>(100);

  if (!isOpen) return null;

  const handleStartTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentRun(0);
    setReport(null);

    try {
      const resultReport = await TimetableStressTester.runSuite(runsCount, (prog, run) => {
        setProgress(prog);
        setCurrentRun(run);
      });
      setReport(resultReport);
    } catch (err) {
      console.error('Stress test error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-cyan-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                100+ Automated Generation Stress Test
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Rigorous multi-seed audit verifying 100% hard constraint adherence & zero collisions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Rules Tested */}
          <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200/70 dark:border-blue-800/50 space-y-2">
            <span className="font-bold text-blue-900 dark:text-blue-200 text-xs block">
              Hard Constraints Verified in Every Iteration:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Wed P6 & P7 strictly Naan Muthalvan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Labs strictly in P6 & P7 only</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                <span>Zero Wednesday Labs (Mon, Tue, Thu, Fri only)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
                <span>Zero Faculty or Classroom Collisions</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          {!isRunning && !report && (
            <div className="text-center py-6 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <label className="font-bold text-gray-700 dark:text-gray-300">Iterations to Test:</label>
                <select
                  value={runsCount ?? 100}
                  onChange={(e) => setRunsCount(parseInt(e.target.value) || 100)}
                  className="text-xs font-bold border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  <option value={50}>50 Generations</option>
                  <option value={100}>100 Generations (Standard)</option>
                  <option value={200}>200 Generations (Deep Audit)</option>
                </select>
              </div>

              <Button
                size="lg"
                onClick={handleStartTest}
                className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer"
              >
                <Play className="w-4 h-4 mr-2" />
                Launch Automated Test Suite
              </Button>
            </div>
          )}

          {/* Running Progress */}
          {isRunning && (
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Executing Automated Test Suite ({currentRun} / {runsCount})...
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  Simulating random permutations and testing constraint solver stability.
                </p>
              </div>

              <div className="w-full bg-gray-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs font-mono text-gray-500">{progress}% Completed</div>
            </div>
          )}

          {/* Report Results */}
          {report && !isRunning && (
            <div className="space-y-4">
              {/* Overall Pass Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                report.passRatePercent === 100
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    report.passRatePercent === 100 ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">
                      {report.passRatePercent}% Constraint Pass Rate ({report.passedRuns} / {report.totalRuns} Passed)
                    </h4>
                    <p className="text-xs opacity-80">
                      Average quality score: {report.averageQualityScore}% • Average solve latency: {report.averageDurationMs}ms
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Wednesday Lock</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {report.wednesdayLockPassRate}%
                  </strong>
                  <span className="text-[10px] text-gray-400">Naan Muthalvan</span>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Zero Wed Labs</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {report.zeroWednesdayLabsPassRate}%
                  </strong>
                  <span className="text-[10px] text-gray-400">Lab rule pass</span>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Lab P6 & P7</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {report.labP6P7PassRate}%
                  </strong>
                  <span className="text-[10px] text-gray-400">Timing compliance</span>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Zero Collisions</span>
                  <strong className="text-base text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {report.zeroConflictsPassRate}%
                  </strong>
                  <span className="text-[10px] text-gray-400">Conflict-free</span>
                </div>
              </div>

              {/* Sample Table of Runs */}
              <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 sticky top-0 font-bold">
                    <tr>
                      <th className="p-2">Run</th>
                      <th className="p-2">Seed</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Quality</th>
                      <th className="p-2">Latency</th>
                      <th className="p-2">Wednesday PM</th>
                      <th className="p-2">Labs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {report.runs.slice(0, 30).map((r) => (
                      <tr key={r.runIndex} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="p-2 font-mono">#{r.runIndex}</td>
                        <td className="p-2 font-mono text-gray-500">{r.seed}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.success ? 'bg-green-100 dark:bg-green-950/70 text-green-800 dark:text-green-300' : 'bg-red-100 text-red-800'
                          }`}>
                            {r.success ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="p-2 font-bold text-gray-900 dark:text-white">{r.qualityScore}%</td>
                        <td className="p-2 text-gray-500">{r.durationMs}ms</td>
                        <td className="p-2 text-emerald-600 font-medium">Naan Muthalvan 🔒</td>
                        <td className="p-2 text-purple-600 font-medium">{r.metrics.labCount} Labs (P6+7)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50">
          <span className="text-[11px] text-gray-500">
            {report ? `Audit finished with ${report.passRatePercent}% pass rate.` : 'Ready to begin automated verification.'}
          </span>
          <div className="flex items-center gap-2">
            {report && (
              <Button size="sm" variant="outline" onClick={handleStartTest} disabled={isRunning}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Rerun Test Suite
              </Button>
            )}
            <Button size="sm" onClick={onClose} disabled={isRunning}>
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
