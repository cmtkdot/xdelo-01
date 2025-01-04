import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Channel } from "../media/types";
import { RefreshCw } from "lucide-react";

const MediaMigrationSection = () => {
  const [isMigrating, setMigrating] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  const { data: channels, isError: isChannelsError } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*');
      
      if (error) {
        toast.error("Failed to load channels", {
          description: error.message
        });
        throw error;
      }
      return data as Channel[];
    }
  });

  const handleMigration = async () => {
    const loadingToast = toast.loading("Starting media migration...");
    
    try {
      setMigrating(true);
      const { data, error } = await supabase.functions.invoke('migrate-media-files', {
        body: { 
          channelId: selectedChannel === "all" ? null : selectedChannel
        }
      });

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success("Media migration completed", {
        description: `Successfully migrated media files${selectedChannel !== "all" ? " for selected channel" : ""}`
      });
    } catch (error) {
      console.error('Error during migration:', error);
      toast.dismiss(loadingToast);
      toast.error("Migration failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    } finally {
      setMigrating(false);
    }
  };

  if (isChannelsError) {
    return (
      <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-white">Media Migration</CardTitle>
          <CardDescription className="text-red-500">
            Failed to load channels. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-gray-800 dark:text-white">Media Migration</CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Migrate existing media files to new storage buckets based on their content type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">Select Channel</label>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels?.map((channel) => (
                <SelectItem key={channel.chat_id} value={channel.chat_id.toString()}>
                  {channel.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            This will move media files from the telegram-media bucket to telegram-pictures or telegram-video based on their content type
          </div>
          <Button
            variant="outline"
            onClick={handleMigration}
            disabled={isMigrating}
            className="w-full sm:w-auto justify-start gap-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
            {isMigrating ? "Migrating Media Files..." : "Start Migration"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaMigrationSection;