import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MediaMigrationSection = () => {
  const [isMigrating, setMigrating] = useState(false);
  const [isResetting, setResetting] = useState(false);

  const handleMigration = async () => {
    try {
      setMigrating(true);
      const { data, error } = await supabase.functions.invoke('update-media-content-types', {
        body: { updatePublicUrls: true }
      });

      if (error) throw error;

      toast.success(data?.message || "Media files have been updated successfully");
    } catch (error) {
      console.error('Error during migration:', error);
      toast.error("Failed to update media files");
    } finally {
      setMigrating(false);
    }
  };

  const handleResetPublicUrls = async () => {
    try {
      setResetting(true);
      
      // First, reset all public_urls to null
      const { error: resetError } = await supabase
        .from('media')
        .update({ public_url: null })
        .neq('id', 'none'); // This will update all rows

      if (resetError) throw resetError;

      // Then trigger the migration to recreate them
      const { data, error } = await supabase.functions.invoke('update-media-content-types', {
        body: { updatePublicUrls: true }
      });

      if (error) throw error;

      toast.success("Public URLs have been reset and regenerated successfully");
    } catch (error) {
      console.error('Error resetting public URLs:', error);
      toast.error("Failed to reset public URLs");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-gray-800 dark:text-white">Media Management</CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Update media files content types and public URLs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Run migration to update content types and public URLs for all media files
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMigration}
              disabled={isMigrating || isResetting}
              className="w-full sm:w-auto justify-start gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <RefreshCw className="w-4 h-4" />
              {isMigrating ? "Updating Media Files..." : "Update Media Files"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPublicUrls}
              disabled={isMigrating || isResetting}
              className="w-full sm:w-auto justify-start gap-2 text-red-600 dark:text-red-400 bg-white dark:bg-transparent border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
              {isResetting ? "Resetting Public URLs..." : "Reset & Regenerate Public URLs"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaMigrationSection;