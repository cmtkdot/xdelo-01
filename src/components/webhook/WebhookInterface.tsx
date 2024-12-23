import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MediaItem } from "../media/types";
import WebhookUrlManager from "./WebhookUrlManager";
import WebhookHistoryTable from "./WebhookHistoryTable";
import { supabase } from "@/integrations/supabase/client";

interface WebhookInterfaceProps {
  schedule?: "manual" | "hourly" | "daily" | "weekly";
  selectedMedia?: MediaItem[];
}

const WebhookInterface = ({ schedule = "manual", selectedMedia = [] }: WebhookInterfaceProps) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const { toast } = useToast();

  const availableFields = [
    { id: "file_url", label: "File URL" },
    { id: "media_type", label: "Media Type" },
    { id: "caption", label: "Caption" },
    { id: "metadata", label: "Metadata" },
    { id: "created_at", label: "Created Date" }
  ];

  const handleSendWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter or select a webhook URL",
        variant: "destructive",
      });
      return;
    }

    if (selectedFields.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one field to send",
        variant: "destructive",
      });
      return;
    }

    if (selectedMedia.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one media item to send",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const filteredData = selectedMedia.map(item => {
        const filtered: Record<string, any> = {};
        selectedFields.forEach(field => {
          filtered[field] = item[field as keyof MediaItem];
        });
        return filtered;
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          data: filteredData,
          timestamp: new Date().toISOString(),
          total_records: filteredData.length
        }),
      });

      // Get the webhook URL record ID
      const { data: webhookUrlData } = await supabase
        .from('webhook_urls')
        .select('id')
        .eq('url', webhookUrl)
        .single();

      if (webhookUrlData) {
        // Store webhook history
        const { error: historyError } = await supabase
          .from('webhook_history')
          .insert([{
            webhook_url_id: webhookUrlData.id,
            fields_sent: selectedFields,
            schedule_type: schedule,
            status: 'success',
            media_count: selectedMedia.length
          }]);

        if (historyError) throw historyError;
      }

      toast({
        title: "Success",
        description: schedule === "manual" 
          ? "Data sent to webhook successfully" 
          : `Webhook scheduled successfully (${schedule})`,
      });
    } catch (error) {
      console.error('Error sending webhook:', error);
      toast({
        title: "Error",
        description: "Failed to send data to webhook",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <WebhookUrlManager onUrlSelect={setWebhookUrl} />
      
      <div className="space-y-2">
        <Label className="text-white">Select Fields to Send ({selectedMedia.length} items selected)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {availableFields.map((field) => (
            <div key={field.id} className="flex items-center space-x-2">
              <Checkbox
                id={field.id}
                checked={selectedFields.includes(field.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFields([...selectedFields, field.id]);
                  } else {
                    setSelectedFields(selectedFields.filter(f => f !== field.id));
                  }
                }}
                className="border-white/10"
              />
              <Label htmlFor={field.id} className="text-white">{field.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <Button 
        onClick={handleSendWebhook}
        disabled={isLoading || selectedMedia.length === 0}
        className="w-full bg-[#0088cc] hover:bg-[#0088cc]/80 text-white"
      >
        {schedule === "manual" ? `Send Selected Media (${selectedMedia.length})` : `Schedule ${schedule} updates`}
      </Button>

      <WebhookHistoryTable />
    </div>
  );
};

export default WebhookInterface;