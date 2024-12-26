import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WebhookMethodSelector, { HttpMethod } from "./WebhookMethodSelector";
import WebhookDataFetcher from "./WebhookDataFetcher";
import WebhookHeaderManager, { Header } from "./WebhookHeaderManager";
import WebhookQueryManager, { QueryParam } from "./WebhookQueryManager";
import WebhookBodyManager from "./WebhookBodyManager";
import WebhookConfigurationSaver from "./WebhookConfigurationSaver";
import WebhookConfigurationLoader from "./WebhookConfigurationLoader";
import WebhookSuggestions from "./WebhookSuggestions";

interface WebhookConfigurationPanelProps {
  method: HttpMethod;
  onMethodChange: (method: HttpMethod) => void;
  isLoading: boolean;
  webhookUrl: string;
  webhookData: any[];
  availableFields: string[];
  onFetch: () => Promise<void>;
  headers: Header[];
  onHeadersChange: (headers: Header[]) => void;
  params: QueryParam[];
  onParamsChange: (params: QueryParam[]) => void;
  body: string;
  onBodyChange: (body: string) => void;
}

const WebhookConfigurationPanel = ({
  method,
  onMethodChange,
  isLoading,
  webhookUrl,
  webhookData,
  availableFields,
  onFetch,
  headers,
  onHeadersChange,
  params,
  onParamsChange,
  body,
  onBodyChange,
}: WebhookConfigurationPanelProps) => {
  const handleConfigLoad = (config: {
    method: HttpMethod;
    headers: Header[];
    body: string;
    params: QueryParam[];
  }) => {
    onMethodChange(config.method);
    onHeadersChange(config.headers);
    onBodyChange(config.body);
    onParamsChange(config.params);
  };

  const handleAddHeader = (header: Header) => {
    onHeadersChange([...headers, header]);
  };

  const handleAddBodyParam = (param: { key: string, value: string }) => {
    try {
      const currentBody = JSON.parse(body || "{}");
      const newBody = {
        ...currentBody,
        [param.key]: param.value
      };
      onBodyChange(JSON.stringify(newBody, null, 2));
    } catch {
      onBodyChange(JSON.stringify({ [param.key]: param.value }, null, 2));
    }
  };

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Webhook Configuration
        </CardTitle>
        <CardDescription>
          Configure webhook method, headers, body, and parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <WebhookMethodSelector method={method} onMethodChange={onMethodChange} />
          <WebhookDataFetcher
            isLoading={isLoading}
            webhookUrl={webhookUrl}
            method={method}
            webhookData={webhookData}
            availableFields={availableFields}
            onFetch={onFetch}
          />
        </div>

        <div className="flex items-center gap-4">
          <WebhookConfigurationLoader
            webhookUrlId={webhookUrl}
            onLoad={handleConfigLoad}
          />
          <WebhookConfigurationSaver
            webhookUrlId={webhookUrl}
            method={method}
            headers={headers}
            params={params}
            body={body}
          />
        </div>

        <WebhookSuggestions
          onAddHeader={handleAddHeader}
          onAddBodyParam={handleAddBodyParam}
        />

        <WebhookHeaderManager headers={headers} onHeadersChange={onHeadersChange} />
        
        {method !== "GET" && (
          <WebhookBodyManager body={body} onBodyChange={onBodyChange} />
        )}

        <WebhookQueryManager params={params} onParamsChange={onParamsChange} />
      </CardContent>
    </Card>
  );
};

export default WebhookConfigurationPanel;