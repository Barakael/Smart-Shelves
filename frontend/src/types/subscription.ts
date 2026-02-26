export type SubscriptionStatus = 'active' | 'expired' | 'grace_period' | 'none' | 'exempt';

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  period_days: number;
  is_active: boolean;
}

export interface Subscription {
  id: number;
  room_id: number;
  plan_id: number;
  status: 'active' | 'expired' | 'grace_period';
  starts_at: string;
  ends_at: string;
  grace_ends_at: string | null;
  days_remaining: number;
  auto_renew: boolean;
  plan?: Plan;
}

export interface SubscriptionDetails {
  is_admin_exempt?: boolean;
  status: SubscriptionStatus;
  room_name?: string;
  message?: string;
  expires_at?: string;
  grace_ends_at?: string | null;
  days_remaining?: number;
  plan?: {
    name: string;
    period_days: number;
  };
}

export type PaymentMethod = 'manual' | 'cash' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

export interface Payment {
  id: number;
  subscription_id: number | null;
  room_id: number;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  reference_number: string | null;
  notes: string | null;
  paid_at: string;
  confirmed_by: number | null;
  confirmed_at: string | null;
  room?: {
    id: number;
    name: string;
  };
  subscription?: Subscription;
  confirmedBy?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface RoomWithSubscription {
  id: number;
  name: string;
  description?: string;
  subscription_status: SubscriptionStatus;
  subscription?: Subscription;
}
