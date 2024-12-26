import { useState, useEffect } from "react";
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
import { Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [method, setMethod] = useState<"GET" | "POST">("POST");
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
          method: "GET",
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

      const { data: response, error } = await supabase.functions.invoke('webhook-forwarder', {
        body: {
          webhook_url: webhookUrl,
          method: "POST",
          data: {
            data: filteredData,
            timestamp: new Date().toISOString(),
            total_records: filteredData.length,
            selected_fields: selectedFields
          },
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
            <Select
              value={method}
              onValueChange={(value: "GET" | "POST") => setMethod(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={fetchWebhookData}
              disabled={isLoading || !webhookUrl}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Fetch Data
            </Button>
          </div>

          {webhookData.length > 0 && (
            <Alert>
              <AlertDescription>
                Retrieved {webhookData.length} records with {availableFields.length} fields
              </AlertDescription>
            </Alert>
          )}
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

      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-white">Request Details</h4>
            <p className="text-xs text-white/70">
              Method: {method}
            </p>
            <p className="text-xs text-white/70">
              Headers: X-Source: Media Gallery, X-Batch-Size: {selectedMedia.length}
            </p>
            <p className="text-xs text-white/70">
              Query Parameters: source=media_gallery, fields={selectedFields.join(',')}
            </p>
          </div>
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