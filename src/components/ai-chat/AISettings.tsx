import { Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface AISettings {
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
}

interface AISettingsProps {
  settings: AISettings;
  onSettingsChange: (settings: AISettings) => void;
}

export const AISettingsPanel = ({ settings, onSettingsChange }: AISettingsProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="glass-button">
          <Settings2 className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>AI Settings</SheetTitle>
          <SheetDescription>
            Configure how the AI processes your requests
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Temperature ({settings.temperature})</Label>
            <Slider
              value={[settings.temperature]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([value]) => 
                onSettingsChange({ ...settings, temperature: value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens ({settings.maxTokens})</Label>
            <Slider
              value={[settings.maxTokens]}
              min={100}
              max={2000}
              step={100}
              onValueChange={([value]) => 
                onSettingsChange({ ...settings, maxTokens: value })
              }
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.streamResponse}
              onCheckedChange={(checked) =>
                onSettingsChange({ ...settings, streamResponse: checked })
              }
            />
            <Label>Stream Response</Label>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};