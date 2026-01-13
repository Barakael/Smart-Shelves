import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Boxes, DoorOpen, Wifi, History, Users, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    // { icon: Boxes, label: 'Shelves', path: '/shelves' },
    ...(user?.role === 'admin' ? [{ icon: DoorOpen, label: 'Rooms', path: '/rooms' }] : []),
    ...(user?.role === 'admin' ? [{ icon: Wifi, label: 'Cabinets', path: '/cabinets' }] : []),
    { icon: History, label: 'History', path: '/history' },
    ...(user?.role === 'admin' ? [{ icon: Users, label: 'Users', path: '/users' }] : []),
      { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <motion.aside
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        initial={{ width: 72 }}
        animate={{ width: isOpen ? 288 : 80 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="bg-white dark:bg-gray-950 border-r border-primary-300/30 dark:border-primary-800/30 shadow-xl flex flex-col relative z-20 overflow-hidden"
      >
        {/* Top Section with Title */}
        <div className="bg-[#012169] h-16 px-6 flex items-center justify-center">
          <h1 className="text-white font-bold text-xl tracking-wide whitespace-nowrap">
            <span className="text-primary-200">TERA</span>{' '}
            {isOpen && <span className="font-light">Smart Shelves</span>}
          </h1>
        </div>

        {/* User Info Section */}
        <div className="px-4 py-3 bg-white dark:bg-gray-950 border-b border-primary-300/30 dark:border-primary-800/30">
          <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
            <div className="w-9 h-9 rounded-full bg-[#012169] flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-sm font-semibold text-white">{user?.name?.charAt(0) || 'U'}</span>
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2 py-4 space-y-2 bg-white dark:bg-gray-950 ">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center ${isOpen ? 'space-x-3 justify-start px-4' : 'justify-center px-3'} py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[#012169] text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
};

export default Sidebar;
