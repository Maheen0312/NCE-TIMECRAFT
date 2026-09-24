import React, { useState } from 'react';
import { Timetable, ValidationResult, Subject, StaffProfile, Room, AiTimetableSuggestion, AiAnalysisResult } from '@/types/timetable';
import { askAiAssistant, analyzeTimetableWithAI } from '@/services/aiService';
import { Button } from '@/components/ui/Button';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ArrowRight, 
  Check, 
  X, 
  RefreshCw, 
  HelpCircle, 
  Activity, 
  FileText,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestion?: AiTimetableSuggestion | null;
}

interface AiAssistantPanelProps {
  timetable: Timetable;
  validation?: ValidationResult;
  subjects?: Subject[];
  staff?: StaffProfile[];
  rooms?: Room[];
  onApplySuggestion: (suggestion: AiTimetableSuggestion) => void;
}

const promptSuggestions = [
  'Why is there a conflict on Tuesday?',
  'Why is Wednesday afternoon locked?',
  'Which staff members have highest workload?',
  'Suggest a better slot for Compiler Design',
  'How can I optimize the quality score?'
];

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  timetable,
  validation,
  subjects = [],
  staff = [],
  rooms = [],
  onApplySuggestion,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your NCE Timecraft AI Assistant. I can analyze schedules, explain institutional rules (like Naan Mudhalvan lock), resolve collisions, and suggest timetable optimizations.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await askAiAssistant({
        message: queryText,
        conversationHistory: history,
        timetable,
        validation,
        subjects,
        staff,
        rooms,
      });

      const assistantMsg: Message = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response.message || 'I have analyzed the timetable for you.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestion: response.suggestion || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error('Failed to get response from AI assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeTimetableWithAI({
        timetable,
        validation,
        subjects,
        staff,
        rooms,
      });
      if (res.success && res.analysis) {
        setAnalysisResult(res.analysis);
        setShowAnalysisModal(true);
      } else {
        toast.error(res.error || 'Failed to analyze timetable.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to run analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-3.5 bg-linear-to-r from-luna-dark-navy to-luna-deep-navy text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-luna-light-cyan/20 border border-luna-light-cyan/40 flex items-center justify-center text-luna-light-cyan">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tight">Timecraft AI Assistant</h4>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Institutional Reasoning Engine</span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="text-[11px] h-7 bg-luna-primary-blue hover:bg-luna-steel-blue text-white px-2.5 rounded-lg font-semibold shadow-xs"
        >
          <Activity className="w-3.5 h-3.5 mr-1" />
          {analyzing ? 'Analyzing...' : 'Deep Analysis'}
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 min-h-[300px] max-h-[460px] text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-luna-primary-blue/10 dark:bg-cyan-950/60 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                m.role === 'user'
                  ? 'bg-luna-primary-blue text-white rounded-br-2xs shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-bl-2xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Action Proposal Card if AI Suggested a Timetable Change */}
              {m.suggestion && m.suggestion.change && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-luna-primary-blue/30 dark:border-cyan-500/30 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1 font-bold text-luna-primary-blue dark:text-cyan-400 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Proposed Schedule Optimization</span>
                  </div>

                  <div className="text-[11px] text-gray-700 dark:text-gray-200">
                    <strong>{m.suggestion.change.subjectCode}</strong>: Move from{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {m.suggestion.change.from.day} Period {m.suggestion.change.from.slotIndex + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {m.suggestion.change.to.day} Period {m.suggestion.change.to.slotIndex + 1}
                    </span>
                  </div>

                  {m.suggestion.reason && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                      Reason: {m.suggestion.reason}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => m.suggestion && onApplySuggestion(m.suggestion)}
                      className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <Check className="w-3 h-3 mr-1" /> Apply Change
                    </Button>
                  </div>
                </div>
              )}

              <div
                className={`text-[9px] mt-1 text-right ${
                  m.role === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-luna-primary-blue dark:text-cyan-400" />
            <span>Analyzing timetable constraints with Gemini...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-2.5 bg-gray-50/70 dark:bg-slate-800/70 border-t border-gray-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {promptSuggestions.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="text-[10px] whitespace-nowrap bg-white dark:bg-slate-800 hover:bg-luna-light-cyan/30 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 hover:text-luna-dark-navy dark:hover:text-white border border-gray-200 dark:border-slate-700 hover:border-luna-primary-blue/40 px-2 py-1 rounded-full transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI about rules, faculty load, or moves..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue/30 focus:border-luna-primary-blue"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || loading}
            className="h-8 px-3 rounded-xl bg-luna-primary-blue hover:bg-luna-steel-blue text-white"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>

      {/* Deep Analysis Modal */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-luna-primary-blue/10 dark:bg-cyan-950/60 text-luna-primary-blue dark:text-cyan-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Academic Timetable Analysis</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{timetable.department} • Year {timetable.year} Sem {timetable.semester}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Executive Summary */}
            <div className="bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-100 dark:border-blue-800/80 text-xs leading-relaxed text-gray-800 dark:text-gray-200">
              <div className="font-bold text-blue-900 dark:text-blue-300 mb-1">Executive Summary</div>
              <p>{analysisResult.overallAnalysis}</p>
            </div>

            {/* Strengths & Issues Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/80 space-y-2">
                <h5 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Key Strengths
                </h5>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300 list-disc list-inside">
                  {analysisResult.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/80 space-y-2">
                <h5 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Detected Inefficiencies
                </h5>
                <ul className="space-y-1 text-gray-700 dark:text-gray-300 list-disc list-inside">
                  {analysisResult.issues.map((iss, idx) => (
                    <li key={idx}>{iss}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs space-y-2">
              <h5 className="font-bold text-gray-900 dark:text-white">Optimization Recommendations</h5>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300 list-disc list-inside">
                {analysisResult.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            {/* Quality Score Breakdown */}
            <div className="p-3 bg-gray-100/70 dark:bg-slate-800/70 rounded-xl text-xs text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-200">Quality Score Explanation:</strong> {analysisResult.qualityExplanation}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowAnalysisModal(false)} size="sm">
                Close Analysis
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
