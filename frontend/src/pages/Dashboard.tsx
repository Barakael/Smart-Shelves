import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Activity, Users as UsersIcon, Settings } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PanelGrid from '../components/PanelGrid';
import { getApiUrl } from '../config/environment';

const API_URL = getApiUrl();

interface Room {
  id: number;
  name: string;
  description?: string;
}

interface Panel {
  id: number;
  name: string;
  rows: number;
  columns: number;
  room_id: number;
}

const Dashboard = () => {
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const stats = [
    { icon: Boxes, label: 'Total Shelves', value: '24', bgColor: 'bg-primary-200 dark:bg-primary-900/50', iconColor: 'text-[#012169] dark:text-primary-300' },
    { icon: Activity, label: 'Active Shelves', value: '18', bgColor: 'bg-primary-200 dark:bg-primary-900/50', iconColor: 'text-[#012169] dark:text-primary-300' },
    { icon: UsersIcon, label: 'Operators', value: '5', bgColor: 'bg-primary-200 dark:bg-primary-900/50', iconColor: 'text-[#012169] dark:text-primary-300' },
    { icon: Settings, label: 'Rooms', value: '8', bgColor: 'bg-primary-200 dark:bg-primary-900/50', iconColor: 'text-[#012169] dark:text-primary-300' },
  ];

  useEffect(() => {
    if (user?.role === 'operator' && user.room_id) {
      loadOperatorRoom(user.room_id);
    }
  }, [user?.role, user?.room_id]);

  const loadOperatorRoom = async (roomId: number) => {
    setIsLoading(true);
    try {
      const [roomRes, panelsRes] = await Promise.all([
        axios.get(`${API_URL}/rooms/${roomId}`),
        axios.get(`${API_URL}/rooms/${roomId}/panels`),
      ]);
      setRoom(roomRes.data);
      setPanels(panelsRes.data);
      setSelectedPanelId(panelsRes.data[0]?.id ?? null);
    } catch (err) {
      console.error('Failed to load operator room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Operator view: show assigned room with panel tabs
  if (user?.role === 'operator') {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-800"></div>
        </div>
      );
    }

    if (!user.room_id) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Room Assigned</h2>
            <p className="text-gray-600 dark:text-gray-400">Please contact your administrator to assign a room.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{room?.name || 'Room'}</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your room's panels and shelves</p>
          </div>
        </motion.div>

        {/* Panel Tabs */}
        <div className="bg-white/90 dark:bg-gray-900/90 rounded-xl border border-primary-300/50 dark:border-primary-800/50 shadow-lg">
          <div className="flex border-b border-primary-200/50 dark:border-primary-800/50 overflow-x-auto">
            {panels.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPanelId(p.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  selectedPanelId === p.id
                    ? 'text-white bg-[#012169]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                }`}
              >
                {p.name}
              </button>
            ))}
            {panels.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">No panels in this room</div>
            )}
          </div>

          {/* Selected Panel Content */}
          <div className="p-6">
            {selectedPanelId ? (
              <PanelGrid
                panel={panels.find((p) => p.id === selectedPanelId)!}
                roomId={room!.id}
              />
            ) : (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">Select a panel to view shelves</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin view: keep stats and recent activity
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

