import { Info } from "lucide-react";
import { HttpMethod } from "./WebhookMethodSelector";

interface WebhookRequestDetailsProps {
  method: HttpMethod;
  selectedMedia: any[];
  selectedFields: string[];
}

const WebhookRequestDetails = ({ method, selectedMedia, selectedFields }: WebhookRequestDetailsProps) => {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-start space-x-2">
        <Info className="w-5 h-5 text-blue-400 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-white">Request Details</h4>
          <p className="text-xs text-white/70">
            Method: {method}
          </p>
          <p className="text-xs text-white/70">
            Headers: X-Source: Media Gallery, X-Batch-Size: {selectedMedia.length}
          </p>
          <p className="text-xs text-white/70">
            Query Parameters: source=media_gallery, fields={selectedFields.join(',')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebhookRequestDetails;