import { Input } from "@/components/ui/input"
import { MediaTableActions } from "./MediaTableActions"
import { SyncChannelButton } from "./actions/SyncChannelButton"
import MediaTableFilters from "./MediaTableFilters"
import { Channel } from "../types"
import { useMediaOperations } from "../hooks/useMediaOperations"
import { Button } from "@/components/ui/button"
import { RefreshCw, RotateCw, Trash2 } from "lucide-react"

interface MediaTableToolbarProps {
  selectedChannels: string[];
  setSelectedChannels: (channels: string[]) => void;
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
  uploadStatus: string;
  setUploadStatus: (status: string) => void;
  channels: Channel[];
  onRefetch: () => void;
}

export function MediaTableToolbar({
  selectedChannels,
  setSelectedChannels,
  selectedTypes,
  setSelectedTypes,
  uploadStatus,
  setUploadStatus,
  channels,
  onRefetch
}: MediaTableToolbarProps) {
  const { 
    isDeletingDuplicates,
    isSyncingCaptions,
    handleDeleteDuplicates,
    handleSyncCaptions 
  } = useMediaOperations(onRefetch);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Filter media..."
            className="h-8 w-[150px] lg:w-[250px]"
          />
          <SyncChannelButton 
            channelIds={selectedChannels.map(id => parseInt(id)).filter(id => !isNaN(id))}
            onComplete={onRefetch}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncCaptions}
            disabled={isSyncingCaptions}
            className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingCaptions ? 'animate-spin' : ''}`} />
            Sync Captions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteDuplicates}
            disabled={isDeletingDuplicates}
            className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Duplicates
          </Button>
        </div>
      </div>
      <MediaTableFilters
        selectedChannel={selectedChannels[0] || "all"}
        setSelectedChannel={(value) => setSelectedChannels([value])}
        selectedType={selectedTypes[0] || "all"}
        setSelectedType={(value) => setSelectedTypes([value])}
        uploadStatus={uploadStatus}
        setUploadStatus={setUploadStatus}
        channels={channels}
      />
    </div>
  )
}