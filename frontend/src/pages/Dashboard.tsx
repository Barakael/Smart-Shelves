import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Activity, Users as UsersIcon, Settings } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
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

interface Shelf {
  id: number;
  is_open?: boolean;
}

interface ApiUser {
  id: number;
  role: string;
}

interface PanelEvent {
  shelf_id: number;
  cabinet_id: number;
  panel_id: number;
  is_open: boolean;
  timestamp?: string;
}

interface RecentActivityItem {
  id: string;
  shelfId: number;
  panelId: number;
  cabinetId: number;
  isOpen: boolean;
  timestamp: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { isConnected, isConnecting, subscribe, unsubscribe } = useSocket();

  const [room, setRoom] = useState<Room | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalShelves: 0,
    activeShelves: 0,
    operatorCount: 0,
    roomCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [shelfStates, setShelfStates] = useState<Record<number, boolean>>({});
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    if (user?.role === 'operator' && user.room_id) {
      loadOperatorRoom(user.room_id);
    }
  }, [user?.role, user?.room_id]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }

    let isMounted = true;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const [shelvesRes, roomsRes, usersRes] = await Promise.all([
          axios.get(`${API_URL}/shelves`),
          axios.get(`${API_URL}/rooms`),
          axios.get(`${API_URL}/users`),
        ]);

        if (!isMounted) {
          return;
        }

        const shelves: Shelf[] = Array.isArray(shelvesRes.data) ? shelvesRes.data : [];
        const rooms: Room[] = Array.isArray(roomsRes.data) ? roomsRes.data : [];
        const users: ApiUser[] = Array.isArray(usersRes.data) ? usersRes.data : [];

        const shelfMap = shelves.reduce<Record<number, boolean>>((acc, shelf) => {
          acc[shelf.id] = Boolean(shelf.is_open);
          return acc;
        }, {});

        const activeShelves = Object.values(shelfMap).filter(Boolean).length;
        const operatorCount = users.filter((u) => u.role === 'operator').length;

        setShelfStates(shelfMap);
        setDashboardStats({
          totalShelves: shelves.length,
          activeShelves,
          operatorCount,
          roomCount: rooms.length,
        });
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }

    const channel = 'panel_closed';

    const handlePanelEvent = (event: PanelEvent) => {
      setShelfStates((prev) => {
        const isKnownShelf = Object.prototype.hasOwnProperty.call(prev, event.shelf_id);
        const next = { ...prev, [event.shelf_id]: event.is_open };
        const activeCount = Object.values(next).filter(Boolean).length;

        setDashboardStats((prevStats) => ({
          ...prevStats,
          totalShelves: isKnownShelf ? prevStats.totalShelves : prevStats.totalShelves + 1,
          activeShelves: activeCount,
        }));

        return next;
      });

      setRecentActivity((prev) => {
        const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
        const entry: RecentActivityItem = {
          id: `${event.shelf_id}-${timestamp.getTime()}`,
          shelfId: event.shelf_id,
          panelId: event.panel_id,
          cabinetId: event.cabinet_id,
          isOpen: event.is_open,
          timestamp: timestamp.toLocaleTimeString(),
        };
        return [entry, ...prev].slice(0, 6);
      });
    };

    subscribe(channel, handlePanelEvent);

    return () => {
      unsubscribe(channel);
    };
  }, [user?.role, subscribe, unsubscribe]);

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

  const statCards = [
    { icon: Boxes, label: 'Total Shelves', value: dashboardStats.totalShelves },
    { icon: Activity, label: 'Open Shelves', value: dashboardStats.activeShelves },
    { icon: UsersIcon, label: 'Operators', value: dashboardStats.operatorCount },
    { icon: Settings, label: 'Rooms', value: dashboardStats.roomCount },
  ];

  // Admin view: keep stats and recent activity
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's an overview of your smart shelves system
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/70 dark:bg-gray-800 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 border border-primary-100 dark:border-gray-700">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500' : isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
            }`}
          ></span>
          {isConnected ? 'Live data' : isConnecting ? 'Connecting…' : 'Reconnecting…'}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
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
                <div className="p-3 rounded-lg bg-primary-200 dark:bg-primary-900/50">
                  <Icon className="w-6 h-6 text-[#012169] dark:text-primary-200" />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : (
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {stat.value.toLocaleString()}
                </h3>
              )}
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
          {recentActivity.length === 0 ? (
            <div className="p-4 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-300 border border-dashed border-gray-200 dark:border-gray-700">
              {isConnected ? 'No live events yet. Triggered actions will appear here instantly.' : 'Waiting for live connection…'}
            </div>
          ) : (
            recentActivity.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Shelf {event.shelfId} {event.isOpen ? 'opened' : 'closed'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Panel {event.panelId} · Cabinet {event.cabinetId} · {event.timestamp}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    event.isOpen
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  }`}
                >
                  {event.isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;

