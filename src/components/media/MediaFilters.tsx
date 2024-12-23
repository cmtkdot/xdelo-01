import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Channel } from "./types";

interface MediaFiltersProps {
  selectedChannel: string;
  setSelectedChannel: (value: string) => void;
  selectedType: string;
  setSelectedType: (value: string) => void;
  channels?: Channel[];
}

const MediaFilters = ({
  selectedChannel,
  setSelectedChannel,
  selectedType,
  setSelectedType,
  channels = [],
}: MediaFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Select value={selectedChannel} onValueChange={setSelectedChannel}>
        <SelectTrigger className="w-full sm:w-[200px] glass-input">
          <SelectValue placeholder="Select Channel" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900/90 backdrop-blur-xl border-white/10">
          <SelectItem value="all" className="text-white hover:bg-white/5">All Channels</SelectItem>
          {channels.map((channel) => (
            <SelectItem 
              key={channel.chat_id} 
              value={channel.chat_id.toString()}
              className="text-white hover:bg-white/5"
            >
              {channel.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedType} onValueChange={setSelectedType}>
        <SelectTrigger className="w-full sm:w-[200px] glass-input">
          <SelectValue placeholder="Select Media Type" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900/90 backdrop-blur-xl border-white/10">
          <SelectItem value="all" className="text-white hover:bg-white/5">All Types</SelectItem>
          <SelectItem value="photo" className="text-white hover:bg-white/5">Photos</SelectItem>
          <SelectItem value="video" className="text-white hover:bg-white/5">Videos</SelectItem>
          <SelectItem value="animation" className="text-white hover:bg-white/5">Animations</SelectItem>
          <SelectItem value="edited_channel_post" className="text-white hover:bg-white/5">Edited Channel Posts</SelectItem>
          <SelectItem value="channel_post" className="text-white hover:bg-white/5">Channel Posts</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default MediaFilters;