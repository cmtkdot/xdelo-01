import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const DatabaseChat = () => {
  const [iframeUrl, setIframeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const { toast } = useToast();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('media')
          .select('id')
          .limit(1);

        if (dbError) throw dbError;
        setConnectionStatus('success');
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setError("Please login to use the database chat");
          setIsLoading(false);
          return;
        }

        const { data: sessionData, error: functionError } = await supabase.functions.invoke('create-chatbot-session', {
          body: {
            name: session.user.email,
            email: session.user.email,
            chatbotId: "ffa05499087f66d554e38ff4fadf4972"
          }
        });

        if (functionError) {
          throw functionError;
        }

        if (!sessionData?.url) {
          throw new Error("Failed to get chat URL");
        }

        setIframeUrl(sessionData.url);
        toast({
          title: "Connection Successful",
          description: "Database chat is ready to use",
        });
      } catch (err) {
        console.error('Error:', err);
        setConnectionStatus('error');
        setError("Failed to initialize chat. Please try again later.");
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to the database chat service",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [toast]);

  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'checking':
        return (
          <Alert className="mb-4">
            <Database className="h-4 w-4" />
            <AlertDescription className="flex items-center ml-2">
              Checking database connection...
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            </AlertDescription>
          </Alert>
        );
      case 'success':
        return null; // Hide success message
      case 'error':
        return (
          <Alert className="mb-4 bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="ml-2 text-red-500">
              Failed to connect to database. Please check your configuration.
            </AlertDescription>
          </Alert>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px] text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="glass-card p-4">
        <h1 className="text-2xl font-bold mb-4 text-white">Database Chat</h1>
        {renderConnectionStatus()}
        <div className="relative rounded-lg overflow-hidden bg-black/20 backdrop-blur-sm">
          {connectionStatus === 'success' && iframeUrl && (
            <iframe
              className="w-full border-0"
              style={{ height: "600px" }}
              src={iframeUrl}
              allow="clipboard-write"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseChat;