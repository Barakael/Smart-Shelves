import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, LogOut, Bell, Building2, ChevronDown, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/environment';

const API_URL = getApiUrl();

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, currentRoom, accessibleRooms, setCurrentRoom, loadAccessibleRooms } = useAuth();
  const navigate = useNavigate();
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    if (accessibleRooms.length > 0) {
      setRooms(accessibleRooms);
    } else {
      loadAccessibleRooms().then(setRooms);
    }
  }, [accessibleRooms]);

  useEffect(() => {
    if (!user) return;
    loadUnreadCount();
  }, [user?.id]);

  const loadNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const { data } = await axios.get<NotificationItem[]>(`${API_URL}/notifications`);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { data } = await axios.get<{ count: number }>(`${API_URL}/notifications/unread-count`);
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Failed to load unread notification count:', error);
    }
  };

  const handleNotificationToggle = async () => {
    const nextValue = !showNotificationDropdown;
    setShowNotificationDropdown(nextValue);
    setShowRoomDropdown(false);

    if (nextValue) {
      await loadNotifications();
      await loadUnreadCount();
    }
  };

  const handleMarkRead = async (notificationId: number) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(item => (
        item.id === notificationId ? { ...item, is_read: true } : item
      )));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`);
      setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

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
              
              {/* Room Switcher - Admins and managers can switch */}
              {(user?.role === 'admin' || user?.role === 'manager') && rooms.length > 0 && (
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
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNotificationToggle}
                  className="relative p-2 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] leading-[18px] text-white font-semibold px-1 text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </motion.button>
                <AnimatePresence>
                  {showNotificationDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-[#012169] dark:text-blue-300 hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {isLoadingNotifications ? (
                          <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No notifications yet.</div>
                        ) : (
                          notifications.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => handleMarkRead(notification.id)}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/70 ${
                                notification.is_read ? '' : 'bg-blue-50/60 dark:bg-blue-900/10'
                              }`}
                            >
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{notification.title}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
