import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  Layers,
  Users,
  BookOpen,
  DoorOpen,
  FlaskConical,
  BarChart3,
  Bell,
  Settings,
  ShieldAlert,
  Bot,
  ArrowRight,
  Clock,
  Command,
  X,
} from 'lucide-react';
import { StaffProfile, Subject, Room } from '@/types/timetable';
import { getStaffList } from '@/services/staffService';
import { getSubjects } from '@/services/subjectService';
import { getRooms } from '@/services/roomService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  role?: 'admin' | 'staff';
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Actions' | 'Navigation' | 'Staff' | 'Subjects' | 'Rooms';
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  role = 'admin',
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      loadContextData();
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const loadContextData = async () => {
    try {
      const [st, sub, rm] = await Promise.all([
        getStaffList(),
        getSubjects(),
        getRooms(),
      ]);
      setStaffList(st);
      setSubjects(sub);
      setRooms(rm);
    } catch (err) {
      console.warn('Failed to load command palette data:', err);
    }
  };

  // Base navigation commands
  const defaultCommands: CommandItem[] = role === 'admin' ? [
    {
      id: 'nav-dashboard',
      title: 'Admin Dashboard',
      subtitle: 'Overview, health metrics & timetable status',
      category: 'Navigation',
      icon: <Layers className="w-4 h-4 text-blue-500" />,
      action: () => navigate('/admin/dashboard'),
    },
    {
      id: 'act-generate',
      title: 'Generate Timetable',
      subtitle: 'Run AI automated scheduling algorithm',
      category: 'Actions',
      icon: <Layers className="w-4 h-4 text-emerald-500" />,
      action: () => navigate('/admin/generate'),
    },
    {
      id: 'nav-timetable',
      title: 'Timetable Editor',
      subtitle: 'Interactive 3-column drag-and-drop grid',
      category: 'Navigation',
      icon: <Calendar className="w-4 h-4 text-cyan-600" />,
      action: () => navigate('/admin/timetable'),
    },
    {
      id: 'nav-staff',
      title: 'Manage Faculty & Staff',
      subtitle: 'Staff profiles, codes, hours and assignments',
      category: 'Navigation',
      icon: <Users className="w-4 h-4 text-indigo-500" />,
      action: () => navigate('/admin/staff'),
    },
    {
      id: 'nav-subjects',
      title: 'Manage Subjects & Curriculum',
      subtitle: 'Theory, lab & elective subject configurations',
      category: 'Navigation',
      icon: <BookOpen className="w-4 h-4 text-amber-500" />,
      action: () => navigate('/admin/subjects'),
    },
    {
      id: 'nav-rooms',
      title: 'Manage Rooms & Classrooms',
      subtitle: 'Physical classrooms and floor capacities',
      category: 'Navigation',
      icon: <DoorOpen className="w-4 h-4 text-teal-500" />,
      action: () => navigate('/admin/rooms'),
    },
    {
      id: 'nav-labs',
      title: 'Manage Laboratories',
      subtitle: 'Lab codes, multi-period duration & constraints',
      category: 'Navigation',
      icon: <FlaskConical className="w-4 h-4 text-pink-500" />,
      action: () => navigate('/admin/labs'),
    },
    {
      id: 'nav-notifications',
      title: 'System Notifications',
      subtitle: 'Published schedule and conflict alerts',
      category: 'Navigation',
      icon: <Bell className="w-4 h-4 text-amber-600" />,
      action: () => navigate('/admin/notifications'),
    },
    {
      id: 'nav-settings',
      title: 'College Settings & Rules',
      subtitle: 'Academic year, rules, availability & AI config',
      category: 'Navigation',
      icon: <Settings className="w-4 h-4 text-gray-500" />,
      action: () => navigate('/admin/settings'),
    },
  ] : [
    {
      id: 'nav-staff-dashboard',
      title: 'Staff Dashboard',
      subtitle: "Today's schedule and next class",
      category: 'Navigation',
      icon: <Layers className="w-4 h-4 text-blue-500" />,
      action: () => navigate('/staff/dashboard'),
    },
    {
      id: 'nav-staff-timetable',
      title: 'My Weekly Timetable',
      subtitle: 'Personalized schedule and calendar view',
      category: 'Navigation',
      icon: <Calendar className="w-4 h-4 text-cyan-600" />,
      action: () => navigate('/staff/timetable'),
    },
    {
      id: 'nav-staff-dept',
      title: 'Department Master Timetable',
      subtitle: 'Full branch schedule view',
      category: 'Navigation',
      icon: <Clock className="w-4 h-4 text-indigo-500" />,
      action: () => navigate('/staff/department-timetable'),
    },
    {
      id: 'nav-staff-notif',
      title: 'My Notifications',
      subtitle: 'Schedule releases and department updates',
      category: 'Navigation',
      icon: <Bell className="w-4 h-4 text-amber-500" />,
      action: () => navigate('/staff/notifications'),
    },
  ];

  // Dynamic entities from search query
  const staffCommands: CommandItem[] = staffList.map((st) => ({
    id: `staff-${st.staffCode}`,
    title: `${st.name} (${st.staffCode})`,
    subtitle: `Faculty • ${st.department || 'CSE'}`,
    category: 'Staff',
    icon: <Users className="w-4 h-4 text-indigo-500" />,
    action: () => {
      navigate('/admin/staff');
    },
  }));

  const subjectCommands: CommandItem[] = subjects.map((sub) => ({
    id: `sub-${sub.subjectCode}`,
    title: `${sub.subjectName} (${sub.subjectCode})`,
    subtitle: `${sub.type} • ${sub.weeklyHours} hrs/wk • Assigned: ${sub.assignedStaff?.join(', ') || 'None'}`,
    category: 'Subjects',
    icon: <BookOpen className="w-4 h-4 text-amber-500" />,
    action: () => {
      navigate('/admin/subjects');
    },
  }));

  const roomCommands: CommandItem[] = rooms.map((rm) => ({
    id: `room-${rm.roomNumber}`,
    title: `Room ${rm.roomNumber} ${rm.roomName ? `(${rm.roomName})` : ''}`,
    subtitle: `${rm.type} • Capacity: ${rm.capacity}`,
    category: 'Rooms',
    icon: <DoorOpen className="w-4 h-4 text-teal-500" />,
    action: () => {
      navigate('/admin/rooms');
    },
  }));

  const allCommands = [
    ...defaultCommands,
    ...staffCommands,
    ...subjectCommands,
    ...roomCommands,
  ];

  const filteredCommands = allCommands.filter((cmd) => {
    if (!query) return cmd.category === 'Navigation' || cmd.category === 'Actions';
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle?.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search faculty, subjects, rooms..."
            value={query || ''}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-slate-800 text-gray-500 rounded border border-gray-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-gray-50 dark:divide-slate-800/40">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-xs">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No matching commands or entities found for "{query}"</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-blue-50 dark:bg-slate-800/90 text-luna-dark-navy dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xs shrink-0">
                    {cmd.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{cmd.title}</p>
                    {cmd.subtitle && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {cmd.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800">
                    {cmd.category}
                  </span>
                  {idx === selectedIndex && (
                    <ArrowRight className="w-3.5 h-3.5 text-luna-primary-blue dark:text-cyan-400" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700">↑</kbd>{' '}
              <kbd className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700">↵</kbd> to select
            </span>
          </div>
          <span className="text-[10px] font-semibold text-gray-500">NCE TIMECRAFT</span>
        </div>
      </div>
    </div>
  );
};
