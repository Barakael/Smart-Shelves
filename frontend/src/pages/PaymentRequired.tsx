import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard, Mail, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PaymentRequired = () => {
  const [errorData, setErrorData] = useState<any>(null);
  const { logout, currentRoom } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Load error data from sessionStorage
    const stored = sessionStorage.getItem('payment_required_data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setErrorData(data);
      } catch (error) {
        console.error('Failed to parse payment data:', error);
      }
    }

    // If no error data and no current room subscription issue, redirect to cabinets
    if (!stored && currentRoom?.subscription_status === 'active') {
      navigate('/cabinets');
    }
  }, [navigate, currentRoom]);

  const handleLogout = () => {
    sessionStorage.removeItem('payment_required_data');
    logout();
  };

  const getStatusMessage = () => {
    const room = errorData?.room || currentRoom;
    const status = room?.subscription_status;

    if (status === 'grace_period') {
      const daysLeft = room?.subscription?.grace_period_days_left || 0;
      return {
        title: 'Subscription Grace Period',
        message: `Your subscription has expired but you're in the grace period. You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining to renew before access is blocked.`,
        color: 'orange',
        icon: Clock,
      };
    } else if (status === 'expired') {
      return {
        title: 'Subscription Expired',
        message: 'Your subscription has expired and the grace period has ended. Please contact the administrator to renew your subscription.',
        color: 'red',
        icon: AlertCircle,
      };
    } else if (status === 'no_subscription') {
      return {
        title: 'No Active Subscription',
        message: 'This room does not have an active subscription. Please contact the administrator to activate a subscription plan.',
        color: 'gray',
        icon: AlertCircle,
      };
    } else {
      return {
        title: 'Payment Required',
        message: 'Your subscription requires renewal. Please contact the administrator to continue using the system.',
        color: 'red',
        icon: CreditCard,
      };
    }
  };

  const statusInfo = getStatusMessage();
  const room = errorData?.room || currentRoom;
  const subscription = room?.subscription;

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'orange':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-400',
          icon: 'text-orange-600 dark:text-orange-400',
        };
      case 'red':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          icon: 'text-red-600 dark:text-red-400',
        };
      case 'gray':
        return {
          bg: 'bg-gray-100 dark:bg-gray-900/30',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-700 dark:text-gray-400',
          icon: 'text-gray-600 dark:text-gray-400',
        };
      default:
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          icon: 'text-red-600 dark:text-red-400',
        };
    }
  };

  const colors = getColorClasses(statusInfo.color);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={`p-6 ${colors.bg} ${colors.border} border-b`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full bg-white dark:bg-gray-900`}>
                <StatusIcon className={`w-8 h-8 ${colors.icon}`} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${colors.text}`}>
                  {statusInfo.title}
                </h1>
                <p className={`text-sm ${colors.text} opacity-80 mt-1`}>
                  Action required to continue
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Alert Message */}
            <div className={`p-4 rounded-xl ${colors.bg} ${colors.border} border`}>
              <p className={`${colors.text} leading-relaxed`}>
                {statusInfo.message}
              </p>
            </div>

            {/* Room Information */}
            {room && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Room Information
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Room Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{room.name}</span>
                  </div>
                  {subscription && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {subscription.plan_name}
                        </span>
                      </div>
                      {subscription.ends_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {subscription.days_remaining > 0 ? 'Expires:' : 'Expired:'}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(subscription.ends_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contact Admin */}
            <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
              <h2 className="font-semibold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contact Administrator
              </h2>
              <p className="text-blue-800 dark:text-blue-400 text-sm mb-4">
                To renew your subscription and restore access, please contact the system administrator:
              </p>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <a
                    href="mailto:admin@smartshelves.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    admin@smartshelves.com
                  </a>
                </div>
              </div>
            </div>

            {/* Plan Information (if available) */}
            {subscription?.plan_price && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Subscription Details
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Annual Cost:</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${subscription.plan_price.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need immediate assistance?{' '}
            <a href="mailto:admin@smartshelves.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentRequired;
