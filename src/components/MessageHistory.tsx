import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { ExternalLink } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender_name: string;
  created_at: string;
  media_url?: string;
  media_type?: string;
  public_url?: string;
}

const MessageHistory = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, payload => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }
    
    setMessages(data || []);
  };

  const renderMediaPreview = (message: Message) => {
    // Prioritize public_url over media_url
    const displayUrl = message.public_url || message.media_url;
    if (!displayUrl) return null;

    if (message.media_type?.includes('video') || message.media_type?.includes('animation')) {
      return (
        <video
          src={displayUrl}
          controls
          className="max-w-full h-32 object-cover rounded mt-2"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    if (message.media_type?.includes('photo')) {
      return (
        <img
          src={displayUrl}
          alt="Message attachment"
          className="max-w-full h-32 object-cover rounded mt-2"
        />
      );
    }

    return null;
  };

  return (
    <div className="bg-transparent rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Message History</h2>
      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.sender_name === "Bot"
                  ? "bg-[#0088cc] text-white ml-4"
                  : "bg-white/5 border border-white/10 text-white mr-4"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium">{message.sender_name}</span>
                <span className="text-xs opacity-70">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm">{message.text}</p>
              {(message.public_url || message.media_url) && (
                <div className="mt-2">
                  {renderMediaPreview(message)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs hover:bg-white/10"
                    onClick={() => window.open(message.public_url || message.media_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View Media
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageHistory;