import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { getApiUrl } from '../config/environment';
import { SubscriptionDetails } from '../types/subscription';

const API_URL = getApiUrl();

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionDetails | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated || !user) {
        setCheckingSubscription(false);
        return;
      }

      // Don't check subscription for payment-required page or if user is admin
      if (location.pathname === '/payment-required' || user.role === 'admin') {
        setCheckingSubscription(false);
        return;
      }

      try {
        const { data } = await axios.get<SubscriptionDetails>(`${API_URL}/subscription/my-status`);
        setSubscriptionStatus(data);
      } catch (err) {
        console.error('Failed to check subscription:', err);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [isAuthenticated, user, location.pathname]);

  if (isLoading || (isAuthenticated && checkingSubscription)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check subscription requirements for non-admin users
  if (
    user?.role !== 'admin' &&
    subscriptionStatus &&
    (subscriptionStatus.status === 'expired' || subscriptionStatus.status === 'none') &&
    location.pathname !== '/payment-required'
  ) {
    return <Navigate to="/payment-required" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

