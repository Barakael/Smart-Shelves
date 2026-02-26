import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/environment';

const API_URL = getApiUrl();

type UserRole = 'admin' | 'operator';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  room_id?: number | null;
  rooms?: number[];
  is_admin?: boolean;
}

interface Room {
  id: number;
  name: string;
  location?: string;
  description?: string;
  subscription_status: string;
  subscription?: {
    id: number;
    status: string;
    plan_name: string;
    plan_price: number;
    starts_at: string;
    ends_at: string;
    days_remaining: number;
    is_in_grace_period: boolean;
    grace_period_days_left: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentRoom: Room | null;
  accessibleRooms: Room[];
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setCurrentRoom: (roomId: number) => Promise<void>;
  loadAccessibleRooms: () => Promise<Room[]>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });
  const [currentRoom, setCurrentRoomState] = useState<Room | null>(null);
  const [accessibleRooms, setAccessibleRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/user`);
      setUser(response.data);
      
      // Load accessible rooms after user is fetched
      await loadAccessibleRoomsInternal();
      
      // Operators are locked to their primary room; admins can choose
      if (response.data.role === 'operator') {
        // Operators always use their primary room
        if (response.data.room_id) {
          await loadRoomDetails(response.data.room_id);
        }
      } else {
        // Admins can choose - use saved room or primary room
        const savedRoomId = localStorage.getItem('current_room_id');
        if (savedRoomId) {
          await loadRoomDetails(parseInt(savedRoomId));
        } else if (response.data.room_id) {
          await loadRoomDetails(response.data.room_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccessibleRoomsInternal = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/accessible-rooms`);
      setAccessibleRooms(response.data.rooms || []);
      return response.data.rooms || [];
    } catch (error) {
      console.error('Failed to load accessible rooms:', error);
      return [];
    }
  };

  const loadAccessibleRooms = async (): Promise<Room[]> => {
    return loadAccessibleRoomsInternal();
  };

  const loadRoomDetails = async (roomId: number) => {
    try {
      const response = await axios.get(`${API_URL}/rooms/${roomId}/subscription-status`);
      const roomData: Room = {
        id: response.data.room_id,
        name: response.data.room_name,
        subscription_status: response.data.subscription_status,
        subscription: response.data.subscription?.status !== 'no_subscription' 
          ? response.data.subscription 
          : undefined,
      };
      setCurrentRoomState(roomData);
      localStorage.setItem('current_room_id', roomId.toString());
    } catch (error) {
      console.error('Failed to load room details:', error);
    }
  };

  const setCurrentRoom = async (roomId: number) => {
    await loadRoomDetails(roomId);
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return userData;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setCurrentRoomState(null);
    setAccessibleRooms([]);
    localStorage.removeItem('token');
    localStorage.removeItem('current_room_id');
    delete axios.defaults.headers.common['Authorization'];
    // Redirect to login — use replace so back button won't return to protected routes
    try {
      window.location.replace('/login');
    } catch (e) {
      // Fallback navigation
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    // Global axios interceptor to handle token expiration / unauthorized
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        
        if (status === 401) {
          logout();
        } else if (status === 402) {
          // 402 = Payment Required (subscription expired)
          const errorData = {
            status,
            message: error?.response?.data?.message || 'Subscription expired',
            room: currentRoom,
          };
          sessionStorage.setItem('payment_required_data', JSON.stringify(errorData));
          window.location.href = '/payment-required';
        }
        // 403 is a permission error, not a payment issue — let individual pages handle it
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout, currentRoom]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentRoom,
        accessibleRooms,
        login,
        logout,
        refreshUser: fetchUser,
        setCurrentRoom,
        loadAccessibleRooms,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};