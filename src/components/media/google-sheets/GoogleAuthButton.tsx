import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import { useToast } from "@/components/ui/use-toast";

export const GoogleAuthButton = () => {
  const { toast } = useToast();

  const handleSuccess = async (response: any) => {
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
  };

  const handleError = () => {
    toast({
      title: "Error",
      description: "Failed to authenticate with Google. Please try again.",
      variant: "destructive",
    });
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      useOneTap
      type="standard"
      theme="filled_black"
      size="large"
      text="continue_with"
      shape="rectangular"
      width="300"
    />
  );
};