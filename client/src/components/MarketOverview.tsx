import { getChangeDirection, type ChangeDirection } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { VolatilityIndex } from '@/lib/derivApi';

interface MarketOverviewProps {
  volatilityIndexes: VolatilityIndex[];
  isLoading: boolean;
}

export default function MarketOverview({ volatilityIndexes, isLoading }: MarketOverviewProps) {
  // Determine the direction of percentage change (positive, negative, neutral)
  const getDirectionClass = (direction: ChangeDirection) => {
    switch (direction) {
      case 'positive': return 'text-accent-green';
      case 'negative': return 'text-accent-red';
      default: return 'text-text-secondary';
    }
  };
  
  const renderMarketCard = (index: VolatilityIndex) => {
    const direction = getChangeDirection(index.percentChange || '0');
    
    return (
      <div key={index.id} className="bg-medium-gray rounded-lg p-3 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{index.name}</span>
          <span className="text-xs bg-accent-green bg-opacity-20 text-accent-green px-1.5 py-0.5 rounded">Live</span>
        </div>
        
        <div className="text-lg font-bold">{index.currentPrice}</div>
        
        <div className={`flex items-center mt-1 text-xs ${getDirectionClass(direction)}`}>
          {direction === 'positive' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          ) : direction === 'negative' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          ) : null}
          
          {index.percentChange} ({index.absoluteChange})
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>High: {index.highPrice || '-'}</span>
          <span>Low: {index.lowPrice || '-'}</span>
        </div>
      </div>
    );
  };
  
  const renderLoadingCards = () => {
    return Array(5).fill(0).map((_, index) => (
      <div key={index} className="bg-medium-gray rounded-lg p-3 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-7 w-20 mt-1" />
        <Skeleton className="h-4 w-16 mt-2" />
        <div className="mt-2 flex items-center justify-between">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    ));
  };
  
  return (
    <div className="p-4 bg-dark-gray border-b border-light-gray">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Market Overview</h2>
        
        <div className="flex space-x-2">
          <button className="bg-medium-gray hover:bg-light-gray px-3 py-1.5 rounded-md text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
          
          <button className="bg-medium-gray hover:bg-light-gray px-3 py-1.5 rounded-md text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            Refresh
          </button>
          
          <button className="bg-accent-blue hover:bg-opacity-80 px-3 py-1.5 rounded-md text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {isLoading ? renderLoadingCards() : volatilityIndexes.map(renderMarketCard)}
      </div>
    </div>
  );
}
