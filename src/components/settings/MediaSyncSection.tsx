import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import ChannelSelector from "./sync/ChannelSelector";
import { useSyncChannels } from "./sync/useSyncChannels";

const MediaSyncSection = () => {
  const {
    channels,
    isChannelsError,
    channelsError,
    selectedChannels,
    isSyncing,
    toggleChannel,
    toggleAll,
    handleSync
  } = useSyncChannels();

  if (isChannelsError) {
    return (
      <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-white">Media Sync</CardTitle>
          <CardDescription className="text-red-500">
            Failed to load channels: {channelsError instanceof Error ? channelsError.message : "Unknown error"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-gray-800 dark:text-white">Media Sync</CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Sync and organize media from selected Telegram channels into content-specific buckets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <ChannelSelector
            channels={channels}
            selectedChannels={selectedChannels}
            onToggleChannel={toggleChannel}
            onToggleAll={toggleAll}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || selectedChannels.size === 0}
            className="w-full sm:w-auto justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? "Syncing Media..." : "Sync Media"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaSyncSection;