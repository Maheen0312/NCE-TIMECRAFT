import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Edit2, Trash2, Clock, Coffee, Utensils, Sparkles, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { getAllTimeSlots, saveTimeSlot, updateTimeSlot, deleteTimeSlot, defaultMasterTimeSlots } from '@/services/timeSlotService';
import { TimeSlot } from '@/types/timetable';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminTimeSlots() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  const [formData, setFormData] = useState<{
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    startTime: string;
    endTime: string;
    type: 'CLASS' | 'BREAK' | 'LUNCH' | 'SPECIAL';
    order: number;
    active: boolean;
  }>({
    day: 'Monday',
    startTime: '09:10',
    endTime: '10:00',
    type: 'CLASS',
    order: 0,
    active: true,
  });

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const data = await getAllTimeSlots();
      setSlots(data);
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      toast.error('Failed to load period structure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleOpenAdd = () => {
    setEditingSlot(null);
    setFormData({
      day: 'Monday',
      startTime: '09:10',
      endTime: '10:00',
      type: 'CLASS',
      order: slots.length,
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      order: slot.order,
      active: slot.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSlot?.id && !editingSlot.id.startsWith('default_')) {
        await updateTimeSlot(editingSlot.id, formData);
        toast.success('Period slot updated');
      } else {
        await saveTimeSlot(formData);
        toast.success('Period slot saved');
      }
      setIsModalOpen(false);
      fetchSlots();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save time slot');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Period Structure & Time Slots</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define daily bell schedule, lecture slots, tea breaks, and lunch hours.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button size="sm" onClick={handleOpenAdd} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Period Slot
          </Button>
        </div>
      </div>

      {/* Grid of Slots */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
              Standard Daily Schedule (09:10 AM - 04:20 PM)
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total Periods: <strong className="text-gray-900 dark:text-white">{slots.length}</strong>
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {slots.map((slot, index) => {
              const isBreak = slot.type === 'BREAK';
              const isLunch = slot.type === 'LUNCH';
              return (
                <div
                  key={slot.id || index}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                    isBreak 
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-l-4 border-l-amber-400 dark:border-l-amber-500' 
                      : isLunch 
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 dark:border-l-emerald-400' 
                      : 'hover:bg-gray-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isBreak 
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                        : isLunch 
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-luna-primary-blue/10 dark:bg-cyan-950/50 text-luna-dark-navy dark:text-cyan-400'
                    }`}>
                      {isBreak ? <Coffee className="w-4 h-4" /> : isLunch ? <Utensils className="w-4 h-4" /> : `#${index + 1}`}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center space-x-2">
                        <span>
                          {isBreak ? 'Morning Tea Break' : isLunch ? 'Lunch Interval' : `Period ${index + 1}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBreak 
                            ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200' 
                            : isLunch 
                            ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200' 
                            : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'
                        }`}>
                          {slot.type}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2 mt-0.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        <span>{slot.startTime} — {slot.endTime}</span>
                        <span>•</span>
                        <span>{index < 5 ? 'Morning Session' : 'Afternoon Session'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {isBreak || isLunch ? 'Locked (Unavailable for classes)' : 'Available for Theory / Lab'}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(slot)}
                      className="p-1.5 text-gray-400 hover:text-luna-primary-blue dark:hover:text-cyan-400 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-luna-dark-navy text-lg">
                  {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <Input
                      placeholder="09:10"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                      className="text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      End Time
                    </label>
                    <Input
                      placeholder="10:00"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                      className="text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Slot Type
                  </label>
                  <select
                    value={formData.type || 'CLASS'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full text-sm border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-luna-primary-blue bg-white"
                  >
                    <option value="CLASS">Regular Class (Theory or Lab)</option>
                    <option value="BREAK">Tea Break (No classes)</option>
                    <option value="LUNCH">Lunch Interval (No classes)</option>
                    <option value="SPECIAL">Special / Locked Session</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="font-semibold shadow-sm">
                    Save Slot
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
