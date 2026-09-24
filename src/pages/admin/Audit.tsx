import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Layers,
  Sparkles,
  Settings,
  Calendar,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react';
import { AuditLog } from '@/types/timetable';
import { getAuditLogs } from '@/services/auditService';
import { TableSkeleton } from '@/components/common/Skeletons';

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResource, setFilterResource] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filterResource]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(100, undefined, filterResource);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.details?.toLowerCase().includes(q) ||
      l.userName?.toLowerCase().includes(q) ||
      l.userEmail?.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.resource.toLowerCase().includes(q)
    );
  });

  const getActionBadge = (action: string) => {
    if (action.includes('GENERATE') || action.includes('PUBLISH')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {action}
        </span>
      );
    }
    if (action.includes('DELETE')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
          {action}
        </span>
      );
    }
    if (action.includes('AI') || action.includes('AUTO_FIX')) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Audit Event Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Action</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Resource</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedLog.resource}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Performed By</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedLog.userName} ({selectedLog.userEmail})</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Details</span>
                <p className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-gray-700 dark:text-gray-300 font-mono text-[11px] leading-relaxed">
                  {selectedLog.details}
                </p>
              </div>

              {selectedLog.metadata && (
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Metadata Snapshot</span>
                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-xs font-bold rounded-xl text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-luna-primary-blue dark:text-cyan-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Institutional Audit Logs
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Immutable operational and security trail for timetable modifications, scheduling generation, and resource updates.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by action, details, user, or resource..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-luna-primary-blue"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'TIMETABLE', 'STAFF', 'SUBJECT', 'SETTINGS', 'ROOM', 'LAB'].map((res) => (
            <button
              key={res}
              onClick={() => setFilterResource(res)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors shrink-0 ${
                filterResource === res
                  ? 'bg-luna-dark-navy text-white dark:bg-luna-primary-blue'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-800 hover:bg-gray-50'
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin / User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Operation Details</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-gray-500 text-xs">
                      No audit events match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {log.userName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 font-mono text-[11px] whitespace-nowrap">
                        {log.resource}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 line-clamp-1 max-w-xs">
                        {log.details}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                          title="Inspect Event"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
