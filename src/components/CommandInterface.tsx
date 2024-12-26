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

  useEffect(() => {
    const checkInitialAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        handleAuthError();
      }
    };

    checkInitialAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, "Session:", session ? "exists" : "null");
      
      if (event === 'SIGNED_OUT' || !session) {
        handleAuthError();
      } else if (event === 'TOKEN_REFRESHED') {
        // Validate the refreshed session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error || !currentSession) {
          console.error("Session validation failed after token refresh:", error);
          handleAuthError();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthError = () => {
    console.log("Handling auth error, redirecting to login");
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
      
      if (error) {
        console.error("Auth check error:", error);
        throw error;
      }
      
      if (!session) {
        console.log("No session found during auth check");
        handleAuthError();
        return false;
      }
      
      // Verify the session is still valid
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User verification failed:", userError);
        throw userError || new Error("User not found");
      }
      
      return true;
    } catch (error) {
      console.error("Auth check failed:", error);
      handleAuthError();
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("User fetch error:", userError);
        throw userError;
      }

      if (!user) {
        console.log("No user found during message submission");
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
      
      if (error instanceof Error && 
          (error.message.includes('auth') || 
           error.message.includes('token') || 
           error.message.includes('session'))) {
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