import { Input } from "@/components/ui/input"
import { MediaTableActions } from "./MediaTableActions"
import { SyncChannelButton } from "./actions/SyncChannelButton"
import MediaTableFilters from "../MediaTableFilters"
import { Channel } from "../types"

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
        </div>
        <MediaTableActions />
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