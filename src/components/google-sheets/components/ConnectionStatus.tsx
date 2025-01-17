import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink } from "lucide-react";

interface ConnectionStatusProps {
  googleSheetId: string;
  mediaCount: number;
  onSyncWithMedia: () => void;
  getSheetUrl: (id: string) => string;
}

export const ConnectionStatus = ({
  googleSheetId,
  mediaCount,
  onSyncWithMedia,
  getSheetUrl,
}: ConnectionStatusProps) => {
  return (
    <Alert>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <AlertDescription>
            Connected to Google Sheet
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSyncWithMedia}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Sync with Media ({mediaCount} items)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-400 hover:text-blue-300 transition-colors"
            onClick={() => window.open(getSheetUrl(googleSheetId), '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Sheet
          </Button>
        </div>
      </div>
    </Alert>
  );
};