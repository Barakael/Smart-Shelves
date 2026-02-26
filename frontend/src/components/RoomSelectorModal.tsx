import { motion, AnimatePresence } from 'framer-motion';
import { Building, ChevronRight } from 'lucide-react';

interface Room {
  id: number;
  name: string;
  description?: string;
  subscription_status?: string;
}

interface RoomSelectorModalProps {
  rooms: Room[];
  onSelectRoom: (roomId: number) => void;
  isOpen: boolean;
}

const RoomSelectorModal: React.FC<RoomSelectorModalProps> = ({
  rooms,
  onSelectRoom,
  isOpen,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#012169] to-[#0f4cde] p-8">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-3xl font-bold text-white mb-2">Select Your Room</h2>
                  <p className="text-primary-100">Choose a room to continue</p>
                </motion.div>
              </div>

              <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                {rooms.length > 0 ? (
                  rooms.map((room, index) => (
                    <motion.button
                      key={room.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onSelectRoom(room.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#012169] dark:hover:border-[#0f4cde] hover:bg-blue-50 dark:hover:bg-gray-800 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                          <Building className="w-5 h-5 text-[#012169] dark:text-blue-300" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {room.name}
                          </h3>
                          {room.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {room.description}
                            </p>
                          )}
                          {room.subscription_status && (
                            <p className="text-xs mt-1">
                              <span
                                className={`inline-block px-2 py-1 rounded-full font-medium ${
                                  room.subscription_status === 'active'
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                                    : room.subscription_status === 'grace_period'
                                    ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300'
                                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                                }`}
                              >
                                {room.subscription_status}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#012169] dark:group-hover:text-blue-300 transition-colors" />
                    </motion.button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Building className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">No rooms available</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RoomSelectorModal;
