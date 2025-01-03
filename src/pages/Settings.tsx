import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Trash2, MessageSquare, FileType, Link } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [isSyncingCaptions, setSyncingCaptions] = useState(false);
  const [isDeletingDuplicates, setDeletingDuplicates] = useState(false);
  const [isUpdatingContentTypes, setUpdatingContentTypes] = useState(false);
  const [isUpdatingPublicUrls, setUpdatingPublicUrls] = useState(false);

  const handleDeleteDuplicates = async () => {
    try {
      setDeletingDuplicates(true);
      const { error } = await supabase.functions.invoke('delete-duplicates', {
        body: { keepNewest: true }
      });

      if (error) throw error;

      toast.success("Duplicate media files have been cleaned up");
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      toast.error("Failed to delete duplicate media files");
    } finally {
      setDeletingDuplicates(false);
    }
  };

  const handleSyncCaptions = async () => {
    try {
      setSyncingCaptions(true);
      const { error } = await supabase.functions.invoke('sync-media-captions');

      if (error) throw error;

      toast.success("Media captions have been synchronized");
    } catch (error) {
      console.error('Error syncing captions:', error);
      toast.error("Failed to sync media captions");
    } finally {
      setSyncingCaptions(false);
    }
  };

  const handleUpdateContentTypes = async () => {
    try {
      setUpdatingContentTypes(true);
      const { error } = await supabase.functions.invoke('update-media-content-types');

      if (error) throw error;

      toast.success("Content types have been updated for all media files");
    } catch (error) {
      console.error('Error updating content types:', error);
      toast.error("Failed to update content types");
    } finally {
      setUpdatingContentTypes(false);
    }
  };

  const handleUpdatePublicUrls = async () => {
    try {
      setUpdatingPublicUrls(true);
      const { data, error } = await supabase.functions.invoke('update-media-public-urls');

      if (error) throw error;

      toast.success(data.message || "Public URLs have been updated for all media files");
    } catch (error) {
      console.error('Error updating public URLs:', error);
      toast.error("Failed to update public URLs");
    } finally {
      setUpdatingPublicUrls(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
        <CardHeader className="flex flex-row items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-purple-500" />
          <div>
            <CardTitle className="text-gray-800 dark:text-white">Settings</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">Manage your application settings</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">Appearance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Switch between light and dark themes
                  </div>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-200/50 dark:bg-white/10" />

          {/* Media Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">Media Management</h3>
            <div className="grid gap-4">
              <div className="flex flex-col space-y-2">
                <Label className="text-base">Duplicate Management</Label>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Find and remove duplicate media items from your library
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteDuplicates}
                  disabled={isDeletingDuplicates}
                  className="w-full sm:w-auto justify-start gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Duplicates
                </Button>
              </div>

              <div className="flex flex-col space-y-2">
                <Label className="text-base">Caption Management</Label>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Synchronize captions with your media content
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncCaptions}
                  disabled={isSyncingCaptions}
                  className="w-full sm:w-auto justify-start gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <MessageSquare className="w-4 h-4" />
                  Sync Captions
                </Button>
              </div>

              <div className="flex flex-col space-y-2">
                <Label className="text-base">Content Type Management</Label>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Update content types for proper media display in browsers
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateContentTypes}
                  disabled={isUpdatingContentTypes}
                  className="w-full sm:w-auto justify-start gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <FileType className="w-4 h-4" />
                  Update Content Types
                </Button>
              </div>

              <div className="flex flex-col space-y-2">
                <Label className="text-base">Public URL Management</Label>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Update public URLs for all media files
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdatePublicUrls}
                  disabled={isUpdatingPublicUrls}
                  className="w-full sm:w-auto justify-start gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <Link className="w-4 h-4" />
                  Update Public URLs
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;