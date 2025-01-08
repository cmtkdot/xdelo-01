import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Channel } from '@/components/media/types';

interface ChannelSelectorProps {
  channels?: Channel[];
  selectedChannels: Set<number>;
  onToggleChannel: (chatId: number) => void;
  onToggleAll: () => void;
}

const ChannelSelector = ({
  channels,
  selectedChannels,
  onToggleChannel,
  onToggleAll
}: ChannelSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="select-all"
          checked={channels?.length === selectedChannels.size}
          onCheckedChange={onToggleAll}
        />
        <Label 
          htmlFor="select-all"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Select All Channels
        </Label>
      </div>
      
      <ScrollArea className="h-[200px] rounded-md border p-4">
        <div className="space-y-4">
          {channels?.map((channel) => (
            <div key={channel.id} className="flex items-center space-x-2">
              <Checkbox
                id={channel.id}
                checked={selectedChannels.has(channel.chat_id)}
                onCheckedChange={() => onToggleChannel(channel.chat_id)}
              />
              <Label
                htmlFor={channel.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {channel.title}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChannelSelector;