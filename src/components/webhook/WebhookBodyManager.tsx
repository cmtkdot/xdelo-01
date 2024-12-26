import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Info } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BodyParam {
  key: string;
  value: string;
}

interface WebhookBodyManagerProps {
  body: string;
  onBodyChange: (body: string) => void;
}

const GLIDE_API_SUGGESTIONS = [
  { key: "appID", value: "" },
  { key: "queries", value: "" },
  { key: "data", value: "[]" },
];

const WebhookBodyManager = ({ body, onBodyChange }: WebhookBodyManagerProps) => {
  const [isValidJson, setIsValidJson] = useState(true);
  const [bodyParams, setBodyParams] = useState<BodyParam[]>(() => {
    try {
      const parsed = JSON.parse(body || "{}");
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value)
      }));
    } catch {
      return [];
    }
  });

  const [newParamKey, setNewParamKey] = useState("");
  const [newParamValue, setNewParamValue] = useState("");

  const updateBody = (params: BodyParam[]) => {
    try {
      const bodyObject = params.reduce((acc, param) => {
        try {
          acc[param.key] = JSON.parse(param.value);
        } catch {
          acc[param.key] = param.value;
        }
        return acc;
      }, {} as Record<string, any>);

      const formatted = JSON.stringify(bodyObject, null, 2);
      onBodyChange(formatted);
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  };

  const addParam = () => {
    if (newParamKey.trim() && newParamValue.trim()) {
      const newParams = [...bodyParams, { key: newParamKey, value: newParamValue }];
      setBodyParams(newParams);
      updateBody(newParams);
      setNewParamKey("");
      setNewParamValue("");
    }
  };

  const addSuggestedParam = (suggestion: BodyParam) => {
    if (!bodyParams.some(param => param.key === suggestion.key)) {
      const newParams = [...bodyParams, suggestion];
      setBodyParams(newParams);
      updateBody(newParams);
    }
  };

  const removeParam = (index: number) => {
    const newParams = bodyParams.filter((_, i) => i !== index);
    setBodyParams(newParams);
    updateBody(newParams);
  };

  const handleParamChange = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...bodyParams];
    newParams[index][field] = value;
    setBodyParams(newParams);
    updateBody(newParams);
  };

  return (
    <div className="space-y-4">
      <Label>Request Body (JSON)</Label>
      
      <Alert className="bg-blue-500/10 border-blue-500/20">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm text-blue-100">
          For Glide API integration, make sure to include appID and queries in the request body.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Suggested Glide API Parameters</Label>
        <ScrollArea className="h-[100px] rounded-md border border-white/10 p-2">
          <div className="space-y-2">
            {GLIDE_API_SUGGESTIONS.map((suggestion) => (
              <div key={suggestion.key} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground flex-1">{suggestion.key}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addSuggestedParam(suggestion)}
                  className="h-8"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-2">
        {bodyParams.map((param, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={param.key}
              onChange={(e) => handleParamChange(index, 'key', e.target.value)}
              placeholder="Key"
              className="flex-1 font-mono text-sm bg-white/5 border-white/10 text-white"
            />
            <Input
              value={param.value}
              onChange={(e) => handleParamChange(index, 'value', e.target.value)}
              placeholder="Value"
              className="flex-1 font-mono text-sm bg-white/5 border-white/10 text-white"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeParam(index)}
              className="h-10 w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newParamKey}
          onChange={(e) => setNewParamKey(e.target.value)}
          placeholder="New key"
          className="flex-1 font-mono text-sm bg-white/5 border-white/10 text-white"
        />
        <Input
          value={newParamValue}
          onChange={(e) => setNewParamValue(e.target.value)}
          placeholder="New value"
          className="flex-1 font-mono text-sm bg-white/5 border-white/10 text-white"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={addParam}
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {!isValidJson && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid JSON format. Please check your input.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default WebhookBodyManager;