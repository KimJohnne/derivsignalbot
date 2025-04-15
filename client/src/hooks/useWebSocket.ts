import { useEffect, useState, useRef } from 'react';
import { getWebSocketUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { VolatilityIndex, Signal, StrategyPerformance } from '@/lib/derivApi';

// Define the WebSocket hook return type
interface WebSocketHookReturn {
  status: 'connecting' | 'connected' | 'disconnected';
  volatilityIndexes: VolatilityIndex[];
  signals: Signal[];
  strategyPerformance: StrategyPerformance[];
  sendMessage: (message: any) => void;
}

/**
 * Hook for WebSocket communication with the server
 */
export function useWebSocket(): WebSocketHookReturn {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [volatilityIndexes, setVolatilityIndexes] = useState<VolatilityIndex[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [strategyPerformance, setStrategyPerformance] = useState<StrategyPerformance[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Function to send messages to the server
  const sendMessage = (message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'initial_data':
        setVolatilityIndexes(data.data.volatilityIndexes);
        setSignals(data.data.recentSignals);
        setStrategyPerformance(data.data.strategyPerformance);
        break;
        
      case 'volatility_update':
        setVolatilityIndexes(prevIndexes => {
          const updatedIndex = data.data;
          return prevIndexes.map(index => 
            index.id === updatedIndex.id ? updatedIndex : index
          );
        });
        break;
        
      case 'new_signal':
        setSignals(prevSignals => [data.data, ...prevSignals]);
        
        // Show toast notification for new signals
        toast({
          title: `New Signal: ${data.data.volatilityName}`,
          description: `${data.data.strategyType}: ${data.data.strategyName} - ${data.data.predictedSignal}`,
          variant: 'default',
        });
        break;
        
      case 'signal_update':
        setSignals(prevSignals => {
          const updatedSignal = data.data;
          return prevSignals.map(signal => 
            signal.id === updatedSignal.id ? updatedSignal : signal
          );
        });
        break;
        
      case 'strategy_performance_update':
        setStrategyPerformance(prevPerformance => {
          const updatedPerformance = data.data;
          const exists = prevPerformance.some(p => p.id === updatedPerformance.id);
          
          if (exists) {
            return prevPerformance.map(p => 
              p.id === updatedPerformance.id ? updatedPerformance : p
            );
          } else {
            return [...prevPerformance, updatedPerformance];
          }
        });
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  // Function to set up the WebSocket connection
  const connectWebSocket = () => {
    setStatus('connecting');
    const ws = new WebSocket(getWebSocketUrl());
    socketRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to the server. Retrying...',
        variant: 'destructive',
      });
    };

    ws.onclose = () => {
      setStatus('disconnected');
      console.log('WebSocket disconnected');
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          connectWebSocket();
        }
      }, 3000);
    };

    // Return a cleanup function
    return () => {
      if (ws) {
        ws.close();
      }
    };
  };

  // Set up WebSocket connection on component mount
  useEffect(() => {
    const cleanup = connectWebSocket();
    
    // Handle visibility change to reconnect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          socketRef.current?.readyState !== WebSocket.OPEN && 
          status !== 'connecting') {
        connectWebSocket();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanup();
    };
  }, []);

  return {
    status,
    volatilityIndexes,
    signals,
    strategyPerformance,
    sendMessage
  };
}
