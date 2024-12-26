import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const DatabaseChat = () => {
  const [iframeUrl, setIframeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setError("Please login to use the database chat");
          setIsLoading(false);
          return;
        }

        const { data, error: functionError } = await supabase.functions.invoke('create-chatbot-session', {
          body: {
            name: session.user.email,
            email: session.user.email
          }
        });

        if (functionError) throw functionError;
        if (!data?.url) throw new Error("Failed to get chat URL");

        setIframeUrl(data.url);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError("Failed to initialize chat. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, []);

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
        <div className="relative rounded-lg overflow-hidden bg-black/20 backdrop-blur-sm">
          {iframeUrl && (
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