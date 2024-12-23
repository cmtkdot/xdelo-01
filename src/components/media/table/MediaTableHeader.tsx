import { useGoogleLogin } from '@react-oauth/google';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const MediaTableHeader = () => {
  const { toast } = useToast();

  const migrateToGoogleDrive = async (accessToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('migrate-to-drive', {
        body: { accessToken }
      });

      if (error) throw error;

      toast({
        title: "Migration Complete",
        description: data.message,
      });

      // Refresh the page to show updated data
      window.location.reload();

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
      await migrateToGoogleDrive(response.access_token);
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold text-white">Media Files</h2>
      <Button
        onClick={() => login()}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
      >
        <Upload className="w-4 h-4" />
        Migrate All to Google Drive
      </Button>
    </div>
  );
};