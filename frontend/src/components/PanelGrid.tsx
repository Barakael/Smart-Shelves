import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Crown, Play, Square, ChevronRight, ChevronLeft } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Shelf {
  id?: number;
  name: string;
  ip_address: string;
  column_index: number;
  shelf_number: number;
  is_controller: boolean;
  is_first: boolean;
  panel_id?: number;
  open_direction?: 'left' | 'right';
  is_open?: boolean;
}

interface Panel {
  id: number;
  name: string;
  ip_address?: string;
  columns: number;
  room_id: number;
}

interface PanelGridProps {
  panel: Panel;
  roomId: number;
  onShelfUpdate?: () => void;
}

const PanelGrid = ({ panel, roomId, onShelfUpdate }: PanelGridProps) => {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [openShelves, setOpenShelves] = useState<Set<number>>(new Set());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [controllerShelf, setControllerShelf] = useState<Shelf | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [panelOpenDirection, setPanelOpenDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    fetchShelves();
  }, [panel.id]);

  const fetchShelves = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms/${roomId}/panels/${panel.id}/shelves`);
      const shelvesData = response.data.shelves || {};
      
      const flatShelves: Shelf[] = [];
      Object.keys(shelvesData).forEach((colKey) => {
        const shelf = shelvesData[colKey];
        if (shelf) {
          flatShelves.push({
            ...shelf,
            column_index: parseInt(colKey),
            shelf_number: shelf.shelf_number || parseInt(colKey) + 1,
            open_direction: shelf.open_direction || 'right',
          });
        }
      });

      // If no shelves exist, create empty slots
      if (flatShelves.length === 0) {
        for (let i = 0; i < panel.columns; i++) {
          flatShelves.push({
            name: `Shelf ${i + 1}`,
            ip_address: '',
            column_index: i,
            shelf_number: i + 1,
            is_controller: i === 0, // First shelf is controller by default
            is_first: i === 0,
            panel_id: panel.id,
            open_direction: 'right',
            is_open: false,
          });
        }
      }

      const sortedShelves = flatShelves.sort((a, b) => a.column_index - b.column_index);
      
      // Fill in missing shelves
      const finalShelves: Shelf[] = [];
      for (let i = 0; i < panel.columns; i++) {
        const existing = sortedShelves.find(s => s.column_index === i);
        if (existing) {
          finalShelves.push(existing);
        } else {
          finalShelves.push({
            name: `Shelf ${i + 1}`,
            ip_address: '',
            column_index: i,
            shelf_number: i + 1,
            is_controller: false,
            is_first: i === 0,
            panel_id: panel.id,
            open_direction: 'right',
            is_open: false,
          });
        }
      }

      setShelves(finalShelves);
      
      // Find and set controller
      const controller = finalShelves.find(s => s.is_controller) || finalShelves[0];
      setControllerShelf(controller);
      setPanelOpenDirection(controller.open_direction || 'right');
    } catch (error) {
      console.error('Failed to fetch shelves:', error);
    }
  };

  const handleShelfOpen = async (shelfIndex: number) => {
    if (!controllerShelf || !controllerShelf.ip_address) {
      alert('Please configure the controller shelf first');
      return;
    }

    try {
      // Mark this shelf as open; neighbors will be nudged slightly automatically
      setOpenShelves(prev => new Set(prev).add(shelfIndex));
      
      const shelf = shelves[shelfIndex];
      if (shelf?.id) {
        await axios.post(`${API_URL}/rooms/${roomId}/panels/${panel.id}/shelves/${shelf.id}/open`);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to open shelf');
      setOpenShelves(prev => {
        const newSet = new Set(prev);
        newSet.delete(shelfIndex);
        return newSet;
      });
    }
  };

  const handleShelfClose = async (shelfIndex: number) => {
    try {
      setOpenShelves(prev => {
        const newSet = new Set(prev);
        newSet.delete(shelfIndex);
        return newSet;
      });
      const shelf = shelves[shelfIndex];
      if (shelf?.id) {
        await axios.post(`${API_URL}/rooms/${roomId}/panels/${panel.id}/shelves/${shelf.id}/close`);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to close shelf');
      setOpenShelves(prev => new Set(prev).add(shelfIndex));
    }
  };

  const handleSaveController = async (shelfData: Shelf) => {
    setIsLoading(true);
    try {
      // Unset other shelves as controller
      for (const s of shelves) {
        if (s.column_index !== shelfData.column_index && s.is_controller && s.id) {
          await axios.put(`${API_URL}/shelves/${s.id}`, { ...s, is_controller: false });
        }
      }

      const payload = {
        ...shelfData,
        room_id: roomId,
        panel_id: panel.id,
        is_controller: true,
      };

      if (shelfData.id) {
        await axios.put(`${API_URL}/shelves/${shelfData.id}`, payload);
      } else {
        await axios.post(`${API_URL}/shelves`, payload);
      }
      
      await fetchShelves();
      setIsConfigModalOpen(false);
      onShelfUpdate?.();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save controller');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto direction: shelves open away from the controller's position
  const getControllerIndex = () => (controllerShelf ? controllerShelf.column_index : 0);
  const getShelfDirection = (shelfIndex: number): 'left' | 'right' | 'none' => {
    const ctrl = getControllerIndex();
    if (shelfIndex === ctrl) return 'none';
    return shelfIndex > ctrl ? 'right' : 'left';
  };

  // Smaller open distance to fit on screen with up to 14 shelves
  const OPEN_DISTANCE = 60; // px

  // Calculate padding needed to prevent overflow
  const getContainerPadding = () => {
    if (!controllerShelf) return { paddingLeft: '16px', paddingRight: '16px' };
    
    const ctrlIdx = controllerShelf.column_index;
    const totalColumns = panel.columns;
    
    // Count shelves on each side of controller
    const shelvesToLeft = ctrlIdx;
    const shelvesToRight = totalColumns - ctrlIdx - 1;
    
    // Calculate max possible translation (all shelves open)
    const maxLeftTranslation = shelvesToLeft * OPEN_DISTANCE;
    const maxRightTranslation = shelvesToRight * OPEN_DISTANCE;
    
    return {
      paddingLeft: `${maxLeftTranslation + 32}px`,
      paddingRight: `${maxRightTranslation + 32}px`,
    };
  };

  const getShelfTranslation = (shelfIndex: number) => {
    const ctrlIdx = getControllerIndex();
    if (shelfIndex === ctrlIdx) return 0; // Controller never moves

    let translation = 0;
    const dir = getShelfDirection(shelfIndex);

    // Accumulate push from all open shelves between this shelf and controller
    if (dir === 'right') {
      // Shelf is to the right of controller, pushed by all open shelves to its left
      for (let i = ctrlIdx; i < shelfIndex; i++) {
        if (openShelves.has(i)) translation += OPEN_DISTANCE;
      }
      // If this shelf itself is open, add its own distance
      if (openShelves.has(shelfIndex)) translation += OPEN_DISTANCE;
    } else if (dir === 'left') {
      // Shelf is to the left of controller, pushed by all open shelves to its right
      for (let i = shelfIndex + 1; i <= ctrlIdx; i++) {
        if (openShelves.has(i)) translation -= OPEN_DISTANCE;
      }
      // If this shelf itself is open, add its own distance
      if (openShelves.has(shelfIndex)) translation -= OPEN_DISTANCE;
    }

    return translation;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{panel.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {panel.columns} shelves • Only controller needs configuration
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsConfigModalOpen(true)}
          className="px-4 py-2 bg-[#012169] text-white rounded-lg font-medium shadow-lg hover:bg-[#011a54] transition-all flex items-center gap-2"
        >
          <Settings className="w-5 h-5" />
          Configure Controller
        </motion.button>
      </div>

      {/* Controller Info */}
      {controllerShelf && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-400 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <div className="flex-1">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                Controller: {controllerShelf.name || `Shelf ${controllerShelf.shelf_number}`}
              </div>
              {controllerShelf.ip_address && (
                <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {controllerShelf.ip_address}
                </div>
              )}
              {!controllerShelf.ip_address && (
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  Click "Configure Controller" to set IP address
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Opens away from controller
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Shelves Grid */}
      <div className="relative overflow-visible rounded-xl p-2">
        <div 
          className="grid gap-2" 
          style={{ 
            gridTemplateColumns: `repeat(${panel.columns}, minmax(0, 1fr))`,
            ...getContainerPadding(),
          }}
        >
          {shelves.map((shelf, index) => {
            const isOpen = openShelves.has(index);
            const translateX = getShelfTranslation(index);

            return (
              <motion.div
                key={shelf.column_index || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <motion.div
                  animate={{
                    x: translateX,
                  }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                  className={`
                    relative bg-gradient-to-br from-[#012169] to-[#011a54] rounded-xl p-3 shadow-xl
                    border-2 ${shelf.is_controller ? 'border-yellow-400' : 'border-primary-300'}
                    min-h-[180px] flex flex-col ${isOpen ? 'z-10' : ''}
                  `}
                >
                  {/* Controller Badge */}
                  {shelf.is_controller && (
                    <div className="absolute top-2 right-2">
                      <div className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        CTRL
                      </div>
                    </div>
                  )}

                  {/* Shelf Number */}
                  <div className="text-center mb-2">
                    <div className="text-2xl font-bold text-white mb-1">
                      {shelf.shelf_number || index + 1}
                    </div>
                    {shelf.is_controller && (
                      <div className="text-xs text-primary-200 truncate">
                        {shelf.name}
                      </div>
                    )}
                  </div>

                  {/* IP Address (only for controller) */}
                  {shelf.is_controller && shelf.ip_address && (
                    <div className="text-center mb-3">
                      <div className="text-xs text-primary-200 font-mono">
                        {shelf.ip_address}
                      </div>
                    </div>
                  )}

                  {/* Open/Close Button */}
                  <div className="mt-auto">
                    {!isOpen ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleShelfOpen(index)}
                        disabled={!controllerShelf?.ip_address}
                        className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-lg transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <Play className="w-3 h-3" />
                        Open
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleShelfClose(index)}
                        className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-lg transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <Square className="w-3 h-3" />
                        Close
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Controller Configuration Modal */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <ControllerConfigModal
            shelf={controllerShelf || shelves[0]}
            shelves={shelves}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSaveController}
            isLoading={isLoading}
            onDirectionChange={(dir) => setPanelOpenDirection(dir)}
            currentDirection={panelOpenDirection}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface ControllerConfigModalProps {
  shelf: Shelf;
  shelves: Shelf[];
  onClose: () => void;
  onSave: (shelf: Shelf) => void;
  isLoading: boolean;
  onDirectionChange: (direction: 'left' | 'right') => void;
  currentDirection: 'left' | 'right';
}

const ControllerConfigModal = ({ 
  shelf, 
  shelves, 
  onClose, 
  onSave, 
  isLoading,
  onDirectionChange,
  currentDirection 
}: ControllerConfigModalProps) => {
  const [formData, setFormData] = useState<Shelf>(shelf);
  const [selectedControllerIndex, setSelectedControllerIndex] = useState(
    shelves.findIndex(s => s.is_controller) >= 0 ? shelves.findIndex(s => s.is_controller) : 0
  );

  useEffect(() => {
    setFormData(shelves[selectedControllerIndex] || shelf);
  }, [selectedControllerIndex, shelves, shelf]);

  useEffect(() => {
    setFormData(shelves[selectedControllerIndex] || shelf);
  }, [selectedControllerIndex, shelves, shelf]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedShelf = {
      ...formData,
      column_index: selectedControllerIndex,
      shelf_number: selectedControllerIndex + 1,
      is_controller: true,
      open_direction: currentDirection,
    };
    onSave(updatedShelf);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-primary-300 dark:border-primary-800"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Configure Controller Shelf
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Controller Shelf
            </label>
            <select
              value={selectedControllerIndex}
              onChange={(e) => setSelectedControllerIndex(parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]"
            >
              {shelves.map((s, idx) => (
                <option key={idx} value={idx}>
                  Shelf {s.shelf_number || idx + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Controller Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]"
              placeholder="Controller Shelf"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opening Direction
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDirectionChange('left')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  currentDirection === 'left'
                    ? 'border-[#012169] bg-[#012169] text-white'
                    : 'border-primary-300 dark:border-primary-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Left
              </button>
              <button
                type="button"
                onClick={() => onDirectionChange('right')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  currentDirection === 'right'
                    ? 'border-[#012169] bg-[#012169] text-white'
                    : 'border-primary-300 dark:border-primary-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
                Right
              </button>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-primary-300 dark:border-primary-800 text-[#012169] dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
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
              {isLoading ? 'Saving...' : 'Save Controller'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default PanelGrid;
