import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { useToast } from "@/components/ui/use-toast";
import { storeGoogleAuth } from "../utils/googleSheets/authHandler";

export const GoogleAuthButton = () => {
  const { toast } = useToast();

  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    onSuccess: async (codeResponse) => {
      try {
        console.log('Google login successful, exchanging code for tokens...');
        
        // Exchange code for tokens
        const tokens = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code: codeResponse.code,
            client_id: process.env.VITE_GOOGLE_CLIENT_ID!,
            redirect_uri: window.location.origin,
            grant_type: 'authorization_code',
            access_type: 'offline',
            prompt: 'consent',
          }),
        }).then(r => r.json());

        if (tokens.error) {
          throw new Error(tokens.error_description || 'Failed to exchange code for tokens');
        }

        console.log('Tokens received successfully, storing...');
        
        // Store the tokens
        storeGoogleAuth(tokens);
        
        toast({
          title: "Success",
          description: "Successfully authenticated with Google",
        });

        // Reload the page to reinitialize components with the new token
        window.location.reload();
      } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to complete authentication",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      console.error('Google login failed');
      toast({
        title: "Error",
        description: "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      });
    }
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