import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Check,
  X,
  Plus,
  Building,
  Wallet,
  Clock3,
  Layers,
  Calendar,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/environment';
import { Payment, RoomWithSubscription, Plan } from '../types/subscription';

const API_URL = getApiUrl();

const sectionCardClass =
  'rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/95 dark:bg-gray-900/95 shadow-lg shadow-gray-200/40 dark:shadow-black/20';

const metricCardClass =
  'rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-900 p-5 shadow-sm hover:shadow-md transition-all';

const inputClassName =
  'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]/40';

const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatMoney = (value: number | string, currency = 'USD') => {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(amount)) return `${value} ${currency}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
};

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
      pending: 'bg-amber-100/90 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/70',
      confirmed: 'bg-emerald-100/90 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/70',
      rejected: 'bg-rose-100/90 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/70',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900/30 dark:border-gray-700';
  };

  const getSubscriptionStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-emerald-100/90 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/70',
      grace_period: 'bg-orange-100/90 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/70',
      expired: 'bg-rose-100/90 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/70',
      none: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700',
      no_subscription: 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700';
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

  const activeSubscriptionCount = rooms.filter((room) => room.subscription_status === 'active').length;
  const pendingPaymentsCount = payments.filter((payment) => payment.status === 'pending').length;
  const confirmedPaymentsCount = payments.filter((payment) => payment.status === 'confirmed').length;

  // Operator view - show their subscription status
  if (isAdmin === false) {
    return (
      <div className="space-y-7">
        <div className="rounded-2xl border border-[#012169]/20 bg-gradient-to-r from-[#012169] to-[#02317f] p-7 text-white shadow-xl">
          <h1 className="text-3xl font-bold">Your Subscription</h1>
          <p className="mt-1 text-primary-100/90">View your plan status and renewal timeline</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            {success}
          </div>
        )}

        {/* Current Room Subscription */}
        {currentRoom && (
          <div className={`${sectionCardClass} p-7`}>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building className="w-6 h-6" />
                {currentRoom.name}
              </h2>
              <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold ${getSubscriptionStatusBadge(currentRoom.subscription_status)}`}>
                {currentRoom.subscription_status === 'no_subscription'
                  ? 'No Subscription'
                  : formatLabel(currentRoom.subscription_status)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={metricCardClass}>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</p>
                <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {currentRoom.subscription_status === 'no_subscription'
                    ? 'No Subscription'
                    : formatLabel(currentRoom.subscription_status)}
                </p>
              </div>

              {currentRoom.subscription && (
                <>
                  <div className={metricCardClass}>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Expires On</p>
                    <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(currentRoom.subscription.ends_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className={metricCardClass}>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Days Remaining</p>
                    <p
                      className={`mt-2 text-xl font-semibold ${
                        currentRoom.subscription.days_remaining > 30
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : currentRoom.subscription.days_remaining > 0
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {Math.max(0, currentRoom.subscription.days_remaining)} days
                    </p>
                  </div>

                  <div className={metricCardClass}>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Plan</p>
                    <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {currentRoom.subscription.plan_name}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {formatMoney(currentRoom.subscription.plan_price)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {currentRoom.subscription_status === 'expired' || currentRoom.subscription_status === 'no_subscription' ? (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-900/20">
                <p className="mb-2 font-semibold text-rose-800 dark:text-rose-200">Subscription Expired</p>
                <p className="mb-4 text-rose-700 dark:text-rose-300">
                  Your subscription has expired. Please contact your administrator to renew your subscription.
                </p>
                <a href="mailto:admin@smartshelves.com" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
                  admin@smartshelves.com
                </a>
              </div>
            ) : currentRoom.subscription_status === 'grace_period' ? (
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-6 dark:border-orange-800 dark:bg-orange-900/20">
                <p className="mb-2 font-semibold text-orange-800 dark:text-orange-200">Grace Period Active</p>
                <p className="mb-4 text-orange-700 dark:text-orange-300">
                  Your subscription is in a grace period. Please contact your administrator to renew your subscription before it fully expires.
                </p>
                <a href="mailto:admin@smartshelves.com" className="font-medium text-orange-600 hover:underline dark:text-orange-400">
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
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payment Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage subscriptions and payments for all rooms</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#012169] px-5 py-2.5 font-semibold text-white shadow-lg shadow-[#012169]/20 transition-colors hover:bg-[#011449]"
        >
          <Plus className="w-5 h-5" />
          Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={metricCardClass}>
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg bg-[#012169]/10 p-2 text-[#012169] dark:bg-[#012169]/20 dark:text-blue-300">
              <Layers className="h-5 w-5" />
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{rooms.length}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Total Rooms</p>
        </div>

        <div className={metricCardClass}>
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Check className="h-5 w-5" />
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{activeSubscriptionCount}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Active Subscriptions</p>
        </div>

        <div className={metricCardClass}>
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{pendingPaymentsCount}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Pending Payments</p>
        </div>

        <div className={metricCardClass}>
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{confirmedPaymentsCount}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Confirmed Payments</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
          {success}
        </div>
      )}

      {/* Room Subscription Status Overview */}
      <div className={`${sectionCardClass} p-6`}>
        <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          <Building className="w-5 h-5" />
          Room Subscriptions
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <motion.div
              key={room.id}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900/80"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{room.name}</h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionStatusBadge(room.subscription_status)}`}>
                  {formatLabel(room.subscription_status)}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Expires</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {room.subscription ? new Date(room.subscription.ends_at).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Days Left</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {room.subscription ? room.subscription.days_remaining : '—'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className={`${sectionCardClass} overflow-hidden`}>
        <div className="border-b border-gray-200/70 p-6 dark:border-gray-800">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            <CreditCard className="w-5 h-5" />
            Payment Records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50/90 dark:bg-gray-800/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Paid At
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {payments.map((payment) => (
                <tr key={payment.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {payment.room?.name || `Room #${payment.room_id}`}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatMoney(payment.amount, payment.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {formatLabel(payment.payment_method)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {payment.reference_number || '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(payment.paid_at).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadge(payment.status)}`}>
                      {formatLabel(payment.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    {payment.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={selectedPlanId || ''}
                          onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800"
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
                          className="inline-flex items-center rounded-lg bg-emerald-100 p-2 text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Confirm"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectPayment(payment.id)}
                          className="inline-flex items-center rounded-lg bg-rose-100 p-2 text-rose-700 transition-colors hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
                          title="Reject"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {payment.status === 'confirmed' && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Confirmed</span>
                    )}
                    {payment.status === 'rejected' && (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="mx-6 my-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
              No payment records found yet.
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
              <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-gray-200 bg-gradient-to-r from-[#012169] to-[#02317f] px-6 py-4 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Record Payment</h2>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-lg p-1 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-blue-100">Capture payment details and assign to a room.</p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room</label>
                      <select
                        value={formData.room_id}
                        onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                        className={inputClassName}
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className={inputClassName}
                          placeholder="99.00"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.paid_at}
                            onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
                            className={inputClassName}
                            required
                          />
                          <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                        className={inputClassName}
                      >
                        <option value="manual">Manual</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference Number</label>
                      <input
                        type="text"
                        value={formData.reference_number}
                        onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                        className={inputClassName}
                        placeholder="REF123456"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className={`${inputClassName} min-h-[96px]`}
                        rows={3}
                        placeholder="Optional notes"
                      />
                    </div>

                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-[#012169] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#011449]"
                      >
                        Record Payment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentManagement;
