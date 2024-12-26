import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const CommandInterface = () => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication on component mount and set up auth state listener
  useEffect(() => {
    checkAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        handleAuthError();
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthError = () => {
    toast({
      title: "Authentication Required",
      description: "Please log in to continue",
      variant: "destructive",
    });
    navigate("/login");
  };

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (!session) {
        handleAuthError();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Auth error:", error);
      handleAuthError();
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      // Check auth before proceeding
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        handleAuthError();
        return;
      }

      const messageId = Date.now();

      const { error: messageError } = await supabase.from("messages").insert({
        user_id: user.id,
        sender_name: "User",
        text: message,
        message_id: messageId,
      });

      if (messageError) throw messageError;

      const { data, error } = await supabase.functions.invoke("process-message", {
        body: { 
          message,
          settings: {
            model: "claude-3-5-sonnet",
            temperature: 0.7,
            maxTokens: 500,
            streamResponse: true
          }
        },
      });

      if (error) throw error;

      if (data?.response) {
        const { error: botMessageError } = await supabase.from("messages").insert({
          user_id: user.id,
          sender_name: "Bot",
          text: data.response,
          message_id: messageId + 1,
        });

        if (botMessageError) throw botMessageError;
      }

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('auth')) {
        handleAuthError();
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-transparent rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Command Interface</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a command or message..."
            disabled={isLoading}
            className="bg-black/40 border-white/10 text-white placeholder:text-gray-400"
          />
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CommandInterface;