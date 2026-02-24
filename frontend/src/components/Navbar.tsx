import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, LogOut, Bell, Building2, ChevronDown, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, currentRoom, accessibleRooms, setCurrentRoom, loadAccessibleRooms } = useAuth();
  const navigate = useNavigate();
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    if (accessibleRooms.length > 0) {
      setRooms(accessibleRooms);
    } else {
      loadAccessibleRooms().then(setRooms);
    }
  }, [accessibleRooms]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRoomChange = async (roomId: number) => {
    await setCurrentRoom(roomId);
    setShowRoomDropdown(false);
    // Reload the page to refresh subscription context
    window.location.reload();
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'grace_period':
        return <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />;
      case 'expired':
      case 'no_subscription':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'grace_period':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'expired':
      case 'no_subscription':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative z-20"
    >
      {/* Header */}
      <div className="bg-[#012169] h-16 flex items-center">
        <div className="px-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {currentRoom && getStatusDot(currentRoom.subscription_status)}
                <h1 className="text-xl font-semibold text-white">
                  Hello, {user?.name?.split(' ')[0] || 'User'}
                </h1>
              </div>
              
              {/* Room Switcher - Only for Admins */}
              {user?.role === 'admin' && rooms.length > 0 && (
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:inline">
                      {currentRoom?.name || 'Select Room'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showRoomDropdown ? 'rotate-180' : ''}`} />
                  </motion.button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {showRoomDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        <div className="p-2 max-h-96 overflow-y-auto">
                          {rooms.map((room) => (
                            <button
                              key={room.id}
                              onClick={() => handleRoomChange(room.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                currentRoom?.id === room.id
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {getStatusIcon(room.subscription_status)}
                              <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                  {room.name}
                                </div>
                                {room.subscription && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {room.subscription.plan_name} • {room.subscription.days_remaining > 0 ? `${room.subscription.days_remaining}d left` : 'Expired'}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-sm font-medium hidden lg:block"
              >
                Manage your smart shelves efficiently
              </motion.p>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              >
                <Bell className="w-5 h-5" />
              </motion.button>
              {/* <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <User className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white hidden sm:inline">
                  {user?.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/30 text-white">
                  {user?.role}
                </span>
              </div> */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLogout}
                className="p-2 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
