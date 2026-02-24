import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Room {
  id: number;
  name: string;
  location?: string;
  description?: string;
  subscription_status: string;
  subscription?: {
    plan_name: string;
    days_remaining: number;
    is_in_grace_period: boolean;
  };
}

interface RoomSelectorModalProps {
  rooms: Room[];
  onSelectRoom: (roomId: number) => void;
  isOpen: boolean;
}

const RoomSelectorModal: React.FC<RoomSelectorModalProps> = ({ rooms, onSelectRoom, isOpen }) => {
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-select first room if only one is available
    if (rooms.length === 1) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms]);

  const handleConfirm = () => {
    if (selectedRoomId) {
      setIsLoading(true);
      onSelectRoom(selectedRoomId);
    }
  };

  const getStatusBadge = (status: string, subscription?: Room['subscription']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'grace_period':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30 rounded-full">
            <Clock className="w-3 h-3" />
            Grace Period ({subscription?.is_in_grace_period ? `${subscription.days_remaining}d` : '0d'})
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Expired
          </span>
        );
      case 'no_subscription':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 rounded-full">
            <AlertCircle className="w-3 h-3" />
            No Subscription
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              Select Room to Manage
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Choose which room you want to view and configure
            </p>
          </div>

          {/* Room List */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No rooms available</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {rooms.map((room) => (
                  <motion.div
                    key={room.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`
                      p-4 border-2 rounded-xl cursor-pointer transition-all
                      ${selectedRoomId === room.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {room.name}
                          </h3>
                          {getStatusBadge(room.subscription_status, room.subscription)}
                        </div>
                        
                        {room.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <MapPin className="w-4 h-4" />
                            {room.location}
                          </div>
                        )}
                        
                        {room.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {room.description}
                          </p>
                        )}
                        
                        {room.subscription && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{room.subscription.plan_name}</span>
                            {' • '}
                            <span>
                              {room.subscription.days_remaining > 0
                                ? `${room.subscription.days_remaining} days remaining`
                                : room.subscription.is_in_grace_period
                                ? 'In grace period'
                                : 'Expired'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {selectedRoomId === room.id && (
                        <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={handleConfirm}
              disabled={!selectedRoomId || isLoading}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all
                ${selectedRoomId && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? 'Loading...' : 'Continue'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RoomSelectorModal;
