import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";
import { HttpMethod } from "./WebhookMethodSelector";

interface WebhookDataFetcherProps {
  isLoading: boolean;
  webhookUrl: string;
  method: HttpMethod;
  webhookData: any[];
  availableFields: string[];
  onFetch: () => Promise<void>;
}

const WebhookDataFetcher = ({ 
  isLoading, 
  webhookUrl, 
  method, 
  webhookData, 
  availableFields,
  onFetch 
}: WebhookDataFetcherProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={onFetch}
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
    </div>
  );
};

export default WebhookDataFetcher;