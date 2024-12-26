import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MediaItem } from "../media/types";
import WebhookUrlManager from "./WebhookUrlManager";
import WebhookHistoryTable from "./WebhookHistoryTable";
import { supabase } from "@/integrations/supabase/client";
import { HttpMethod } from "./WebhookMethodSelector";
import WebhookRequestDetails from "./WebhookRequestDetails";
import { Header } from "./WebhookHeaderManager";
import { QueryParam } from "./WebhookQueryManager";
import WebhookScheduleSelector from "./WebhookScheduleSelector";
import WebhookFieldSelector from "./WebhookFieldSelector";
import WebhookConfigurationPanel from "./WebhookConfigurationPanel";

interface WebhookInterfaceProps {
  schedule?: "manual" | "hourly" | "daily" | "weekly";
  selectedMedia?: MediaItem[];
}

const WebhookInterface = ({ 
  schedule: initialSchedule = "manual", 
  selectedMedia = [] 
}: WebhookInterfaceProps) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [webhookData, setWebhookData] = useState<any[]>([]);
  const [method, setMethod] = useState<HttpMethod>("POST");
  const [headers, setHeaders] = useState<Header[]>([]);
  const [params, setParams] = useState<QueryParam[]>([]);
  const [schedule, setSchedule] = useState(initialSchedule);
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
          headers: Object.fromEntries(headers.map(h => [h.key, h.value])),
          params: Object.fromEntries(params.map(p => [p.key, p.value]))
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
          headers: Object.fromEntries(headers.map(h => [h.key, h.value])),
          params: Object.fromEntries(params.map(p => [p.key, p.value]))
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
      
      <WebhookScheduleSelector 
        schedule={schedule}
        onScheduleChange={setSchedule}
      />

      <WebhookConfigurationPanel
        method={method}
        onMethodChange={setMethod}
        isLoading={isLoading}
        webhookUrl={webhookUrl}
        webhookData={webhookData}
        availableFields={availableFields}
        onFetch={fetchWebhookData}
        headers={headers}
        onHeadersChange={setHeaders}
        params={params}
        onParamsChange={setParams}
      />
      
      <WebhookFieldSelector
        availableFields={availableFields}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
        selectedMediaCount={selectedMedia.length}
      />

      <WebhookRequestDetails
        method={method}
        selectedMedia={selectedMedia}
        selectedFields={selectedFields}
        headers={headers}
        params={params}
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