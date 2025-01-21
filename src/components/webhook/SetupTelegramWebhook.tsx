import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SetupTelegramWebhook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-telegram-webhook');
      
      if (error) {
        console.error('Error setting up webhook:', error);
        toast({
          title: "Error",
          description: `Failed to setup webhook: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Webhook setup response:', data);
      toast({
        title: "Success",
        description: "Telegram webhook configured successfully",
      });
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSetup}
      disabled={isLoading}
      className="bg-[#0088cc] hover:bg-[#0088cc]/80 text-white"
    >
      {isLoading ? "Setting up..." : "Setup Telegram Webhook"}
    </Button>
  );
};

export default SetupTelegramWebhook;