import { useState } from 'react';
import { getChangeDirection, type ChangeDirection } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { VolatilityIndex } from '@/lib/derivApi';
import { 
  DigitsStrategies, 
  ManualStrategies, 
  StrategyTypes 
} from '@/lib/derivApi';

interface SidebarProps {
  volatilityIndexes: VolatilityIndex[];
  selectedVolatilityIndex: number | null;
  onSelectVolatilityIndex: (id: number) => void;
}

export default function Sidebar({ 
  volatilityIndexes, 
  selectedVolatilityIndex, 
  onSelectVolatilityIndex 
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter volatility indexes based on search query
  const filteredIndexes = volatilityIndexes.filter(index => 
    index.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Determine the direction of percentage change (positive, negative, neutral)
  const getDirectionClass = (direction: ChangeDirection) => {
    switch (direction) {
      case 'positive': return 'text-accent-green';
      case 'negative': return 'text-accent-red';
      default: return 'text-text-secondary';
    }
  };
  
  const getIndicatorClass = (direction: ChangeDirection) => {
    switch (direction) {
      case 'positive': return 'bg-accent-green';
      case 'negative': return 'bg-accent-red';
      default: return 'bg-text-secondary';
    }
  };
  
  return (
    <div className="w-64 bg-dark-gray border-r border-light-gray flex flex-col">
      <div className="p-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search..."
            className="w-full bg-medium-gray border border-light-gray rounded-md py-2 px-3 pl-9 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-blue"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth="1.5" 
            stroke="currentColor" 
            className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Volatility Indexes</h2>

          {filteredIndexes.map((index) => {
            const isSelected = selectedVolatilityIndex === index.id;
            const direction = getChangeDirection(index.percentChange || '0');
            
            return (
              <div 
                key={index.id}
                className={`mb-1 flex items-center justify-between hover:bg-hover-overlay px-2 py-1.5 rounded-md cursor-pointer group ${isSelected ? 'bg-medium-gray' : ''}`}
                onClick={() => onSelectVolatilityIndex(index.id)}
              >
                <div className="flex items-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${getIndicatorClass(direction)} mr-2`}></div>
                  <span className="text-sm font-medium">{index.name}</span>
                </div>
                <span className={`text-xs font-medium ${getDirectionClass(direction)}`}>{index.percentChange || '0%'}</span>
              </div>
            );
          })}
        </div>

        <div className="px-3 py-2 mt-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Trading Strategies</h2>
          
          <div className="text-xs text-gray-400 mt-2 mb-1">{StrategyTypes.DIGITS}</div>
          {Object.values(DigitsStrategies).map(strategy => (
            <div 
              key={strategy}
              className="mb-1 hover:bg-hover-overlay px-2 py-1.5 rounded-md cursor-pointer"
            >
              <span className="text-sm">{strategy}</span>
            </div>
          ))}
          
          <div className="text-xs text-gray-400 mt-2 mb-1">{StrategyTypes.MANUAL}</div>
          {Object.values(ManualStrategies).map(strategy => (
            <div 
              key={strategy}
              className="mb-1 hover:bg-hover-overlay px-2 py-1.5 rounded-md cursor-pointer"
            >
              <span className="text-sm">{strategy}</span>
            </div>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-light-gray">
        <div className="bg-medium-gray rounded-md p-3 text-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-secondary">API Status</span>
            <span className="bg-accent-green text-white px-1.5 py-0.5 rounded text-xs">Connected</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-secondary">Deriv ID:</span>
            <span className="font-mono">D{Math.floor(1000000 + Math.random() * 9000000)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
