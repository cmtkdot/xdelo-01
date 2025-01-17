import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { checkAuth } from "@/lib/auth";

const CommandInterface = () => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkInitialAuth = async () => {
      const { isAuthenticated, error } = await checkAuth();
      if (!isAuthenticated) {
        handleAuthError();
      }
    };

    checkInitialAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, "Session:", session ? "exists" : "null");
      
      if (event === 'SIGNED_OUT' || !session) {
        handleAuthError();
      } else if (event === 'TOKEN_REFRESHED') {
        const { isAuthenticated, error } = await checkAuth();
        if (!isAuthenticated) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const { isAuthenticated, user } = await checkAuth();
      if (!isAuthenticated || !user) {
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Command Interface</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
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