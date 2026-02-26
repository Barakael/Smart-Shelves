import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/environment';
import { SubscriptionDetails } from '../types/subscription';

const API_URL = getApiUrl();

const PaymentRequired = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If user is admin, they shouldn't be here
    if (user?.role === 'admin') {
      navigate('/dashboard');
      return;
    }

    // Try to load subscription details from session storage first
    const paymentData = sessionStorage.getItem('payment_required_data');
    if (paymentData) {
      try {
        const parsed = JSON.parse(paymentData);
        if (parsed.message) {
          setError(parsed.message);
        }
      } catch (e) {
        // Ignore parse errors
      }
      sessionStorage.removeItem('payment_required_data');
    }

    fetchSubscriptionStatus();
  }, [user, navigate]);

  const fetchSubscriptionStatus = async () => {
    try {
      const { data } = await axios.get<SubscriptionDetails>(`${API_URL}/subscription/my-status`);
      setSubscriptionDetails(data);

      // If subscription is now active, redirect to dashboard
      if (data.status === 'active' || data.status === 'grace_period') {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Failed to fetch subscription status:', err);
      // For 401, the user's session expired, so logout
      if (err.response?.status === 401) {
        logout();
        return;
      }
      setError('Unable to check subscription status. Please try again.');
    }
  };

  const handleRefreshStatus = async () => {
    setIsChecking(true);
    setError(null);
    await fetchSubscriptionStatus();
    setIsChecking(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const daysInGrace = subscriptionDetails?.status === 'grace_period' && subscriptionDetails.grace_ends_at
    ? Math.max(0, Math.ceil((new Date(subscriptionDetails.grace_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Subscription Required</h1>
              <p className="text-red-100">Access to the system is currently restricted</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {subscriptionDetails?.status === 'grace_period' ? (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    Grace Period Active
                  </h3>
                  <p className="text-orange-800 dark:text-orange-200 mb-3">
                    Your subscription has expired, but you still have <strong>{daysInGrace} day{daysInGrace !== 1 ? 's' : ''}</strong> remaining in the grace period.
                    Please contact your administrator to renew your subscription before access is fully restricted.
                  </p>
                  {subscriptionDetails.room_name && (
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Room: <strong>{subscriptionDetails.room_name}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  Subscription Expired
                </h3>
                <p className="text-red-800 dark:text-red-200">
                  {subscriptionDetails?.message || 'Your subscription has expired. Please contact your administrator to renew your subscription.'}
                </p>
                {subscriptionDetails?.room_name && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-3">
                    Room: <strong>{subscriptionDetails.room_name}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">What should I do?</h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-[#012169] mt-1">•</span>
                <span>Contact your system administrator to renew the subscription</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#012169] mt-1">•</span>
                <span>Provide your room information: <strong>{subscriptionDetails?.room_name || 'N/A'}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#012169] mt-1">•</span>
                <span>Once payment is confirmed, click "Refresh Status" below to regain access</span>
              </li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleRefreshStatus}
              disabled={isChecking}
              className="flex-1 bg-[#012169] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#011449] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Refresh Status'}
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 rounded-xl font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Having issues? Contact your administrator at:</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mt-1">admin@smartshelves.com</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentRequired;
