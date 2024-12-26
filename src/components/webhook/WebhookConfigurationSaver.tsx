import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "./WebhookHeaderManager";
import { QueryParam } from "./WebhookQueryManager";
import { Json } from "@/integrations/supabase/types";

interface WebhookConfigurationSaverProps {
  webhookUrlId: string;
  method: string;
  headers: Header[];
  params: QueryParam[];
  body: string;
}

const WebhookConfigurationSaver = ({
  webhookUrlId,
  method,
  headers,
  params,
  body
}: WebhookConfigurationSaverProps) => {
  const [configName, setConfigName] = useState("");
  const { toast } = useToast();

  const handleSave = async () => {
    if (!configName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a configuration name",
        variant: "destructive",
      });
      return;
    }

    if (!webhookUrlId) {
      toast({
        title: "Error",
        description: "No webhook URL selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      let parsedBody: Json;
      try {
        parsedBody = JSON.parse(body || "[]");
      } catch {
        parsedBody = [];
      }

      const { error } = await supabase
        .from('webhook_configurations')
        .insert({
          webhook_url_id: webhookUrlId,
          name: configName,
          method: method,
          headers: headers as Json,
          body_params: parsedBody,
          query_params: params as Json,
          user_id: userId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Configuration saved successfully",
      });
      setConfigName("");
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Configuration name"
        value={configName}
        onChange={(e) => setConfigName(e.target.value)}
        className="flex-1 bg-white/5 border-white/10 text-white"
      />
      <Button
        variant="outline"
        onClick={handleSave}
        className="border-white/10 hover:bg-white/5"
      >
        <Save className="w-4 h-4 mr-2" />
        Save Configuration
      </Button>
    </div>
  );
};

export default WebhookConfigurationSaver;