import { useEffect, useState } from 'react';
import { formatEATime } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { Bell, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Header() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState<string>(formatEATime(new Date()));
  const [location] = useLocation();
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Update the clock every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatEATime(new Date()));
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Function to handle project download
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Create a request to create a zip file of the project
      const response = await fetch('/api/project/download', { method: 'POST' });
      
      if (response.ok) {
        // Get the download URL
        const { downloadUrl } = await response.json();
        
        // Create a temporary anchor to trigger download
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = 'deriv-trading-bot.zip';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        toast({
          title: 'Download Started',
          description: 'The project files will be downloaded shortly.',
          variant: 'default',
        });
      } else {
        throw new Error('Failed to create download');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not create the project download. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <header className="bg-dark-gray border-b border-light-gray">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-white mr-6">Deriv Trading Bot</h1>
          <span className="mr-6 bg-accent-blue text-xs px-2 py-1 rounded-full font-medium">Industry Grade</span>
          
          <nav className="flex space-x-4">
            <Link href="/">
              <div className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${location === '/' ? 'bg-medium-gray text-white' : 'text-text-secondary hover:text-white hover:bg-dark-hover'}`}>
                Dashboard
              </div>
            </Link>
            <Link href="/emails">
              <div className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer ${location === '/emails' ? 'bg-medium-gray text-white' : 'text-text-secondary hover:text-white hover:bg-dark-hover'}`}>
                <Bell className="w-4 h-4 mr-1" />
                Emails
              </div>
            </Link>
            <Link href="/settings">
              <div className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer ${location === '/settings' ? 'bg-medium-gray text-white' : 'text-text-secondary hover:text-white hover:bg-dark-hover'}`}>
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </div>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleDownload}
            variant="outline"
            size="sm"
            disabled={isDownloading}
            className="flex items-center gap-1 text-xs bg-medium-gray border-medium-gray hover:bg-dark-hover hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            {isDownloading ? 'Downloading...' : 'Download Project'}
          </Button>
          
          <div className="flex items-center text-sm text-text-secondary">
            <div className="w-2 h-2 bg-accent-green rounded-full mr-2"></div>
            <span>Real-time active</span>
          </div>
          
          <div className="bg-medium-gray rounded-md px-3 py-1.5 text-sm">
            <span className="text-text-secondary mr-1">EAT:</span>
            <span>{currentTime}</span>
          </div>
          
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-medium-gray flex items-center justify-center text-sm font-medium">
              U
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth="1.5" 
              stroke="currentColor" 
              className="w-4 h-4 ml-1 text-text-secondary"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
