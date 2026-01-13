import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, DoorOpen, X, Save, Settings, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Room {
  id?: number;
  name: string;
  description?: string;
}

interface Panel {
  id: number;
  name: string;
  rows: number;
  columns: number;
  room_id: number;
}

const Rooms = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [panels, setPanels] = useState<Record<number, Panel[]>>({});
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<Room>({
    name: '',
    description: '',
  });
  const [panelFormData, setPanelFormData] = useState({
    name: '',
    ip_address: '',
    columns: 8, // 8-14 shelves (4-6 columns)
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const fetchPanels = async (roomId: number) => {
    try {
      const response = await axios.get(`${API_URL}/rooms/${roomId}/panels`);
      setPanels(prev => ({ ...prev, [roomId]: response.data }));
    } catch (error) {
      console.error('Failed to fetch panels:', error);
    }
  };

  const toggleRoomExpansion = (roomId: number) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
        fetchPanels(roomId);
      }
      return newSet;
    });
  };

  const handleOpenPanelModal = (roomId: number) => {
    setSelectedRoomId(roomId);
    setPanelFormData({ name: '', ip_address: '', columns: 8 });
    setIsPanelModalOpen(true);
  };

  const handlePanelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/rooms/${selectedRoomId}/panels`, panelFormData);
      await fetchPanels(selectedRoomId);
      setIsPanelModalOpen(false);
      setSelectedRoomId(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create panel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        description: room.description || '',
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingRoom?.id) {
        await axios.put(`${API_URL}/rooms/${editingRoom.id}`, formData);
      } else {
        await axios.post(`${API_URL}/rooms`, formData);
      }
      await fetchRooms();
      handleCloseModal();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      await axios.delete(`${API_URL}/rooms/${id}`);
      await fetchRooms();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete room');
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Rooms</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isAdmin ? 'Manage rooms and assign operators' : 'View your assigned room and manage panels'}
          </p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-[] text-white rounded-lg font-medium shadow-lg hover:bg-[#011a54] transition-all flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Room</span>
          </motion.button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-primary-300/50 dark:border-primary-800/50 relative z-10"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-lg bg-primary-200 dark:bg-primary-900/50">
                <DoorOpen className="w-6 h-6 text-primary-800 dark:text-primary-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{room.name}</h3>
            </div>
            {room.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{room.description}</p>
            )}
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleRoomExpansion(room.id!)}
              className="w-full mb-3 px-4 py-2 bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors flex items-center justify-between"
            >
              <span className="font-medium">
                {expandedRooms.has(room.id!) ? 'Hide' : 'Show'} Panels
              </span>
              <ChevronRight 
                className={`w-4 h-4 transition-transform ${expandedRooms.has(room.id!) ? 'rotate-90' : ''}`} 
              />
            </motion.button>

            <AnimatePresence>
              {expandedRooms.has(room.id!) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 space-y-2"
                >
                  {panels[room.id!]?.map((panel) => (
                    <motion.div
                      key={panel.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{panel.name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {panel.columns} shelves
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/rooms/${room.id}/panels/${panel.id}`)}
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Configure
                      </motion.button>
                    </motion.div>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOpenPanelModal(room.id!)}
                    className="w-full px-4 py-2 border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Panel
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {isAdmin && (
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenModal(room)}
                  className="flex-1 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center justify-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDelete(room.id)}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-primary-950 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-primary-300 dark:border-primary-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {editingRoom ? 'Edit Room' : 'Add New Room'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800 resize-none"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-primary-300 dark:border-primary-800 text-primary-800 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-[#012169] text-white rounded-lg font-medium shadow-lg hover:bg-[#011a54] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Save</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPanelModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setIsPanelModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-primary-950 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-primary-300 dark:border-primary-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Add New Panel
                </h2>
                <button
                  onClick={() => setIsPanelModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePanelSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Panel Name
                  </label>
                  <input
                    type="text"
                    value={panelFormData.name}
                    onChange={(e) => setPanelFormData({ ...panelFormData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    IP Address (optional)
                  </label>
                  <input
                    type="text"
                    value={panelFormData.ip_address}
                    onChange={(e) => setPanelFormData({ ...panelFormData, ip_address: e.target.value })}
                    pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                    className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800"
                    placeholder="192.168.1.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Shelves (8-14)
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="14"
                    value={panelFormData.columns}
                    onChange={(e) => setPanelFormData({ ...panelFormData, columns: parseInt(e.target.value) })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Each panel contains 8-14 vertical shelf columns
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsPanelModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-primary-300 dark:border-primary-800 text-primary-800 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-[#012169] text-white rounded-lg font-medium shadow-lg hover:bg-[#011a54] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating...' : 'Create Panel'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Rooms;

