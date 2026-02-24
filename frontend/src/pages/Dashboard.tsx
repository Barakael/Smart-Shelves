


import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getApiUrl } from '../config/environment';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
} from 'lucide-react';

const API_URL = getApiUrl();

interface SubscriptionStatus {
  room_id: number;
  room_name: string;
  subscription_status: string;
  subscription?: {
    plan_name: string;
    plan_price: number;
    ends_at: string;
    days_remaining: number;
    is_in_grace_period: boolean;
    grace_period_days_left: number;
  };
}

interface AccessibleRoom {
  id: number;
  name: string;
  location?: string;
  subscription_status: string;
  subscription?: {
    plan_name: string;
    days_remaining: number;
  };
}

const Dashboard = () => {
  const { user, accessibleRooms } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [rooms, setRooms] = useState<AccessibleRoom[]>([]);

  useEffect(() => {
    loadSubscriptionStatus();
    if (accessibleRooms.length > 0) {
      setRooms(accessibleRooms);
    }
  }, [accessibleRooms]);

  const loadSubscriptionStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/subscription/my-status`);
      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
            <CheckCircle className="w-4 h-4" />
            Active
          </span>
        );
      case 'grace_period':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30 rounded-full">
            <Clock className="w-4 h-4" />
            Grace Period
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded-full">
            <AlertCircle className="w-4 h-4" />
            Expired
          </span>
        );
      case 'no_subscription':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 rounded-full">
            <AlertCircle className="w-4 h-4" />
            No Subscription
          </span>
        );
      default:
        return null;
    }
  };

  const activeRoomsCount = rooms.filter(r => r.subscription_status === 'active').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back, {user?.name}!
        </p>
      </div>

      {/* Warning Banner for Subscription Issues */}
      {subscriptionStatus && (subscriptionStatus.subscription_status === 'grace_period' || subscriptionStatus.subscription_status === 'expired') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-lg border ${
            subscriptionStatus.subscription_status === 'grace_period'
              ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
              : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 ${
              subscriptionStatus.subscription_status === 'grace_period'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-red-600 dark:text-red-400'
            }`} />
            <div className="flex-1">
              <h3 className={`font-semibold ${
                subscriptionStatus.subscription_status === 'grace_period'
                  ? 'text-orange-900 dark:text-orange-300'
                  : 'text-red-900 dark:text-red-300'
              }`}>
                {subscriptionStatus.subscription_status === 'grace_period' 
                  ? 'Subscription in Grace Period'
                  : 'Subscription Expired'}
              </h3>
              <p className={`text-sm mt-1 ${
                subscriptionStatus.subscription_status === 'grace_period'
                  ? 'text-orange-700 dark:text-orange-400'
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {subscriptionStatus.subscription_status === 'grace_period'
                  ? `Your subscription has expired but you're in the grace period. ${subscriptionStatus.subscription?.grace_period_days_left || 0} days remaining. `
                  : 'Your subscription has expired. '}
                Please contact{' '}
                <a href="mailto:admin@smartshelves.com" className="font-medium underline">
                  admin@smartshelves.com
                </a>
                {' '}to renew.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {rooms.length}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Accessible Rooms
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeRoomsCount}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Active Subscriptions
          </p>
        </motion.div>

        {subscriptionStatus?.subscription && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {subscriptionStatus.subscription.days_remaining > 0
                  ? subscriptionStatus.subscription.days_remaining
                  : 0}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Days Until Renewal
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                ${Number(subscriptionStatus.subscription.plan_price).toFixed(2)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Annual Cost
              </p>
            </motion.div>
          </>
        )}
      </div>

      {/* Current Room Subscription Card */}
      {subscriptionStatus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Current Room Subscription
            </h2>
            {getStatusBadge(subscriptionStatus.subscription_status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Room Name</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {subscriptionStatus.room_name}
              </p>
            </div>

            {subscriptionStatus.subscription && (
              <>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Plan</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {subscriptionStatus.subscription.plan_name}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    {subscriptionStatus.subscription.days_remaining > 0 ? 'Expires On' : 'Expired On'}
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {new Date(subscriptionStatus.subscription.ends_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Annual Cost</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    ${Number(subscriptionStatus.subscription.plan_price).toFixed(2)}
                  </p>
                </div>
              </>
            )}
          </div>

          {!user?.is_admin && user?.role !== 'admin' && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                For subscription inquiries or issues, please contact{' '}
                <a href="mailto:admin@smartshelves.com" className="font-medium underline">
                  admin@smartshelves.com
                </a>
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Accessible Rooms List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Your Accessible Rooms
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{room.name}</h3>
                {getStatusBadge(room.subscription_status)}
              </div>
              
              {room.location && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{room.location}</p>
              )}
              
              {room.subscription && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{room.subscription.plan_name}</span>
                  {' • '}
                  {room.subscription.days_remaining > 0
                    ? `${room.subscription.days_remaining} days left`
                    : 'Expired'}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;

