import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../config/environment';
import { SubscriptionDetails } from '../types/subscription';
import { useAuth } from '../contexts/AuthContext';

const API_URL = getApiUrl();

const SubscriptionWarningBanner = () => {
  const { user } = useAuth();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      // Don't check for admins
      if (user?.role === 'admin') {
        setLoading(false);
        return;
      }

      try {
        const { data } = await axios.get<SubscriptionDetails>(`${API_URL}/subscription/my-status`);
        setSubscriptionDetails(data);
      } catch (err) {
        console.error('Failed to fetch subscription status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, [user]);

  useEffect(() => {
    // Reset dismissal when subscription details change
    setIsDismissed(false);
  }, [subscriptionDetails?.status]);

  if (loading || !subscriptionDetails || subscriptionDetails.status !== 'grace_period' || isDismissed) {
    return null;
  }

  const daysRemaining = subscriptionDetails.grace_ends_at
    ? Math.max(0, Math.ceil((new Date(subscriptionDetails.grace_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">
                  Your subscription expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-orange-100">
                  Please contact your administrator to renew your subscription to avoid service interruption.
                  {subscriptionDetails.room_name && ` Room: ${subscriptionDetails.room_name}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="ml-4 text-white hover:text-orange-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SubscriptionWarningBanner;
