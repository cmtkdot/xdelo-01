import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Channel } from "./types";

interface MediaFiltersProps {
  selectedChannel: string;
  setSelectedChannel: (value: string) => void;
  selectedType: string;
  setSelectedType: (value: string) => void;
  uploadStatus: string;
  setUploadStatus: (value: string) => void;
  channels?: Channel[];
}

const MediaFilters = ({
  selectedChannel,
  setSelectedChannel,
  selectedType,
  setSelectedType,
  uploadStatus,
  setUploadStatus,
  channels = [],
}: MediaFiltersProps) => {
  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
      <Select value={selectedChannel} onValueChange={setSelectedChannel}>
        <SelectTrigger className="w-full md:w-[180px] bg-[#1A1F2C] border-white/10 text-white/90 font-medium hover:bg-[#222632] focus:ring-purple-500/50">
          <SelectValue placeholder="Select Channel" />
        </SelectTrigger>
        <SelectContent className="bg-[#1A1F2C] border-white/10">
          <SelectItem value="all" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            All Channels
          </SelectItem>
          {channels.map((channel) => (
            <SelectItem 
              key={channel.chat_id} 
              value={channel.chat_id.toString()}
              className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]"
            >
              {channel.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedType} onValueChange={setSelectedType}>
        <SelectTrigger className="w-full md:w-[180px] bg-[#1A1F2C] border-white/10 text-white/90 font-medium hover:bg-[#222632] focus:ring-purple-500/50">
          <SelectValue placeholder="Select Media Type" />
        </SelectTrigger>
        <SelectContent className="bg-[#1A1F2C] border-white/10">
          <SelectItem value="all" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            All Types
          </SelectItem>
          <SelectItem value="photo" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            Photos
          </SelectItem>
          <SelectItem value="video" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            Videos
          </SelectItem>
          <SelectItem value="animation" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            Animations
          </SelectItem>
          <SelectItem value="edited_channel_post" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            Edited Posts
          </SelectItem>
          <SelectItem value="channel_post" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            Channel Posts
          </SelectItem>
        </SelectContent>
      </Select>

      <Select value={uploadStatus} onValueChange={setUploadStatus}>
        <SelectTrigger className="w-full md:w-[180px] bg-[#1A1F2C] border-white/10 text-white/90 font-medium hover:bg-[#222632] focus:ring-purple-500/50">
          <SelectValue placeholder="Upload Status" />
        </SelectTrigger>
        <SelectContent className="bg-[#1A1F2C] border-white/10">
          <SelectItem value="all" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            All Files
          </SelectItem>
          <SelectItem value="not_uploaded" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            Not Uploaded
          </SelectItem>
          <SelectItem value="uploaded" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
            Uploaded
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default MediaFilters;