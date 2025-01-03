import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MediaMigrationSection = () => {
  const [isMigrating, setMigrating] = useState(false);

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleMigration}
            disabled={isMigrating}
            className="w-full sm:w-auto justify-start gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4" />
            {isMigrating ? "Updating Media Files..." : "Update Media Files"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaMigrationSection;