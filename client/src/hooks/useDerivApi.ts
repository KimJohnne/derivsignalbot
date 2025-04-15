import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  fetchCandleData, 
  fetchVolatilityIndexes, 
  fetchSignals, 
  fetchStrategyPerformance,
  type CandleData,
  type VolatilityIndex,
  type Signal,
  type StrategyPerformance
} from '@/lib/derivApi';
import { useWebSocketContext } from '@/components/WebSocketProvider';

// Hook for fetching volatility indexes
export function useVolatilityIndexes() {
  const { volatilityIndexes } = useWebSocketContext();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/volatility-indexes'],
    queryFn: fetchVolatilityIndexes,
    enabled: volatilityIndexes.length === 0, // Only fetch via REST if not available via WebSocket
  });
  
  // Prefer WebSocket data, fall back to query data
  return {
    volatilityIndexes: volatilityIndexes.length > 0 ? volatilityIndexes : (data || []),
    isLoading,
    error
  };
}

// Hook for fetching signals
export function useSignals(limit: number = 10) {
  const { signals } = useWebSocketContext();
  
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/signals?limit=${limit}`],
    queryFn: () => fetchSignals(limit),
    enabled: signals.length === 0, // Only fetch via REST if not available via WebSocket
  });
  
  // Prefer WebSocket data, fall back to query data
  return {
    signals: signals.length > 0 ? signals : (data || []),
    isLoading,
    error
  };
}

// Hook for fetching strategy performance
export function useStrategyPerformance() {
  const { strategyPerformance } = useWebSocketContext();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/strategy-performance'],
    queryFn: fetchStrategyPerformance,
    enabled: strategyPerformance.length === 0, // Only fetch via REST if not available via WebSocket
  });
  
  // Prefer WebSocket data, fall back to query data
  return {
    strategyPerformance: strategyPerformance.length > 0 ? strategyPerformance : (data || []),
    isLoading,
    error
  };
}

// Hook for fetching candle data for charts
export function useCandleData(symbol: string, granularity: number = 60, count: number = 100) {
  const { sendMessage } = useWebSocketContext();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/market/candles/${symbol}`, granularity, count],
    queryFn: () => fetchCandleData(symbol, granularity, count),
  });
  
  useEffect(() => {
    // Subscribe to ticks for real-time updates
    sendMessage({ type: 'subscribe_ticks', symbol });
    
    return () => {
      // Unsubscribe when component unmounts or symbol changes
      sendMessage({ type: 'unsubscribe_ticks', symbol });
    };
  }, [symbol, sendMessage]);
  
  return {
    candleData: data || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for getting the optimal strategy based on performance data
export function useOptimalStrategy(volatilityIndexId: number) {
  const { strategyPerformance } = useStrategyPerformance();
  
  // Find all strategies for the given volatility index
  const relevantStrategies = strategyPerformance.filter(
    (strat: StrategyPerformance) => strat.volatilityIndexId === volatilityIndexId
  );
  
  // Find the strategy with the highest win rate
  const optimal = relevantStrategies.reduce((best: StrategyPerformance | undefined, current: StrategyPerformance) => {
    const bestWinRate = parseFloat(best?.winRate?.replace('%', '') || '0');
    const currentWinRate = parseFloat(current.winRate.replace('%', ''));
    
    return currentWinRate > bestWinRate ? current : best;
  }, relevantStrategies[0]);
  
  return {
    optimalStrategy: optimal,
    allStrategies: relevantStrategies,
  };
}
