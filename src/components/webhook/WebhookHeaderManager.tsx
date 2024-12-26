import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import WebhookSuggestionDropdown from "./WebhookSuggestionDropdown";

export interface Header {
  key: string;
  value: string;
}

const COMMON_HEADERS = [
  { 
    key: "Content-Type", 
    value: "application/json",
    description: "Specifies the format of the request body"
  },
  { 
    key: "Authorization", 
    value: "Bearer ",
    description: "Authentication token for API access"
  },
  { 
    key: "Accept", 
    value: "application/json",
    description: "Specifies the expected response format"
  },
  { 
    key: "x-glide-api-key", 
    value: "",
    description: "API key for Glide API authentication"
  },
];

interface WebhookHeaderManagerProps {
  headers: Header[];
  onHeadersChange: (headers: Header[]) => void;
}

const WebhookHeaderManager = ({ headers, onHeadersChange }: WebhookHeaderManagerProps) => {
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  const addHeader = () => {
    if (newHeaderKey.trim() && newHeaderValue.trim()) {
      onHeadersChange([...headers, { key: newHeaderKey, value: newHeaderValue }]);
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    onHeadersChange(newHeaders);
  };

  const handleSuggestionSelect = (suggestion: { key: string; value: string }) => {
    setNewHeaderKey(suggestion.key);
    setNewHeaderValue(suggestion.value);
  };

  return (
    <div className="space-y-4">
      <Label>Custom Headers</Label>
      <div className="space-y-2">
        {headers.map((header, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={header.key}
              onChange={(e) => {
                const newHeaders = [...headers];
                newHeaders[index].key = e.target.value;
                onHeadersChange(newHeaders);
              }}
              placeholder="Header key"
              className="flex-1 bg-white/5 border-white/10 text-white"
            />
            <Input
              value={header.value}
              onChange={(e) => {
                const newHeaders = [...headers];
                newHeaders[index].value = e.target.value;
                onHeadersChange(newHeaders);
              }}
              placeholder="Header value"
              className="flex-1 bg-white/5 border-white/10 text-white"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeHeader(index)}
              className="h-10 w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <WebhookSuggestionDropdown
          suggestions={COMMON_HEADERS}
          value={newHeaderKey}
          onSelect={handleSuggestionSelect}
          placeholder="Select or type header"
          triggerClassName="flex-1"
        />
        <Input
          value={newHeaderValue}
          onChange={(e) => setNewHeaderValue(e.target.value)}
          placeholder="New header value"
          className="flex-1 bg-white/5 border-white/10 text-white"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={addHeader}
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default WebhookHeaderManager;