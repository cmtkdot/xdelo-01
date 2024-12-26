import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WebhookBodyManagerProps {
  body: string;
  onBodyChange: (body: string) => void;
}

const WebhookBodyManager = ({ body, onBodyChange }: WebhookBodyManagerProps) => {
  const [isValidJson, setIsValidJson] = useState(true);

  const formatJson = () => {
    try {
      const parsed = JSON.parse(body);
      const formatted = JSON.stringify(parsed, null, 2);
      onBodyChange(formatted);
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Request Body (JSON)</Label>
      <Textarea
        value={body}
        onChange={(e) => {
          onBodyChange(e.target.value);
          setIsValidJson(true);
        }}
        placeholder="Enter JSON request body"
        className="min-h-[200px] font-mono text-sm bg-white/5 border-white/10 text-white"
      />
      {!isValidJson && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid JSON format. Please check your input.
          </AlertDescription>
        </Alert>
      )}
      <Button
        variant="outline"
        onClick={formatJson}
        className="w-full border-white/10 hover:bg-white/5"
      >
        Format JSON
      </Button>
    </div>
  );
};

export default WebhookBodyManager;