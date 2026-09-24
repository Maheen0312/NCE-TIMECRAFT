import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Search, Edit2, Trash2, DoorClosed, Users, X, RefreshCw, Sparkles, Building2 } from 'lucide-react';
import { getAllRooms, createRoom, updateRoom, deleteRoom, Room } from '@/services/roomService';
import { seedInitialDataset } from '@/services/seedService';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Delete State
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    roomNumber: '',
    type: 'CLASSROOM' as 'CLASSROOM' | 'LAB' | 'SEMINAR_HALL',
    capacity: 60,
    building: 'Main Block',
    floor: '1st Floor',
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await getAllRooms();
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData({
      roomNumber: '',
      type: 'CLASSROOM',
      capacity: 60,
      building: 'Main Block',
      floor: '1st Floor',
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber || '',
      type: room.type || 'CLASSROOM',
      capacity: room.capacity || 60,
      building: room.building || 'Main Block',
      floor: room.floor || '1st Floor',
      active: room.active !== undefined ? room.active : true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomNumber.trim()) {
      toast.error('Please enter a room number');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRoom?.id) {
        await updateRoom(editingRoom.id, formData);
        toast.success(`Room "${formData.roomNumber}" updated`);
      } else {
        await createRoom(formData);
        toast.success(`Room "${formData.roomNumber}" created`);
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;
    const targetId = deletingRoom.id || `room_${deletingRoom.roomNumber.replace(/[^a-zA-Z0-9]/g, '_')}`;
    setIsDeleting(true);
    try {
      await deleteRoom(targetId);
      setRooms(prev => prev.filter(r => (r.id ? r.id !== targetId : r.roomNumber !== deletingRoom.roomNumber)));
      toast.success('Room deleted');
      setDeletingRoom(null);
      await fetchRooms();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete room');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await seedInitialDataset(true);
      toast.success(res.message);
      await fetchRooms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed rooms');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredRooms = rooms.filter(r => {
    const q = (searchQuery || '').toLowerCase();
    const roomNumber = (r.roomNumber || '').toLowerCase();
    const building = (r.building || '').toLowerCase();
    const type = (r.type || '').toLowerCase();
    return !q || roomNumber.includes(q) || building.includes(q) || type.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Room & Facility Management</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define lecture halls, classrooms, and laboratory venues for physical allocation.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding} className="text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-luna-primary-blue dark:text-cyan-400" />
            {isSeeding ? 'Seeding...' : 'Reset Section 48 Rooms'}
          </Button>
          <Button size="sm" onClick={handleOpenAdd} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Room
          </Button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Search room number or building..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Classrooms: <strong className="text-gray-900 dark:text-white">{rooms.filter(r => r.type === 'CLASSROOM').length}</strong></span>
          <span>Labs: <strong className="text-purple-600 dark:text-purple-400">{rooms.filter(r => r.type === 'LAB').length}</strong></span>
          <Button variant="outline" size="sm" onClick={fetchRooms} className="h-8 px-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-luna-primary-blue dark:text-cyan-400" />
              Loading rooms from Firestore...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-12 text-center">
              <DoorClosed className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No rooms registered</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                Seed rooms to enable physical classroom mapping for the timetable.
              </p>
              <Button size="sm" onClick={handleSeedData}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Seed Standard Rooms
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50/80 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Room No.</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Capacity</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredRooms.map((room, idx) => (
                    <tr key={room.id || `${room.roomNumber}_${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white font-mono">
                        {room.roomNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          room.type === 'LAB' 
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' 
                            : room.type === 'SEMINAR_HALL'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        }`}>
                          {room.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300">
                        <Building2 className="w-3.5 h-3.5 inline mr-1 text-gray-400 dark:text-gray-500" />
                        {room.building || 'Main Block'} • {room.floor || '1st Floor'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                        <Users className="w-3.5 h-3.5 inline mr-1 text-gray-400 dark:text-gray-500" />
                        {room.capacity} Desks
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          room.active ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {room.active ? 'Available' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(room)}
                            className="p-1.5 text-gray-400 hover:text-luna-primary-blue dark:hover:text-cyan-400 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800"
                            title="Edit Room"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingRoom(room)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Delete Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Room"
        itemName={deletingRoom ? `Room ${deletingRoom.roomNumber} (${deletingRoom.type})` : undefined}
        description="Are you sure you want to delete this room venue from the campus directory?"
        isDeleting={isDeleting}
      />

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
                  {editingRoom ? 'Edit Room' : 'Add Room'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Room Number / Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. CSE-101 or LAB-01"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    required
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Room Type
                  </label>
                  <select
                    value={formData.type || 'CLASSROOM'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full text-sm border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue bg-white"
                  >
                    <option value="CLASSROOM">Classroom / Lecture Hall</option>
                    <option value="LAB">Computer / Hardware Laboratory</option>
                    <option value="SEMINAR_HALL">Seminar Hall / Auditorium</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Building
                    </label>
                    <Input
                      placeholder="e.g. Main Academic Block"
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Capacity
                    </label>
                    <Input
                      type="number"
                      min="10"
                      max="500"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      required
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="font-semibold shadow-sm">
                    {isSubmitting ? 'Saving...' : editingRoom ? 'Update Room' : 'Save Room'}
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
