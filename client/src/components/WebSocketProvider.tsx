import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { VolatilityIndex, Signal, StrategyPerformance } from '@/lib/derivApi';

// Define the shape of the WebSocket context
interface WebSocketContextType {
  status: 'connecting' | 'connected' | 'disconnected';
  volatilityIndexes: VolatilityIndex[];
  signals: Signal[];
  strategyPerformance: StrategyPerformance[];
  sendMessage: (message: any) => void;
}

// Create the context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  status: 'disconnected',
  volatilityIndexes: [],
  signals: [],
  strategyPerformance: [],
  sendMessage: () => {},
});

// Provider component that wraps the app
export function WebSocketProvider({ children }: { children: ReactNode }) {
  // Use the hook to get websocket data and functions
  const wsData = useWebSocket();

  return (
    <WebSocketContext.Provider value={wsData}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Export the hook to use websocket context
export const useWebSocketContext = () => useContext(WebSocketContext);