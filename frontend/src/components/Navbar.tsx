import { motion } from 'framer-motion';
import { Moon, Sun, LogOut, Bell } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <h1 className="text-xl font-semibold text-white">
                  Hello, {user?.name?.split(' ')[0] || 'User'}
                </h1>
              </div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/90 text-sm font-medium hidden md:block"
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
