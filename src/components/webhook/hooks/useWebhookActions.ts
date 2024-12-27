import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MediaItem } from "../../media/types";
import { Header } from "../WebhookHeaderManager";
import { QueryParam } from "../WebhookQueryManager";
import { HttpMethod } from "../WebhookMethodSelector";

interface WebhookActionsProps {
  webhookUrl: string;
  method: HttpMethod;
  headers: Header[];
  params: QueryParam[];
  body: string;
  selectedFields: string[];
  selectedMedia: MediaItem[];
  schedule: string;
  setIsLoading: (loading: boolean) => void;
  setAvailableFields: (fields: string[]) => void;
  setWebhookData: (data: any[]) => void;
}

export const useWebhookActions = ({
  webhookUrl,
  method,
  headers,
  params,
  body,
  selectedFields,
  selectedMedia,
  schedule,
  setIsLoading,
  setAvailableFields,
  setWebhookData,
}: WebhookActionsProps) => {
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
          params: Object.fromEntries(params.map(p => [p.key, p.value])),
          body: method !== "GET" ? JSON.parse(body || "{}") : undefined
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

    if (selectedFields.length === 0 && method !== "GET") {
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

      let requestBody = method !== "GET" ? {
        data: filteredData,
        timestamp: new Date().toISOString(),
        total_records: filteredData.length,
        selected_fields: selectedFields,
        ...JSON.parse(body || "{}")
      } : undefined;

      const { data: response, error } = await supabase.functions.invoke('webhook-forwarder', {
        body: {
          webhook_url: webhookUrl,
          method: method,
          data: requestBody,
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

  return {
    fetchWebhookData,
    handleSendWebhook,
  };
};