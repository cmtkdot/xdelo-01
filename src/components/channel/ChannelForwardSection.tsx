import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Channel {
  id: string;
  title: string;
  chat_id: number;
}

const ChannelForwardSection = () => {
  const [isForwarding, setForwarding] = useState(false);
  const [sourceChannel, setSourceChannel] = useState<string>("");
  const [destinationChannel, setDestinationChannel] = useState<string>("");

  const { data: channels, isError, error } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('title');
      
      if (error) {
        toast.error("Failed to load channels", {
          description: error.message
        });
        throw error;
      }
      return data as Channel[];
    },
  });

  const handleForward = async () => {
    if (!sourceChannel || !destinationChannel) {
      toast.error("Please select both source and destination channels");
      return;
    }

    if (sourceChannel === destinationChannel) {
      toast.error("Source and destination channels must be different");
      return;
    }

    const loadingToast = toast.loading("Forwarding messages...");
    
    try {
      setForwarding(true);
      
      const { data, error } = await supabase.functions.invoke('forward-channel-messages', {
        body: { 
          sourceChatId: parseInt(sourceChannel),
          destinationChatId: parseInt(destinationChannel)
        }
      });

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success("Messages forwarded successfully", {
        description: `Forwarded ${data.results.length} messages`
      });
      
    } catch (error) {
      console.error('Error forwarding messages:', error);
      toast.dismiss(loadingToast);
      toast.error("Failed to forward messages", {
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    } finally {
      setForwarding(false);
    }
  };

  if (isError) {
    return (
      <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-white">Channel Forward</CardTitle>
          <CardDescription className="text-red-500">
            Failed to load channels: {error instanceof Error ? error.message : "Unknown error"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-gray-800 dark:text-white">Channel Forward</CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Forward messages from one channel to another while storing media
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source Channel</Label>
            <Select
              value={sourceChannel}
              onValueChange={setSourceChannel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source channel" />
              </SelectTrigger>
              <SelectContent>
                {channels?.map((channel) => (
                  <SelectItem 
                    key={channel.id} 
                    value={channel.chat_id.toString()}
                  >
                    {channel.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Destination Channel</Label>
            <Select
              value={destinationChannel}
              onValueChange={setDestinationChannel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination channel" />
              </SelectTrigger>
              <SelectContent>
                {channels?.map((channel) => (
                  <SelectItem 
                    key={channel.id} 
                    value={channel.chat_id.toString()}
                  >
                    {channel.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleForward}
            disabled={isForwarding || !sourceChannel || !destinationChannel}
            className="w-full sm:w-auto justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isForwarding ? 'animate-spin' : ''}`} />
            {isForwarding ? "Forwarding Messages..." : "Forward Messages"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChannelForwardSection;