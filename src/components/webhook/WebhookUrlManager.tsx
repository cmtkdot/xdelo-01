import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Send, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WebhookUrl {
  id: string;
  name: string;
  url: string;
}

interface WebhookUrlManagerProps {
  onUrlSelect: (url: string) => void;
}

const WebhookUrlManager = ({ onUrlSelect }: WebhookUrlManagerProps) => {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const { toast } = useToast();

  const { data: webhookUrls = [], refetch } = useQuery({
    queryKey: ['webhook-urls'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('webhook_urls')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching webhook URLs:', error);
          throw error;
        }

        return (data || []) as WebhookUrl[];
      } catch (error) {
        console.error('Error in webhook URLs query:', error);
        return [];
      }
    },
  });

  const handleAddNew = async () => {
    if (!newName.trim() || !newUrl.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both name and URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add webhook URLs",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('webhook_urls')
        .insert([{ 
          name: newName, 
          url: newUrl,
          user_id: user.id 
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Webhook URL added successfully",
      });

      setNewName("");
      setNewUrl("");
      setShowAddNew(false);
      refetch();
    } catch (error) {
      console.error('Error adding webhook URL:', error);
      toast({
        title: "Error",
        description: "Failed to add webhook URL",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select onValueChange={onUrlSelect}>
          <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Select a webhook URL" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/10">
            {webhookUrls.map((webhook) => (
              <SelectItem 
                key={webhook.id} 
                value={webhook.url}
                className="text-white hover:bg-white/5"
              >
                {webhook.name} - {webhook.url}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="ml-2 border-white/10 hover:bg-white/5"
          onClick={() => setShowAddNew(!showAddNew)}
        >
          {showAddNew ? <X /> : <Plus />}
        </Button>
      </div>

      {showAddNew && (
        <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm">
          <Input
            placeholder="Webhook Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
          <Input
            placeholder="Webhook URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
          <Button
            onClick={handleAddNew}
            className="w-full bg-[#0088cc] hover:bg-[#0088cc]/80 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            Add Webhook URL
          </Button>
        </div>
      )}
    </div>
  );
};

export default WebhookUrlManager;