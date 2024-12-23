import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AiChat = () => {
  const [iframeUrl, setIframeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initializeChatbot = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase.functions.invoke('create-chatbot-session', {
          body: { user },
        });

        if (error) throw error;
        
        setIframeUrl(data.url);
      } catch (error) {
        console.error('Error initializing chatbot:', error);
        toast({
          title: "Error",
          description: "Failed to initialize chat. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeChatbot();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="glass-card min-h-[700px] flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-2xl font-semibold text-white">AI Assistant</h1>
          <p className="text-white/60 text-sm mt-1">
            Chat with an AI that understands your Telegram data
          </p>
        </div>
        
        {iframeUrl ? (
          <div className="flex-1 relative">
            <iframe
              src={iframeUrl}
              className="absolute inset-0 w-full h-full rounded-b-lg"
              style={{ minHeight: "600px" }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/60">Failed to load chat interface</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiChat;