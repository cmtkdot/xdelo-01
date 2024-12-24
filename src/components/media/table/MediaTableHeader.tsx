import { useGoogleLogin } from '@react-oauth/google';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "../types";

interface MediaTableHeaderProps {
  selectedMedia: MediaItem[];
}

export const MediaTableHeader = ({ selectedMedia }: MediaTableHeaderProps) => {
  const { toast } = useToast();

  const migrateToGoogleDrive = async (accessToken: string) => {
    try {
      console.log('Starting migration with access token:', accessToken);
      
      const selectedIds = selectedMedia.map(item => item.id);
      
      const { data, error } = await supabase.functions.invoke('migrate-to-drive', {
        body: { 
          accessToken,
          selectedIds
        }
      });

      if (error) throw error;

      toast({
        title: "Migration Started",
        description: `Started migrating ${selectedMedia.length} files to Google Drive. This may take a few minutes.`,
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
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-white">Media Files</h2>
        {selectedMedia.length > 0 && (
          <p className="text-sm text-white/60">
            {selectedMedia.length} file{selectedMedia.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
      <Button
        onClick={() => login()}
        disabled={selectedMedia.length === 0}
        className="glass-button flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        <CloudUpload className="w-5 h-5" />
        {selectedMedia.length > 0 
          ? `Migrate ${selectedMedia.length} Selected to Google Drive`
          : 'Select files to migrate'}
      </Button>
    </div>
  );
};