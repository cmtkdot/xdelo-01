import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MediaItem } from "../media/types";
import WebhookUrlManager from "./WebhookUrlManager";
import WebhookHistoryTable from "./WebhookHistoryTable";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import WebhookMethodSelector, { HttpMethod } from "./WebhookMethodSelector";
import WebhookDataFetcher from "./WebhookDataFetcher";
import WebhookRequestDetails from "./WebhookRequestDetails";

interface WebhookInterfaceProps {
  schedule?: "manual" | "hourly" | "daily" | "weekly";
  selectedMedia?: MediaItem[];
}

const WebhookInterface = ({ schedule = "manual", selectedMedia = [] }: WebhookInterfaceProps) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [webhookData, setWebhookData] = useState<any[]>([]);
  const [method, setMethod] = useState<HttpMethod>("POST");
  const { toast } = useToast();

  const fetchWebhookData = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter or select a webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('webhook-forwarder', {
        body: {
          webhook_url: webhookUrl,
          method: method,
          headers: {
            'Accept': 'application/json'
          }
        }
      });

      if (error) throw error;

      if (response.headers && Array.isArray(response.headers)) {
        setAvailableFields(response.headers);
      }

      if (response.data) {
        setWebhookData(Array.isArray(response.data) ? response.data : [response.data]);
      }

      toast({
        title: "Success",
        description: "Successfully fetched webhook data",
      });
    } catch (error) {
      console.error('Error fetching webhook data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch webhook data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

    if (selectedMedia.length === 0 && method !== "GET") {
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

      const { data: response, error } = await supabase.functions.invoke('webhook-forwarder', {
        body: {
          webhook_url: webhookUrl,
          method: method,
          data: method !== "GET" ? {
            data: filteredData,
            timestamp: new Date().toISOString(),
            total_records: filteredData.length,
            selected_fields: selectedFields
          } : undefined,
          headers: {
            'X-Source': 'Media Gallery',
            'X-Batch-Size': selectedMedia.length.toString()
          },
          params: {
            source: 'media_gallery',
            fields: selectedFields.join(',')
          }
        }
      });

      if (error) throw error;

      const { data: webhookUrlData } = await supabase
        .from('webhook_urls')
        .select('id')
        .eq('url', webhookUrl)
        .single();

      if (webhookUrlData) {
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
      
      <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure webhook method and fetch data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <WebhookMethodSelector method={method} onMethodChange={setMethod} />
            <WebhookDataFetcher
              isLoading={isLoading}
              webhookUrl={webhookUrl}
              method={method}
              webhookData={webhookData}
              availableFields={availableFields}
              onFetch={fetchWebhookData}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-2">
        <Label className="text-white">Select Fields to Send ({selectedMedia.length} items selected)</Label>
        <ScrollArea className="h-[200px] rounded-md border border-white/10 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {availableFields.map((field) => (
              <div key={field} className="flex items-center space-x-2">
                <Checkbox
                  id={field}
                  checked={selectedFields.includes(field)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedFields([...selectedFields, field]);
                    } else {
                      setSelectedFields(selectedFields.filter(f => f !== field));
                    }
                  }}
                  className="border-white/10"
                />
                <Label htmlFor={field} className="text-white">{field}</Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <WebhookRequestDetails
        method={method}
        selectedMedia={selectedMedia}
        selectedFields={selectedFields}
      />

      <Button 
        onClick={handleSendWebhook}
        disabled={isLoading || (method !== "GET" && selectedMedia.length === 0)}
        className="w-full bg-[#0088cc] hover:bg-[#0088cc]/80 text-white"
      >
        {schedule === "manual" ? `Send Selected Media (${selectedMedia.length})` : `Schedule ${schedule} updates`}
      </Button>

      <WebhookHistoryTable />
    </div>
  );
};

export default WebhookInterface;