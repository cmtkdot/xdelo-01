import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LogoutButtonProps {
  className?: string;
}

const LogoutButton = ({ className }: LogoutButtonProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If no session, just redirect to login
        navigate("/login");
        return;
      }

      // Attempt to sign out
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        if (error.message.includes('session_not_found') || error.status === 403) {
          // Session is already invalid, just redirect
          console.log('Session already invalid, redirecting to login');
          navigate("/login");
          return;
        }
        
        // Handle other errors
        console.error('Logout error:', error);
        toast({
          title: "Error",
          description: "Failed to logout. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Successful logout
      toast({
        title: "Success",
        description: "You have been logged out successfully",
      });
      navigate("/login");
    } catch (error) {
      console.error('Unexpected error during logout:', error);
      // Force redirect to login in case of unexpected errors
      navigate("/login");
    }
  };

  return (
    <Button 
      onClick={handleLogout}
      variant="ghost" 
      className={cn(
        "text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors",
        className
      )}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
};

export default LogoutButton;