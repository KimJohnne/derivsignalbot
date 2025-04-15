import { useState } from 'react';
import { useSignals } from '@/hooks/useDerivApi';
import { formatEATime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { type Signal } from '@/lib/derivApi';

export default function SignalPanel() {
  const { signals, isLoading } = useSignals(20);
  const [signalView, setSignalView] = useState<'live' | 'history'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter signals based on search query
  const filteredSignals = signals.filter(signal => 
    signal.volatilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    signal.strategyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    signal.strategyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    signal.predictedSignal.toLowerCase().includes(searchQuery.toLowerCase()) ||
    signal.signalReason.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Function to render a signal badge
  const renderSignalBadge = (text: string, type: 'strategy' | 'probability' | 'outcome') => {
    let classes = 'signal-badge text-xs px-1.5 py-0.5 rounded';
    
    if (type === 'strategy') {
      if (text.includes('Over') || text.includes('Under')) {
        classes += ' bg-accent-yellow bg-opacity-20 text-accent-yellow';
      } else if (text.includes('Even') || text.includes('Odd')) {
        classes += ' bg-accent-blue bg-opacity-20 text-accent-blue';
      } else if (text.includes('Matches') || text.includes('Differs')) {
        classes += ' bg-accent-purple bg-opacity-20 text-accent-purple';
      } else {
        classes += ' bg-accent-green bg-opacity-20 text-accent-green';
      }
    } else if (type === 'probability') {
      const probability = parseInt(text.replace('%', ''));
      if (probability >= 70) {
        classes += ' bg-accent-green bg-opacity-20 text-accent-green';
      } else if (probability >= 60) {
        classes += ' bg-accent-yellow bg-opacity-20 text-accent-yellow';
      } else {
        classes += ' bg-accent-red bg-opacity-20 text-accent-red';
      }
    } else if (type === 'outcome') {
      if (text === 'win') {
        classes += ' bg-accent-green bg-opacity-20 text-accent-green';
      } else if (text === 'loss') {
        classes += ' bg-accent-red bg-opacity-20 text-accent-red';
      } else {
        classes += ' bg-text-secondary bg-opacity-20 text-text-secondary';
      }
    }
    
    return <span className={classes}>{text}</span>;
  };
  
  // Function to render the signal items
  const renderSignalItem = (signal: Signal) => {
    // Determine signal status indicator color
    const getStatusColor = () => {
      if (signal.outcome === 'win') return 'bg-accent-green';
      if (signal.outcome === 'loss') return 'bg-accent-red';
      
      const volatilityName = signal.volatilityName;
      if (volatilityName.includes('10')) return 'bg-accent-blue';
      if (volatilityName.includes('25')) return 'bg-accent-green';
      if (volatilityName.includes('50')) return 'bg-accent-purple';
      if (volatilityName.includes('75')) return 'bg-accent-green';
      if (volatilityName.includes('100')) return 'bg-accent-yellow';
      
      return 'bg-text-secondary';
    };
    
    return (
      <div 
        key={signal.id} 
        className={`p-3 border-b border-light-gray hover:bg-medium-gray ${signal.outcome === 'loss' ? 'bg-light-gray bg-opacity-20' : ''}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className={`w-2 h-2 ${getStatusColor()} rounded-full mr-2`}></span>
            <span className="text-sm font-medium">{signal.volatilityName}</span>
          </div>
          <span className="text-xs text-text-secondary">{formatEATime(signal.timestamp)}</span>
        </div>
        
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex space-x-2 mb-1">
              {renderSignalBadge(`${signal.strategyName}`, 'strategy')}
              {renderSignalBadge(`${signal.winProbability} Win Prob`, 'probability')}
            </div>
            <div className="text-sm">Entry: <span className="font-medium">{signal.entryPoint}</span></div>
          </div>
          <button className="text-xs bg-medium-gray hover:bg-light-gray px-2 py-1 rounded">Details</button>
        </div>
        
        <div className="text-xs truncate text-text-secondary">
          {signal.signalReason}
        </div>
      </div>
    );
  };
  
  // Function to render loading skeletons
  const renderLoadingSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <div key={index} className="p-3 border-b border-light-gray">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex space-x-2 mb-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-14" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    ));
  };
  
  return (
    <div className="w-80 bg-dark-gray border-l border-light-gray overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-light-gray">
        <h3 className="text-base font-semibold mb-2">Trading Signals</h3>
        
        <div className="flex space-x-2 mb-3">
          <button 
            className={`${signalView === 'live' ? 'bg-accent-blue hover:bg-opacity-80' : 'bg-medium-gray hover:bg-light-gray'} px-3 py-1.5 rounded-md text-xs flex-1`}
            onClick={() => setSignalView('live')}
          >
            Live
          </button>
          <button 
            className={`${signalView === 'history' ? 'bg-accent-blue hover:bg-opacity-80' : 'bg-medium-gray hover:bg-light-gray'} px-3 py-1.5 rounded-md text-xs flex-1`}
            onClick={() => setSignalView('history')}
          >
            History
          </button>
        </div>
        
        <div className="relative">
          <Input
            type="text"
            placeholder="Search signals..."
            className="w-full bg-medium-gray border border-light-gray rounded-md py-2 px-3 pl-9 text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-blue"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth="1.5" 
            stroke="currentColor" 
            className="w-4 h-4 absolute left-3 top-2 text-gray-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? 
          renderLoadingSkeletons() : 
          filteredSignals.length > 0 ? 
            filteredSignals.map(renderSignalItem) : 
            <div className="p-4 text-center text-text-secondary">No signals found</div>
        }
      </div>

      <div className="p-4 border-t border-light-gray">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Email Notifications</h4>
          <button className="text-xs bg-medium-gray hover:bg-light-gray px-2 py-1 rounded flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth="1.5" 
              stroke="currentColor" 
              className="w-3 h-3 mr-1"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Config
          </button>
        </div>

        <div className="bg-medium-gray rounded-md p-3 text-sm">
          <div className="flex items-center mb-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth="1.5" 
              stroke="currentColor" 
              className="w-4 h-4 mr-2 text-accent-green"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span>Email notifications active</span>
          </div>
          
          <div className="text-xs flex flex-col space-y-1 text-text-secondary">
            <span>From: kjohnne254@gmail.com</span>
            <span>To: kimaniwaweru1999@gmail.com</span>
            <span>To: joshuamurimi1995@gmail.com</span>
            <div className="pt-2 mt-1 border-t border-light-gray flex justify-between">
              <span>Last signal sent:</span>
              <span>{filteredSignals.length > 0 ? formatEATime(filteredSignals[0]?.timestamp) : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
