import { useGoogleLogin } from '@react-oauth/google';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const MediaTableHeader = () => {
  const { toast } = useToast();

  const migrateToGoogleDrive = async (accessToken: string) => {
    try {
      console.log('Starting migration with access token:', accessToken);
      
      const { data, error } = await supabase.functions.invoke('migrate-to-drive', {
        body: { accessToken }
      });

      if (error) throw error;

      toast({
        title: "Migration Started",
        description: "Files are being migrated to Google Drive. This may take a few minutes.",
      });

      // Refresh the page to show updated data after a short delay
      setTimeout(() => window.location.reload(), 5000);

    } catch (error) {
      console.error('Error during migration:', error);
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description: "Failed to migrate files to Google Drive. Please try again.",
      });
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      console.log('Google OAuth success:', response);
      await migrateToGoogleDrive(response.access_token);
    },
    onError: (error) => {
      console.error('Google OAuth error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Failed to authenticate with Google. Please try again.",
      });
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold text-white">Media Files</h2>
      <Button
        onClick={() => login()}
        className="glass-button flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <CloudUpload className="w-5 h-5" />
        Migrate All to Google Drive
      </Button>
    </div>
  );
};