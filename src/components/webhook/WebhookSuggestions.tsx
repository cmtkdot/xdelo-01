import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { Header } from "./WebhookHeaderManager";
import { QueryParam } from "./WebhookQueryManager";

const commonHeaders = [
  { key: "Content-Type", value: "application/json" },
  { key: "Authorization", value: "Bearer " },
  { key: "Accept", value: "application/json" },
];

const glideApiHeaders = [
  { key: "Content-Type", value: "application/json" },
  { key: "Authorization", value: "Bearer " },
];

const glideApiBodyParams = [
  { key: "appID", value: "" },
  { key: "queries", value: JSON.stringify([{
    tableName: "",
    utc: true
  }], null, 2) },
];

interface WebhookSuggestionsProps {
  onAddHeader: (header: Header) => void;
  onAddBodyParam: (param: { key: string, value: string }) => void;
}

const WebhookSuggestions = ({
  onAddHeader,
  onAddBodyParam
}: WebhookSuggestionsProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2 text-white">Suggested Headers</h4>
        <ScrollArea className="h-[100px] rounded-md border border-white/10 p-2">
          <div className="space-y-2">
            {[...commonHeaders, ...glideApiHeaders].map((header, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-white/70">{header.key}: {header.value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddHeader(header)}
                  className="h-6"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2 text-white">Glide API Parameters</h4>
        <ScrollArea className="h-[100px] rounded-md border border-white/10 p-2">
          <div className="space-y-2">
            {glideApiBodyParams.map((param, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-white/70">{param.key}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddBodyParam(param)}
                  className="h-6"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default WebhookSuggestions;