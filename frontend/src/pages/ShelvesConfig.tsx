import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import axios from 'axios';
import ShelfSimulation from '../components/ShelfSimulation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Shelf {
  id?: number;
  name: string;
  ip_address: string;
  rows: number;
  columns: number;
  controller: string;
  room_id?: number;
}

const ShelvesConfig = () => {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [formData, setFormData] = useState<Shelf>({
    name: '',
    ip_address: '',
    rows: 1,
    columns: 1,
    controller: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchShelves();
  }, []);

  const fetchShelves = async () => {
    try {
      const response = await axios.get(`${API_URL}/shelves`);
      setShelves(response.data);
    } catch (error) {
      console.error('Failed to fetch shelves:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingShelf?.id) {
        await axios.put(`${API_URL}/shelves/${editingShelf.id}`, formData);
      } else {
        await axios.post(`${API_URL}/shelves`, formData);
      }
      await fetchShelves();
      handleCloseModal();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save shelf');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (shelf: Shelf) => {
    setEditingShelf(shelf);
    setFormData(shelf);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this shelf?')) return;

    try {
      await axios.delete(`${API_URL}/shelves/${id}`);
      await fetchShelves();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete shelf');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingShelf(null);
    setFormData({
      name: '',
      ip_address: '',
      rows: 1,
      columns: 1,
      controller: '',
    });
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Shelves Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your electronic shelves settings
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-[#012169] text-white rounded-lg font-medium shadow-lg hover:bg-[#011a54] transition-all flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Shelf</span>
        </motion.button>
      </motion.div>

      <ShelfSimulation initialCount={11} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shelves.map((shelf, index) => (
          <motion.div
            key={shelf.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-primary-300/50 dark:border-primary-800/50 relative z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {shelf.name}
              </h3>
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleEdit(shelf)}
                  className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => shelf.id && handleDelete(shelf.id)}
                  className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">IP Address:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {shelf.ip_address}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dimensions:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {shelf.rows} × {shelf.columns}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Controller:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {shelf.controller}
                </span>
              </div>
            </div>
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
              className="bg-white dark:bg-primary-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-primary-300 dark:border-primary-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {editingShelf ? 'Edit Shelf' : 'Add New Shelf'}
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
                    Shelf Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    required
                    pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
                    className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]"
                    placeholder="192.168.1.1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rows
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.rows}
                      onChange={(e) =>
                        setFormData({ ...formData, rows: parseInt(e.target.value) })
                      }
                      required
                      className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Columns
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.columns}
                      onChange={(e) =>
                        setFormData({ ...formData, columns: parseInt(e.target.value) })
                      }
                      required
                      className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Controller
                  </label>
                  <select
                    value={formData.controller}
                    onChange={(e) => setFormData({ ...formData, controller: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]"
                  >
                    <option value="">Select Controller</option>
                    <option value="Controller A">Controller A</option>
                    <option value="Controller B">Controller B</option>
                    <option value="Controller C">Controller C</option>
                  </select>
                </div>

                <div className="flex space-x-4 pt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-primary-300 dark:border-primary-800 text-[#012169] dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
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
    </div>
  );
};

export default ShelvesConfig;

