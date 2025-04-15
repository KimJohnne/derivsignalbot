import { useState, useEffect } from 'react';
import { createApiUrl } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Inbox, RefreshCw } from 'lucide-react';

// Interface for email data
interface EmailMetadata {
  subject: string;
  to: string;
  from: string;
  timestamp: string;
  signalId?: number;
  volatilityName?: string;
  strategyType?: string;
  strategyName?: string;
  predictedSignal?: string;
}

interface Email {
  path: string;
  metadata: EmailMetadata;
}

interface EmailsResponse {
  count: number;
  emails: Email[];
}

export default function Emails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(createApiUrl('/emails'));
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      
      const data: EmailsResponse = await response.json();
      
      // Sort emails by timestamp, newest first
      const sortedEmails = [...data.emails].sort((a, b) => {
        const dateA = new Date(a.metadata.timestamp);
        const dateB = new Date(b.metadata.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      
      setEmails(sortedEmails);
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Format email timestamp
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Notifications</h1>
          <p className="text-muted-foreground">
            View all signal notifications sent by the system
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchEmails} 
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        // Loading skeleton
        Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="mb-4">
            <CardHeader>
              <Skeleton className="h-5 w-[250px] mb-2" />
              <Skeleton className="h-4 w-[200px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))
      ) : emails.length === 0 ? (
        // Empty state
        <Card>
          <CardContent className="pt-6 pb-8 flex flex-col items-center justify-center">
            <Inbox className="w-12 h-12 mb-4 text-muted-foreground" />
            <h3 className="text-xl font-medium mb-2">No emails found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              No signal notifications have been sent yet. They will appear here when trading signals are generated.
            </p>
          </CardContent>
        </Card>
      ) : (
        // Emails list
        <div className="space-y-4">
          {emails.map((email, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{email.metadata.subject}</CardTitle>
                  <Badge variant={
                    email.metadata.predictedSignal === 'UP' ? 'default' : 
                    email.metadata.predictedSignal === 'DOWN' ? 'destructive' : 'outline'
                  }>
                    {email.metadata.predictedSignal || 'INFO'}
                  </Badge>
                </div>
                <CardDescription>
                  {email.metadata.timestamp && formatDate(email.metadata.timestamp)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">From:</div>
                    <div>{email.metadata.from}</div>
                    <div className="text-muted-foreground">To:</div>
                    <div>{email.metadata.to}</div>
                  </div>
                  
                  {(email.metadata.volatilityName || email.metadata.strategyType) && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {email.metadata.volatilityName && (
                          <>
                            <div className="text-muted-foreground">Market:</div>
                            <div>{email.metadata.volatilityName}</div>
                          </>
                        )}
                        {email.metadata.strategyType && (
                          <>
                            <div className="text-muted-foreground">Strategy Type:</div>
                            <div>{email.metadata.strategyType}</div>
                            
                            {email.metadata.strategyName && (
                              <>
                                <div className="text-muted-foreground">Strategy:</div>
                                <div>{email.metadata.strategyName}</div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}