import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getApiUrl } from '../config/environment';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Search,
  DollarSign,
  RefreshCw,
} from 'lucide-react';

const API_URL = getApiUrl();

interface Room {
  id: number;
  name: string;
  location?: string;
  subscription_status: string;
  subscription?: {
    id: number;
    plan_id: number;
    plan_name: string;
    plan_price: number;
    status: string;
    ends_at: string;
    days_until_expiration: number;
    is_active: boolean;
    is_expired: boolean;
    is_in_grace_period: boolean;
    grace_period_days_left: number;
  };
  user_count: number;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  period_days: number;
  description?: string;
}

const PaymentManagement = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadPlans();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/admin/subscriptions/payment-dashboard`);
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Failed to load payment dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/subscriptions/plans`);
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedRoom || !selectedPlanId) return;

    try {
      setIsSubmitting(true);
      await axios.post(`${API_URL}/admin/rooms/${selectedRoom.id}/mark-paid`, {
        plan_id: selectedPlanId,
        payment_reference: paymentReference || undefined,
      });

      // Reload data
      await loadDashboardData();
      
      // Close modal and reset
      setShowMarkPaidModal(false);
      setSelectedRoom(null);
      setSelectedPlanId(null);
      setPaymentReference('');
    } catch (error: any) {
      console.error('Failed to mark as paid:', error);
      alert(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenew = async (room: Room) => {
    if (!room.subscription) return;
    
    try {
      await axios.put(`${API_URL}/admin/rooms/${room.id}/subscription/renew`);
      await loadDashboardData();
    } catch (error: any) {
      console.error('Failed to renew subscription:', error);
      alert(error.response?.data?.message || 'Failed to renew subscription');
    }
  };

  const openMarkPaidModal = (room: Room) => {
    setSelectedRoom(room);
    setSelectedPlanId(room.subscription?.plan_id || plans[0]?.id || null);
    setPaymentReference('');
    setShowMarkPaidModal(true);
  };

  const getStatusBadge = (room: Room) => {
    const status = room.subscription_status;
    
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'grace_period':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30 rounded-full">
            <Clock className="w-3 h-3" />
            Grace Period
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded-full">
            <XCircle className="w-3 h-3" />
            Expired
          </span>
        );
      case 'no_subscription':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 rounded-full">
            <AlertCircle className="w-3 h-3" />
            No Subscription
          </span>
        );
      default:
        return null;
    }
  };

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         room.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || room.subscription_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: rooms.length,
    active: rooms.filter(r => r.subscription_status === 'active').length,
    grace: rooms.filter(r => r.subscription_status === 'grace_period').length,
    expired: rooms.filter(r => r.subscription_status === 'expired').length,
    none: rooms.filter(r => r.subscription_status === 'no_subscription').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <CreditCard className="w-8 h-8" />
          Payment Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage room subscriptions and process payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Rooms</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow">
          <div className="text-sm text-green-700 dark:text-green-400 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.active}</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg shadow">
          <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">Grace Period</div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.grace}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow">
          <div className="text-sm text-red-700 dark:text-red-400 mb-1">Expired</div>
          <div className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.expired}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-700 dark:text-gray-400 mb-1">No Subscription</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-300">{stats.none}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'grace_period', 'expired', 'no_subscription'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Expires/Expired
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Days Until Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{room.name}</div>
                        {room.location && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{room.location}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {room.subscription?.plan_name || '—'}
                      </div>
                      {room.subscription?.plan_price && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ${room.subscription.plan_price.toFixed(2)}/year
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(room)}
                    </td>
                    <td className="px-6 py-4">
                      {room.subscription?.ends_at ? (
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(room.subscription.ends_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {room.subscription?.days_until_expiration !== undefined ? (
                        <div className={`text-sm font-medium ${
                          room.subscription.days_until_expiration < 0
                            ? 'text-red-600 dark:text-red-400'
                            : room.subscription.days_until_expiration < 30
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {room.subscription.days_until_expiration} days
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{room.user_count}</div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openMarkPaidModal(room)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-all"
                      >
                        <DollarSign className="w-4 h-4" />
                        Mark Paid
                      </button>
                      {room.subscription?.is_active && (
                        <button
                          onClick={() => handleRenew(room)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Renew
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Paid Modal */}
      <AnimatePresence>
        {showMarkPaidModal && selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700">
                <h3 className="text-xl font-bold text-white">Mark Room as Paid</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Room
                  </label>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedRoom.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subscription Plan *
                  </label>
                  <select
                    value={selectedPlanId || ''}
                    onChange={(e) => setSelectedPlanId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price.toFixed(2)}/year
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g., Invoice #12345, Check #678"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                <button
                  onClick={() => setShowMarkPaidModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  disabled={isSubmitting || !selectedPlanId}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentManagement;
