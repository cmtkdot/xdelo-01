import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "./WebhookHeaderManager";
import { QueryParam } from "./WebhookQueryManager";
import { Json } from "@/integrations/supabase/types";

interface SavedConfiguration {
  id: string;
  name: string;
  method: string;
  headers: Header[];
  body_params: any[];
  query_params: QueryParam[];
}

interface WebhookConfigurationLoaderProps {
  webhookUrlId: string;
  onLoad: (config: {
    method: string;
    headers: Header[];
    body: string;
    params: QueryParam[];
  }) => void;
}

const WebhookConfigurationLoader = ({
  webhookUrlId,
  onLoad
}: WebhookConfigurationLoaderProps) => {
  const [configurations, setConfigurations] = useState<SavedConfiguration[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (webhookUrlId) {
      loadConfigurations();
    }
  }, [webhookUrlId]);

  const loadConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_configurations')
        .select('*')
        .eq('webhook_url_id', webhookUrlId);

      if (error) throw error;
      
      // Convert the database JSON to our frontend types
      const convertedData = (data || []).map(config => {
        const headers = Array.isArray(config.headers) 
          ? (config.headers as any[]).map(h => ({
              key: typeof h === 'object' && h !== null ? String(h.key || '') : '',
              value: typeof h === 'object' && h !== null ? String(h.value || '') : ''
            }))
          : [];

        const queryParams = Array.isArray(config.query_params)
          ? (config.query_params as any[]).map(p => ({
              key: typeof p === 'object' && p !== null ? String(p.key || '') : '',
              value: typeof p === 'object' && p !== null ? String(p.value || '') : ''
            }))
          : [];

        return {
          ...config,
          headers,
          body_params: Array.isArray(config.body_params) ? config.body_params : [],
          query_params: queryParams
        };
      });

      setConfigurations(convertedData);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast({
        title: "Error",
        description: "Failed to load saved configurations",
        variant: "destructive",
      });
    }
  };

  const handleSelect = (configId: string) => {
    const config = configurations.find(c => c.id === configId);
    if (config) {
      onLoad({
        method: config.method,
        headers: config.headers,
        body: JSON.stringify(config.body_params, null, 2),
        params: config.query_params
      });
      toast({
        title: "Success",
        description: "Configuration loaded successfully",
      });
    }
  };

  return (
    <Select onValueChange={handleSelect}>
      <SelectTrigger className="w-[300px] bg-white/5 border-white/10 text-white">
        <SelectValue placeholder="Load saved configuration" />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-white/10">
        {configurations.map((config) => (
          <SelectItem 
            key={config.id} 
            value={config.id}
            className="text-white hover:bg-white/5"
          >
            {config.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default WebhookConfigurationLoader;