import { useEffect, useRef, useState } from 'react';
import { useCandleData, useOptimalStrategy } from '@/hooks/useDerivApi';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { SymbolMapping } from '@/lib/derivApi';
import type { VolatilityIndex } from '@/lib/derivApi';

interface ChartPanelProps {
  selectedVolatilityIndex: number;
  volatilityIndexes: VolatilityIndex[];
}

export default function ChartPanel({ selectedVolatilityIndex, volatilityIndexes }: ChartPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(60); // 1 minute by default
  
  // Get the selected volatility index details
  const volatilityIndex = volatilityIndexes.find(index => index.id === selectedVolatilityIndex);
  
  // Get deriv API symbol for the selected volatility index
  const symbol = volatilityIndex ? SymbolMapping[volatilityIndex.name] : '';
  
  // Fetch candle data
  const { candleData, isLoading } = useCandleData(symbol, selectedTimeframe);
  
  // Get optimal strategy for the selected volatility index
  const { optimalStrategy, allStrategies } = useOptimalStrategy(selectedVolatilityIndex);
  
  // Define the extended Window interface
  interface ExtendedWindow extends Window {
    LightweightCharts?: any;
  }
  
  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || candleData.length === 0) return;
    
    // If chart already exists, destroy it
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }
    
    try {
      // Create chart using the global instance from the script
      const LightweightCharts = (window as ExtendedWindow).LightweightCharts;
      
      if (!LightweightCharts) {
        console.error('LightweightCharts library not loaded');
        return;
      }
      
      const chartOptions = {
        layout: {
          background: { color: '#0d1117' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#21262d' },
          horzLines: { color: '#21262d' },
        },
        crosshair: {
          mode: 0,
        },
        priceScale: {
          borderColor: '#21262d',
        },
        timeScale: {
          borderColor: '#21262d',
          timeVisible: true,
        },
        width: chartContainerRef.current.clientWidth,
        height: 300,
      };
      
      const chart = LightweightCharts.createChart(chartContainerRef.current, chartOptions);
      chartInstanceRef.current = chart;
      
      // Use the correct method to add series based on the library version
      let candleSeries;
      
      if (typeof chart.addCandlestickSeries === 'function') {
        candleSeries = chart.addCandlestickSeries({
          upColor: '#2ea043',
          downColor: '#f85149',
          borderUpColor: '#2ea043',
          borderDownColor: '#f85149',
          wickUpColor: '#2ea043',
          wickDownColor: '#f85149',
        });
      } else if (typeof chart.addSeries === 'function') {
        // Fallback for older API versions
        candleSeries = chart.addSeries('candlestick', {
          upColor: '#2ea043',
          downColor: '#f85149',
          borderUpColor: '#2ea043',
          borderDownColor: '#f85149',
          wickUpColor: '#2ea043',
          wickDownColor: '#f85149',
        });
      } else {
        console.error('Cannot add candlestick series - method not available');
        return;
      }
      
      // Format the data for the chart if needed
      const formattedData = candleData.map(candle => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));
      
      // Set data
      candleSeries.setData(formattedData);
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
    
    // Handle resize
    const handleResize = () => {
      if (chartInstanceRef.current && chartContainerRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [candleData, volatilityIndex]);
  
  if (!volatilityIndex) {
    return (
      <div className="flex-1 p-4 flex justify-center items-center">
        <div className="text-text-secondary">Select a volatility index to view chart</div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-auto p-4 bg-dark-blue">
      <div className="border-b border-light-gray pb-3 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold">{volatilityIndex.name}</h3>
            <span className={`ml-2 text-xs ${volatilityIndex.percentChange?.includes('-') ? 'text-accent-red' : 'text-accent-green'}`}>
              {volatilityIndex.percentChange}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <div className="bg-medium-gray rounded-md flex">
              <button 
                className={`px-3 py-1.5 text-sm border-r border-light-gray ${selectedTimeframe === 60 ? 'bg-light-gray' : ''}`}
                onClick={() => setSelectedTimeframe(60)}
              >
                1m
              </button>
              <button 
                className={`px-3 py-1.5 text-sm border-r border-light-gray ${selectedTimeframe === 300 ? 'bg-light-gray' : ''}`}
                onClick={() => setSelectedTimeframe(300)}
              >
                5m
              </button>
              <button 
                className={`px-3 py-1.5 text-sm border-r border-light-gray ${selectedTimeframe === 900 ? 'bg-light-gray' : ''}`}
                onClick={() => setSelectedTimeframe(900)}
              >
                15m
              </button>
              <button 
                className={`px-3 py-1.5 text-sm border-r border-light-gray ${selectedTimeframe === 3600 ? 'bg-light-gray' : ''}`}
                onClick={() => setSelectedTimeframe(3600)}
              >
                1h
              </button>
              <button 
                className={`px-3 py-1.5 text-sm ${selectedTimeframe === 86400 ? 'bg-light-gray' : ''}`}
                onClick={() => setSelectedTimeframe(86400)}
              >
                1d
              </button>
            </div>
            
            <button className="bg-medium-gray hover:bg-light-gray px-3 py-1.5 rounded-md text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
              Indicators
            </button>
          </div>
        </div>
      </div>

      <div className="chart-container mb-4 h-[300px]" ref={chartContainerRef}>
        {isLoading && (
          <div className="h-full w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-gray rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-3">Current Strategy Analysis</h4>
          
          {optimalStrategy ? (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Strategy</span>
                <span className="bg-accent-yellow bg-opacity-20 text-accent-yellow text-xs px-2 py-0.5 rounded-full">
                  {optimalStrategy.strategyName}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Entry Point</span>
                <span className="text-sm font-medium">{volatilityIndex.currentPrice}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Signal Strength</span>
                <div className="w-28">
                  <Progress value={parseFloat(optimalStrategy.winRate)} max={100} className="h-2" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Win Probability</span>
                <span className="text-sm font-medium">{optimalStrategy.winRate}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-light-gray">
            <div className="text-xs text-text-secondary mb-1">Signal Reason</div>
            <div className="text-sm">
              {optimalStrategy 
                ? "Trend spike detected after 5-candle consolidation. Momentum indicators showing strong continuation pattern."
                : <div><Skeleton className="h-10 w-full" /></div>
              }
            </div>
          </div>
        </div>

        <div className="bg-dark-gray rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Strategy Performance</h4>
            <div className="text-xs text-text-secondary">Last 24 hours</div>
          </div>
          
          {allStrategies.length > 0 ? (
            <div className="space-y-2">
              {allStrategies.map(strategy => {
                const winRate = parseFloat(strategy.winRate.replace('%', ''));
                const getColorClass = () => {
                  if (strategy.strategyName === "Even/Odd") return "bg-accent-blue";
                  if (strategy.strategyName === "Over/Under") return "bg-accent-green";
                  if (strategy.strategyName === "Matches/Differs") return "bg-accent-purple";
                  return "bg-accent-yellow";
                };
                
                return (
                  <div key={strategy.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 ${getColorClass()} rounded-full mr-2`}></span>
                      <span className="text-sm">{strategy.strategyName}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{strategy.winRate}</span>
                      <div className="w-20">
                        <Progress value={winRate} max={100} className={`h-2 ${getColorClass()}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-light-gray flex items-center justify-between">
            <div className="text-sm">Recommended Strategy</div>
            {optimalStrategy ? (
              <div className="bg-accent-green bg-opacity-20 text-accent-green text-xs px-2 py-0.5 rounded-full">
                {optimalStrategy.strategyName} ({optimalStrategy.winRate})
              </div>
            ) : (
              <Skeleton className="h-4 w-24" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
