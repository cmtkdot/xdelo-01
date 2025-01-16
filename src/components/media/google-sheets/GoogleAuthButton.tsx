import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { useToast } from "@/components/ui/use-toast";

export const GoogleAuthButton = () => {
  const { toast } = useToast();

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        // Store the access token
        localStorage.setItem('google_access_token', response.access_token);
        console.log('Successfully obtained access token');
        
        // Store the token expiration time (1 hour from now)
        const expirationTime = new Date().getTime() + 3600 * 1000;
        localStorage.setItem('google_token_expiry', expirationTime.toString());
        
        toast({
          title: "Success",
          description: "Successfully authenticated with Google",
        });

        // Reload the page to reinitialize components with the new token
        window.location.reload();
      } catch (error) {
        console.error('Error storing access token:', error);
        toast({
          title: "Error",
          description: "Failed to store access token",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      });
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  });

  return (
    <Button 
      onClick={() => login()} 
      className="flex items-center gap-2"
      variant="outline"
    >
      <LogIn className="h-4 w-4" />
      Continue with Google
    </Button>
  );
};