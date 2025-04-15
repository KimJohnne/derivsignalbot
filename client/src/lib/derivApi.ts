// Client-side interface for interacting with the Deriv API
import { apiRequest } from "./queryClient";

// Types
export interface CandleData {
  time: number;
  open: number;
  high: number;
  close: number;
  low: number;
}

export interface VolatilityIndex {
  id: number;
  name: string;
  symbol: string;
  currentPrice: string;
  highPrice?: string;
  lowPrice?: string;
  percentChange?: string;
  absoluteChange?: string;
  lastUpdated: string | Date;
}

export interface Signal {
  id: number;
  volatilityIndexId: number;
  volatilityName: string;
  strategyType: string;
  strategyName: string;
  entryPoint: string;
  predictedSignal: string;
  signalReason: string;
  winProbability: string;
  timestamp: string | Date;
  emailSent: boolean;
  outcome: string;
  metadata?: any;
}

export interface StrategyPerformance {
  id: number;
  strategyType: string;
  strategyName: string;
  volatilityIndexId: number;
  winRate: string;
  sampleSize: number;
  lastUpdated: string | Date;
}

// API Methods
export async function fetchVolatilityIndexes(): Promise<VolatilityIndex[]> {
  const response = await apiRequest('GET', '/api/volatility-indexes');
  return response.json();
}

export async function fetchVolatilityIndex(id: number): Promise<VolatilityIndex> {
  const response = await apiRequest('GET', `/api/volatility-indexes/${id}`);
  return response.json();
}

export async function fetchSignals(limit: number = 10): Promise<Signal[]> {
  const response = await apiRequest('GET', `/api/signals?limit=${limit}`);
  return response.json();
}

export async function fetchSignal(id: number): Promise<Signal> {
  const response = await apiRequest('GET', `/api/signals/${id}`);
  return response.json();
}

export async function createSignal(signal: Omit<Signal, 'id'>): Promise<Signal> {
  const response = await apiRequest('POST', '/api/signals', signal);
  return response.json();
}

export async function fetchStrategyPerformance(): Promise<StrategyPerformance[]> {
  const response = await apiRequest('GET', '/api/strategy-performance');
  return response.json();
}

export async function fetchCandleData(symbol: string, granularity: number = 60, count: number = 100): Promise<CandleData[]> {
  const response = await apiRequest('GET', `/api/market/candles/${symbol}?granularity=${granularity}&count=${count}`);
  const data = await response.json();
  
  if (!data.candles) {
    throw new Error('Failed to fetch candle data');
  }
  
  return data.candles.map((candle: any) => ({
    time: new Date(candle.epoch * 1000).getTime() / 1000,
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    close: parseFloat(candle.close),
    low: parseFloat(candle.low)
  }));
}

export async function fetchApiHealth(): Promise<{
  status: string;
  services: {
    derivAPI: string;
    emailService: string;
  };
  timestamp: string;
}> {
  const response = await apiRequest('GET', '/api/health');
  return response.json();
}

// Enums for consistent naming
export const VolatilityIndexNames = {
  VOL_10: "Volatility 10",
  VOL_25: "Volatility 25",
  VOL_50: "Volatility 50",
  VOL_75: "Volatility 75",
  VOL_100: "Volatility 100",
  VOL_200: "Volatility 200",
} as const;

export const StrategyTypes = {
  DIGITS: "Digits",
  MANUAL: "Manual",
} as const;

export const DigitsStrategies = {
  EVEN_ODD: "Even/Odd",
  OVER_UNDER: "Over/Under",
  MATCHES_DIFFERS: "Matches/Differs",
} as const;

export const ManualStrategies = {
  CANDLESTICK: "Candlestick",
  TREND: "Trend",
  MOMENTUM: "Momentum",
} as const;

export const SignalOutcomes = {
  PENDING: "pending",
  WIN: "win",
  LOSS: "loss",
} as const;

// Symbol mapping to ensure consistency
export const SymbolMapping: Record<string, string> = {
  [VolatilityIndexNames.VOL_10]: "R_10",
  [VolatilityIndexNames.VOL_25]: "R_25",
  [VolatilityIndexNames.VOL_50]: "R_50",
  [VolatilityIndexNames.VOL_75]: "R_75",
  [VolatilityIndexNames.VOL_100]: "R_100",
  [VolatilityIndexNames.VOL_200]: "R_200",
};

// Reverse mapping for display purposes
export const SymbolToName: Record<string, string> = Object.entries(SymbolMapping)
  .reduce((acc, [name, symbol]) => ({ ...acc, [symbol]: name }), {});
