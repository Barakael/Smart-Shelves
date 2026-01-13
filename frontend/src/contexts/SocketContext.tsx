import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface PanelClosedEvent {
  shelf_id: number;
  cabinet_id: number;
  panel_id: number;
  is_open: boolean;
  timestamp: string;
}

interface SocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: PanelClosedEvent | null;
  error: string | null;
  subscribe: (channel: string, callback: (data: any) => void) => void;
  unsubscribe: (channel: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<PanelClosedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventListeners, setEventListeners] = useState<Map<string, (data: any) => void>>(new Map());
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      setIsConnecting(true);
      setError(null);

      try {
        // Determine WebSocket URL based on environment
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = process.env.REACT_APP_WS_URL || `${wsProtocol}//${window.location.host}:8080`;
        
        const ws = new WebSocket(wsHost);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setIsConnecting(false);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            if (data.type === 'panel_closed') {
              const panelEvent: PanelClosedEvent = {
                shelf_id: data.shelf_id,
                cabinet_id: data.cabinet_id,
                panel_id: data.panel_id,
                is_open: data.is_open,
                timestamp: new Date().toISOString(),
              };
              setLastEvent(panelEvent);

              // Trigger subscribed callbacks
              const callback = eventListeners.get('panel_closed');
              if (callback) {
                callback(panelEvent);
              }
            }

            // Handle other event types
            if (data.channel) {
              const callback = eventListeners.get(data.channel);
              if (callback) {
                callback(data);
              }
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('WebSocket connection error');
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          setIsConnecting(false);

          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        setSocket(ws);
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setIsConnecting(false);

        // Retry after delay
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const subscribe = (channel: string, callback: (data: any) => void) => {
    setEventListeners((prev) => new Map(prev).set(channel, callback));

    // Send subscription message if WebSocket is connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'subscribe',
        channel: channel,
      }));
    }
  };

  const unsubscribe = (channel: string) => {
    setEventListeners((prev) => {
      const updated = new Map(prev);
      updated.delete(channel);
      return updated;
    });

    // Send unsubscription message if WebSocket is connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'unsubscribe',
        channel: channel,
      }));
    }
  };

  const value: SocketContextType = {
    isConnected,
    isConnecting,
    lastEvent,
    error,
    subscribe,
    unsubscribe,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
