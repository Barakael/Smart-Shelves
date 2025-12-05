import { motion } from 'framer-motion';
import { Boxes, Activity, Users, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { icon: Boxes, label: 'Total Shelves', value: '24', bgColor: 'bg-primary-200 dark:bg-primary-900/50', iconColor: 'text-[#012169] dark:text-primary-300' },
    { icon: Activity, label: 'Active Shelves', value: '18', bgColor: 'bg-primary-200 dark:bg-primary-900/50', iconColor: 'text-[#012169] dark:text-primary-300' },
    { icon: Users, label: 'Operators', value: '5', bgColor: 'bg-primary-200 dark:bg-primary-900/50', iconColor: 'text-[#012169] dark:text-primary-300' },
    { icon: Settings, label: 'Rooms', value: '8', bgColor: 'bg-primary-200 dark:bg-primary-900/50', iconColor: 'text-[#012169] dark:text-primary-300' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's an overview of your smart shelves system
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-primary-300/50 dark:border-primary-800/50 relative z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-primary-200/50 dark:border-primary-800/50 relative z-10"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Shelf {item} configuration updated
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;

