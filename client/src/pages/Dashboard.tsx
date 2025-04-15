import React from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MarketOverview from '@/components/MarketOverview';
import ChartPanel from '@/components/ChartPanel';
import SignalPanel from '@/components/SignalPanel';
import Footer from '@/components/Footer';
import { useVolatilityIndexes } from '@/hooks/useDerivApi';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { volatilityIndexes, isLoading } = useVolatilityIndexes();
  const [selectedVolatilityIndex, setSelectedVolatilityIndex] = React.useState<number | null>(null);
  
  // Set initial selected index when data loads
  React.useEffect(() => {
    if (volatilityIndexes.length > 0 && selectedVolatilityIndex === null) {
      // Default to Volatility 75 if available, otherwise select the first index
      const vol75 = volatilityIndexes.find(index => index.name === 'Volatility 75');
      setSelectedVolatilityIndex(vol75?.id || volatilityIndexes[0].id);
    }
  }, [volatilityIndexes, selectedVolatilityIndex]);

  // Handle volatility index selection
  const handleSelectVolatilityIndex = (id: number) => {
    setSelectedVolatilityIndex(id);
  };

  return (
    <div className="flex flex-col h-screen bg-dark-blue text-text-primary">
      <Header />
      
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          <Sidebar 
            volatilityIndexes={volatilityIndexes}
            selectedVolatilityIndex={selectedVolatilityIndex}
            onSelectVolatilityIndex={handleSelectVolatilityIndex}
          />
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <MarketOverview volatilityIndexes={volatilityIndexes} isLoading={isLoading} />
            
            <div className="flex-1 flex overflow-hidden">
              {isLoading || selectedVolatilityIndex === null ? (
                <div className="flex-1 p-4 space-y-4">
                  <Skeleton className="h-[300px] w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                  </div>
                </div>
              ) : (
                <ChartPanel 
                  selectedVolatilityIndex={selectedVolatilityIndex}
                  volatilityIndexes={volatilityIndexes}
                />
              )}
              
              <SignalPanel />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
