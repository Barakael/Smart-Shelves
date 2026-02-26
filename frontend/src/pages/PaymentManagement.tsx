import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Check, X, Plus, Building } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/environment';
import { Payment, RoomWithSubscription, Plan } from '../types/subscription';

const API_URL = getApiUrl();

const PaymentManagement = () => {
  const { user, currentRoom, isLoading: isAuthLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rooms, setRooms] = useState<RoomWithSubscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    room_id: '',
    amount: '',
    payment_method: 'manual' as const,
    reference_number: '',
    notes: '',
    paid_at: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    // Wait for user data to load before fetching
    if (user) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (isAdmin === true) {
        const [paymentsRes, roomsRes] = await Promise.all([
          axios.get(`${API_URL}/payments`),
          axios.get(`${API_URL}/user/accessible-rooms`),
        ]);

        setPayments(paymentsRes.data.data || paymentsRes.data);
        setRooms(roomsRes.data.rooms || roomsRes.data);
      } else {
        // Operators only need to see their own subscription
        const roomsRes = await axios.get(`${API_URL}/user/accessible-rooms`);
        setRooms(roomsRes.data.rooms || roomsRes.data);
        setPayments([]);
      }

      // Create a default plan if none exists (for demo)
      setPlans([{ id: 1, name: 'Annual License', description: '', price: 99, period_days: 365, is_active: true }]);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      console.error('Failed to fetch data:', err);
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await axios.post(`${API_URL}/payments`, formData);
      setSuccess('Payment recorded successfully');
      setIsModalOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleConfirmPayment = async (paymentId: number) => {
    if (!selectedPlanId) {
      setError('Please select a plan before confirming');
      return;
    }

    setError(null);
    setConfirmingPaymentId(paymentId);

    try {
      await axios.put(`${API_URL}/payments/${paymentId}/confirm`, { plan_id: selectedPlanId });
      setSuccess('Payment confirmed and subscription updated');
      setSelectedPlanId(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  const handleRejectPayment = async (paymentId: number) => {
    if (!confirm('Are you sure you want to reject this payment?')) return;

    setError(null);

    try {
      await axios.put(`${API_URL}/payments/${paymentId}/reject`);
      setSuccess('Payment rejected');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject payment');
    }
  };

  const resetForm = () => {
    setFormData({
      room_id: '',
      amount: '',
      payment_method: 'manual',
      reference_number: '',
      notes: '',
      paid_at: new Date().toISOString().split('T')[0],
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getSubscriptionStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      grace_period: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      none: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Show loading state while auth data is being fetched
  if (isAuthLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#012169]/20 border-t-[#012169] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#012169]/20 border-t-[#012169]" />
      </div>
    );
  }

  // Operator view - show their subscription status
  if (isAdmin === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Your Subscription</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage your subscription status</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-green-800 dark:text-green-200">
            {success}
          </div>
        )}

        {/* Current Room Subscription */}
        {currentRoom && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              <Building className="w-6 h-6" />
              {currentRoom.name} - Subscription Status
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Status</p>
                <span className={`inline-block px-4 py-2 rounded-lg text-lg font-semibold ${getSubscriptionStatusBadge(currentRoom.subscription_status)}`}>
                  {currentRoom.subscription_status === 'no_subscription' ? 'No Subscription' : currentRoom.subscription_status}
                </span>
              </div>

              {currentRoom.subscription && (
                <>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Expires On</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(currentRoom.subscription.ends_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Days Remaining</p>
                    <p className={`text-2xl font-semibold ${
                      currentRoom.subscription.days_remaining > 30 ? 'text-green-600 dark:text-green-400' :
                      currentRoom.subscription.days_remaining > 0 ? 'text-orange-600 dark:text-orange-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {Math.max(0, currentRoom.subscription.days_remaining)} days
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Plan</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {currentRoom.subscription.plan_name}
                    </p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Plan Cost</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      ${currentRoom.subscription.plan_price}
                    </p>
                  </div>
                </>
              )}
            </div>

            {currentRoom.subscription_status === 'expired' || currentRoom.subscription_status === 'no_subscription' ? (
              <div className="mt-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200 font-semibold mb-2">Subscription Expired</p>
                <p className="text-red-700 dark:text-red-300 mb-4">
                  Your subscription has expired. Please contact your administrator to renew your subscription.
                </p>
                <a href="mailto:admin@smartshelves.com" className="text-red-600 dark:text-red-400 hover:underline font-medium">
                  admin@smartshelves.com
                </a>
              </div>
            ) : currentRoom.subscription_status === 'grace_period' ? (
              <div className="mt-6 p-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-orange-800 dark:text-orange-200 font-semibold mb-2">Grace Period Active</p>
                <p className="text-orange-700 dark:text-orange-300 mb-4">
                  Your subscription is in a grace period. Please contact your administrator to renew your subscription before it fully expires.
                </p>
                <a href="mailto:admin@smartshelves.com" className="text-orange-600 dark:text-orange-400 hover:underline font-medium">
                  admin@smartshelves.com
                </a>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // Admin view - show payment management
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payment Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage subscriptions and payments for all rooms</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#012169] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#011449] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Record Payment
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-green-800 dark:text-green-200">
          {success}
        </div>
      )}

      {/* Room Subscription Status Overview */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Room Subscriptions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{room.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSubscriptionStatusBadge(room.subscription_status)}`}>
                    {room.subscription_status}
                  </span>
                </div>
                {room.subscription && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(room.subscription.ends_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Days Left:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {room.subscription.days_remaining}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Paid At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {payment.room?.name || `Room #${payment.room_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${payment.amount} {payment.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {payment.payment_method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {payment.reference_number || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {new Date(payment.paid_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {payment.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={selectedPlanId || ''}
                          onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                          className="text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800"
                        >
                          <option value="">Select Plan</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleConfirmPayment(payment.id)}
                          disabled={confirmingPaymentId === payment.id}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                          title="Confirm"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectPayment(payment.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Reject"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {payment.status === 'confirmed' && (
                      <span className="text-green-600 dark:text-green-400">Confirmed</span>
                    )}
                    {payment.status === 'rejected' && (
                      <span className="text-red-600 dark:text-red-400">Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No payment records found
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Record Payment</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Room
                    </label>
                    <select
                      value={formData.room_id}
                      onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="99.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="manual">Manual</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="REF123456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={formData.paid_at}
                      onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      rows={3}
                      placeholder="Optional notes"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-[#012169] text-white rounded-lg hover:bg-[#011449] transition-colors"
                    >
                      Record Payment
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentManagement;
