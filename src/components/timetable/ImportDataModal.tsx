import React, { useState } from 'react';
import { ExtractedDataRecord } from '@/types/timetable';
import { extractCurriculumDataWithAI } from '@/services/aiService';
import { upsertSubject } from '@/services/subjectService';
import { upsertStaff } from '@/services/staffService';
import { Button } from '@/components/ui/Button';
import { X, Sparkles, FileText, Check, CheckCheck, Trash2, ArrowRight, RefreshCw, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: string;
  onDataImported: () => void;
}

const sampleSyllabusText = `ANNA UNIVERSITY CHENNAI - AFFILIATED INSTITUTIONS
B.E. COMPUTER SCIENCE AND ENGINEERING - REGULATION 2021
SEMESTER V ALLOCATION SHEET
1. CS3501 - Compiler Design | Theory | 4 Hours | Faculty: Dr. J. Tamilarsi (JT)
2. CS3551 - Distributed Computing | Theory | 3 Hours | Faculty: Dr. R. Ramesh (RR)
3. CS3591 - Computer Networks | Theory | 4 Hours | Faculty: Mrs. S. Priya (SP)
4. CS3511 - Compiler Design Laboratory | Practical / Lab | 2 Hours | Faculty: Dr. J. Tamilarsi (JT)
5. CS3561 - Networks Laboratory | Practical / Lab | 2 Hours | Faculty: Mrs. S. Priya (SP)`;

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  isOpen,
  onClose,
  department,
  onDataImported,
}) => {
  if (!isOpen) return null;

  const [rawText, setRawText] = useState(sampleSyllabusText);
  const [extracting, setExtracting] = useState(false);
  const [extractedRecords, setExtractedRecords] = useState<ExtractedDataRecord[]>([]);
  const [step, setStep] = useState<'INPUT' | 'REVIEW'>('INPUT');
  const [saving, setSaving] = useState(false);

  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error('Please paste some text, syllabus, or allocation rows.');
      return;
    }

    setExtracting(true);
    try {
      const res = await extractCurriculumDataWithAI({
        text: rawText,
        department,
      });

      if (res.success && res.data && res.data.length > 0) {
        setExtractedRecords(res.data);
        setStep('REVIEW');
        toast.success(`Extracted ${res.data.length} academic courses successfully!`);
      } else {
        toast.error(res.error || 'No valid course records found in input text.');
      }
    } catch (err: any) {
      toast.error(err.message || 'AI extraction failed.');
    } finally {
      setExtracting(false);
    }
  };

  const handleToggleStatus = (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setExtractedRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const handleApproveAll = () => {
    setExtractedRecords((prev) => prev.map((r) => ({ ...r, status: 'APPROVED' })));
  };

  const handleSaveToCatalog = async () => {
    const approved = extractedRecords.filter((r) => r.status === 'APPROVED' || r.status === 'PENDING');
    if (approved.length === 0) {
      toast.error('No approved records to save.');
      return;
    }

    setSaving(true);
    try {
      for (const rec of approved) {
        // Save or update subject
        await upsertSubject({
          subjectCode: rec.subjectCode,
          subjectName: rec.subjectName,
          type: rec.type,
          weeklyHours: rec.weeklyHours,
          department: rec.department || department,
          year: 'III',
          semester: '5',
          assignedStaff: [rec.staffCode],
          active: true,
        });

        // Save or update staff
        await upsertStaff({
          name: rec.staffName,
          staffCode: rec.staffCode,
          email: `${rec.staffCode.toLowerCase()}@nce.ac.in`,
          department: rec.department || department,
          active: true,
        });
      }

      toast.success(`Saved ${approved.length} courses & faculty allocations to database!`);
      onDataImported();
      onClose();
    } catch (err: any) {
      console.error('Error saving extracted data:', err);
      toast.error(err.message || 'Error adding extracted records to database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-luna-light-cyan/40 dark:bg-cyan-950/60 text-luna-dark-navy dark:text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-luna-primary-blue dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">AI Syllabus & Curriculum Data Extractor</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Paste syllabus PDFs, Excel exports, or unstructured staff allocation notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'INPUT' ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Paste Syllabus Text, Staff Allotment Sheet, or CSV Data
              </label>
              <textarea
                value={rawText || ''}
                onChange={(e) => setRawText(e.target.value)}
                rows={9}
                className="w-full p-3 font-mono text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue leading-relaxed"
                placeholder="Paste curriculum notes here..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-gray-500 dark:text-gray-400">
                Target Department: <strong className="text-gray-800 dark:text-gray-200">{department}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExtract}
                  disabled={extracting || !rawText.trim()}
                  className="bg-luna-primary-blue hover:bg-luna-steel-blue text-white font-bold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {extracting ? 'Extracting with Gemini AI...' : 'Extract Data Records'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900/60">
              <span className="text-blue-900 dark:text-blue-200 font-semibold">
                Extraction Review: {extractedRecords.length} records parsed. Review before saving to database.
              </span>
              <Button size="sm" variant="outline" onClick={handleApproveAll} className="text-[11px] h-7 bg-white dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700">
                <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> Approve All
              </Button>
            </div>

            {/* Extracted Table */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">Course</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Faculty Assigned</th>
                    <th className="p-2.5">Hours</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {extractedRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/50 ${rec.status === 'REJECTED' ? 'opacity-40 bg-gray-50 dark:bg-slate-800' : ''}`}
                    >
                      <td className="p-2.5">
                        <div className="font-bold text-gray-900 dark:text-white font-mono">{rec.subjectCode}</div>
                        <div className="text-[11px] text-gray-600 dark:text-gray-400">{rec.subjectName}</div>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            rec.type === 'LAB'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {rec.type}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{rec.staffName}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{rec.staffCode}</div>
                      </td>
                      <td className="p-2.5 font-bold text-gray-900 dark:text-white">{rec.weeklyHours} hrs</td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(rec.id, 'APPROVED')}
                            className={`p-1 rounded-lg border cursor-pointer ${
                              rec.status === 'APPROVED'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(rec.id, 'REJECTED')}
                            className={`p-1 rounded-lg border cursor-pointer ${
                              rec.status === 'REJECTED'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setStep('INPUT')}>
                Back to Input
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveToCatalog}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {saving ? 'Saving...' : 'Import to Subjects & Staff Catalog'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
