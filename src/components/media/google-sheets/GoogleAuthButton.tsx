import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { useToast } from "@/components/ui/use-toast";

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
].join(' ');

export const GoogleAuthButton = () => {
  const { toast } = useToast();

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        localStorage.setItem('google_access_token', response.access_token);
        console.log('Successfully obtained access token:', response.access_token);
        
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
    onError: (error) => {
      console.error('Google Login Error:', error);
      toast({
        title: "Error",
        description: "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      });
    },
    scope: GOOGLE_SCOPES,
  });

  return (
    <Button
      onClick={() => login()}
      className="w-full bg-primary text-white hover:bg-primary/90 transition-colors"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Connect Google Account
    </Button>
  );
};