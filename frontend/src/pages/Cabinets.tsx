import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Wifi, WifiOff, RefreshCw, X, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Cabinet {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  function_byte: string;
  checksum_offset: number;
  room_id: number;
  is_active: boolean;
  is_connected?: boolean;
  last_seen?: string;
}

interface Room {
  id: number;
  name: string;
}

const Cabinets: React.FC = () => {
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState<Cabinet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    port: 8080,
    function_byte: '',
    checksum_offset: 0,
    room_id: '',
    is_active: true,
  });
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCabinets();
    fetchRooms();
  }, []);

  const fetchCabinets = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/cabinets`);
      setCabinets(response.data);
    } catch (err) {
      setError('Failed to fetch cabinets');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      setRooms(response.data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const testConnection = async (ip: string, port: number) => {
    try {
      const response = await axios.post(`${API_URL}/cabinets/test-connection`, {
        ip_address: ip,
        port: port,
      });
      return response.data.success;
    } catch (err) {
      return false;
    }
  };

  const handleTestConnection = async (cabinetId?: number) => {
    const ip = editingCabinet?.ip_address || formData.ip_address;
    const port = editingCabinet?.port || formData.port;

    if (!ip) {
      setError('Please enter an IP address');
      return;
    }

    setTestingConnection(cabinetId || -1);
    const success = await testConnection(ip, port);
    setConnectionStatus(prev => ({
      ...prev,
      [cabinetId || -1]: success,
    }));
    setTestingConnection(null);
  };

  const handleOpenModal = (cabinet?: Cabinet) => {
    if (cabinet) {
      setEditingCabinet(cabinet);
      setFormData({
        name: cabinet.name,
        ip_address: cabinet.ip_address,
        port: cabinet.port,
        function_byte: cabinet.function_byte,
        checksum_offset: cabinet.checksum_offset,
        room_id: cabinet.room_id.toString(),
        is_active: cabinet.is_active,
      });
    } else {
      setEditingCabinet(null);
      setFormData({
        name: '',
        ip_address: '',
        port: 8080,
        function_byte: '',
        checksum_offset: 0,
        room_id: '',
        is_active: true,
      });
    }
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCabinet(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              ['port', 'checksum_offset'].includes(name) ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name || !formData.ip_address || !formData.function_byte || !formData.room_id) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingCabinet) {
        await axios.put(`${API_URL}/cabinets/${editingCabinet.id}`, formData);
        setSuccess('Cabinet updated successfully');
      } else {
        await axios.post(`${API_URL}/cabinets`, formData);
        setSuccess('Cabinet created successfully');
      }
      await fetchCabinets();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save cabinet');
    }
  };

  const handleDelete = async (cabinetId: number) => {
    if (!window.confirm('Are you sure you want to delete this cabinet?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/cabinets/${cabinetId}`);
      setSuccess('Cabinet deleted successfully');
      await fetchCabinets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete cabinet');
    }
  };

  const getRoomName = (roomId: number) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Cabinets</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage IoT hardware cabinets</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#012169] text-white rounded-lg font-medium shadow-lg hover:bg-[#011a54] transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Cabinet
          </motion.button>
        </div>

        {/* Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-300 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 text-green-700 dark:text-green-300 rounded-lg"
          >
            {success}
          </motion.div>
        )}

        {/* Cabinets Table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#012169]"></div>
          </div>
        ) : cabinets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No cabinets configured yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">IP Address</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Function Byte</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Checksum Offset</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Room</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cabinets.map(cabinet => (
                  <motion.tr
                    key={cabinet.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{cabinet.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{cabinet.ip_address}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{cabinet.function_byte}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cabinet.checksum_offset}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{getRoomName(cabinet.room_id)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {connectionStatus[cabinet.id] ? (
                          <>
                            <Wifi className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">Connected</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">Offline</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleTestConnection(cabinet.id)}
                          disabled={testingConnection === cabinet.id}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${testingConnection === cabinet.id ? 'animate-spin' : ''}`} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleOpenModal(cabinet)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(cabinet.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {editingCabinet ? 'Edit Cabinet' : 'Add Cabinet'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cabinet Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Cabinet A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IP Address *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="ip_address"
                      value={formData.ip_address}
                      onChange={handleInputChange}
                      required
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="192.168.10.11"
                    />
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTestConnection()}
                      disabled={testingConnection === -1}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {testingConnection === -1 ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Test'}
                    </motion.button>
                  </div>
                  {connectionStatus[-1] !== undefined && (
                    <div className={`mt-2 flex items-center gap-2 text-sm ${connectionStatus[-1] ? 'text-green-600' : 'text-red-600'}`}>
                      {connectionStatus[-1] ? (
                        <>
                          <Check className="w-4 h-4" />
                          Connection successful
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Connection failed
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      name="port"
                      value={formData.port}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Function Byte *
                    </label>
                    <input
                      type="text"
                      name="function_byte"
                      value={formData.function_byte}
                      onChange={handleInputChange}
                      required
                      maxLength={2}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                      placeholder="01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Checksum Offset *
                    </label>
                    <input
                      type="number"
                      name="checksum_offset"
                      value={formData.checksum_offset}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Room *
                    </label>
                    <select
                      name="room_id"
                      value={formData.room_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select room</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    id="is_active"
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 px-4 py-2 bg-[#012169] text-white rounded-lg font-medium hover:bg-[#011a54] transition-colors"
                  >
                    {editingCabinet ? 'Update Cabinet' : 'Add Cabinet'}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cabinets;
