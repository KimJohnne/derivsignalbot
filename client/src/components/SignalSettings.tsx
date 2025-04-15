import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SignalGeneratorSettings {
  maxSignals: number;
  intervalMinutes: number;
  entryAfterConsecutiveCount: number;
}

export default function SignalSettings() {
  const [settings, setSettings] = useState<SignalGeneratorSettings>({
    maxSignals: 5,
    intervalMinutes: 5,
    entryAfterConsecutiveCount: 3
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [generatorStatus, setGeneratorStatus] = useState<'running' | 'stopped'>('running');
  const { toast } = useToast();

  // Fetch current settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/signal-generator/settings');
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to fetch signal generator settings',
            variant: 'destructive'
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch signal generator settings',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    // Check health to determine if the generator is running
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        
        if (response.ok) {
          const data = await response.json();
          setGeneratorStatus(data.services.signalGenerator === 'running' ? 'running' : 'stopped');
        }
      } catch (error) {
        console.error('Failed to check health:', error);
      }
    };
    
    fetchSettings();
    checkHealth();
  }, [toast]);

  // Handle changes to settings
  const handleChange = (field: keyof SignalGeneratorSettings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/signal-generator/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast({
          title: 'Settings Saved',
          description: 'Signal generator settings have been updated.',
          variant: 'default'
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to save settings',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Start generator
  const startGenerator = async () => {
    try {
      setIsStarting(true);
      const response = await fetch('/api/signal-generator/start', {
        method: 'POST'
      });
      
      if (response.ok) {
        setGeneratorStatus('running');
        toast({
          title: 'Signal Generator Started',
          description: 'Signal generator is now running.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to start signal generator',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start signal generator',
        variant: 'destructive'
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Stop generator
  const stopGenerator = async () => {
    try {
      setIsStopping(true);
      const response = await fetch('/api/signal-generator/stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        setGeneratorStatus('stopped');
        toast({
          title: 'Signal Generator Stopped',
          description: 'Signal generator has been stopped.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to stop signal generator',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop signal generator',
        variant: 'destructive'
      });
    } finally {
      setIsStopping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-dark-gray border border-light-gray rounded-md">
      <h3 className="text-base font-semibold mb-4">Signal Generator Settings</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <Label htmlFor="maxSignals">Maximum Signals: {settings.maxSignals}</Label>
            <span className="text-xs text-text-secondary">Limit: 1-10</span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              id="maxSignals"
              min={1}
              max={10}
              step={1}
              value={[settings.maxSignals]}
              onValueChange={(value) => handleChange('maxSignals', value[0])}
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.maxSignals}
              onChange={(e) => handleChange('maxSignals', parseInt(e.target.value))}
              className="w-16 text-center"
            />
          </div>
          <p className="text-xs text-text-secondary mt-1">Maximum number of signals to generate at any time.</p>
        </div>
        
        <div>
          <div className="flex justify-between mb-2">
            <Label htmlFor="intervalMinutes">Signal Interval (minutes): {settings.intervalMinutes}</Label>
            <span className="text-xs text-text-secondary">Limit: 1-60</span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              id="intervalMinutes"
              min={1}
              max={60}
              step={1}
              value={[settings.intervalMinutes]}
              onValueChange={(value) => handleChange('intervalMinutes', value[0])}
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              max={60}
              value={settings.intervalMinutes}
              onChange={(e) => handleChange('intervalMinutes', parseInt(e.target.value))}
              className="w-16 text-center"
            />
          </div>
          <p className="text-xs text-text-secondary mt-1">Time between signal generation checks.</p>
        </div>
        
        <div>
          <div className="flex justify-between mb-2">
            <Label htmlFor="entryAfterConsecutiveCount">Entry After Consecutive Count: {settings.entryAfterConsecutiveCount}</Label>
            <span className="text-xs text-text-secondary">Limit: 1-10</span>
          </div>
          <div className="flex items-center gap-2">
            <Slider
              id="entryAfterConsecutiveCount"
              min={1}
              max={10}
              step={1}
              value={[settings.entryAfterConsecutiveCount]}
              onValueChange={(value) => handleChange('entryAfterConsecutiveCount', value[0])}
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.entryAfterConsecutiveCount}
              onChange={(e) => handleChange('entryAfterConsecutiveCount', parseInt(e.target.value))}
              className="w-16 text-center"
            />
          </div>
          <p className="text-xs text-text-secondary mt-1">Number of consecutive digits required before generating a signal (e.g., 3 consecutive even digits for an Odd signal).</p>
        </div>
        
        <div className="flex flex-col space-y-2 mt-6">
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : 'Save Settings'}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={startGenerator} 
              disabled={isStarting || generatorStatus === 'running'}
              variant={generatorStatus === 'running' ? 'secondary' : 'default'}
              className="w-full"
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : 'Start Generator'}
            </Button>
            
            <Button 
              onClick={stopGenerator} 
              disabled={isStopping || generatorStatus === 'stopped'}
              variant="destructive"
              className="w-full"
            >
              {isStopping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : 'Stop Generator'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}