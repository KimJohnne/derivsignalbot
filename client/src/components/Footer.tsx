import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApiHealth } from '@/lib/derivApi';

export default function Footer() {
  const { data: healthData } = useQuery({
    queryKey: ['/api/health'],
    queryFn: fetchApiHealth,
    refetchInterval: 60000, // Refresh every minute
  });
  
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected'>('connected');
  const [databaseStatus, setDatabaseStatus] = useState<'connected' | 'disconnected'>('connected');
  const [emailStatus, setEmailStatus] = useState<'active' | 'inactive'>('active');
  
  // Update status indicators when health data changes
  useEffect(() => {
    if (healthData) {
      setApiStatus(healthData.services.derivAPI === 'connected' ? 'connected' : 'disconnected');
      setEmailStatus(healthData.services.emailService === 'configured' ? 'active' : 'inactive');
    }
  }, [healthData]);
  
  return (
    <footer className="bg-dark-gray border-t border-light-gray py-2 px-4 text-xs text-text-secondary flex justify-between items-center">
      <div>
        <span>Deriv Trading Bot</span>
        <span className="px-1">•</span>
        <span>Industry Grade v1.0.0</span>
      </div>
      
      <div className="flex items-center">
        <div className="flex items-center mr-4">
          <div className={`w-2 h-2 ${apiStatus === 'connected' ? 'bg-accent-green' : 'bg-accent-red'} rounded-full mr-1`}></div>
          <span>API: {apiStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div className="flex items-center mr-4">
          <div className={`w-2 h-2 ${databaseStatus === 'connected' ? 'bg-accent-green' : 'bg-accent-red'} rounded-full mr-1`}></div>
          <span>Database: {databaseStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div className="flex items-center">
          <div className={`w-2 h-2 ${emailStatus === 'active' ? 'bg-accent-green' : 'bg-accent-red'} rounded-full mr-1`}></div>
          <span>Email: {emailStatus === 'active' ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </footer>
  );
}
