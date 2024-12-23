import { Bot, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AISettingsPanel, AISettings } from "./AISettings";

interface ChatHeaderProps {
  settings: AISettings;
  onSettingsChange: (settings: AISettings) => void;
  showWebhookConfig: boolean;
  onToggleWebhookConfig: () => void;
}

export const ChatHeader = ({
  settings,
  onSettingsChange,
  showWebhookConfig,
  onToggleWebhookConfig,
}: ChatHeaderProps) => {
  return (
    <div className="p-4 border-b border-white/10 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Assistant</h1>
        <p className="text-white/60 text-sm mt-1">
          Chat with an AI that understands your data, executes SQL queries, and triggers webhooks
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 hover:bg-white/5"
          onClick={onToggleWebhookConfig}
        >
          <Webhook className="w-4 h-4 mr-2" />
          Webhooks
        </Button>
        <AISettingsPanel settings={settings} onSettingsChange={onSettingsChange} />
      </div>
    </div>
  );
};