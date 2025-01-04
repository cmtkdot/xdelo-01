import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MediaItem } from "../media/types";
import WebhookUrlManager from "./WebhookUrlManager";
import WebhookHistoryTable from "./WebhookHistoryTable";
import WebhookRequestDetails from "./WebhookRequestDetails";
import WebhookFieldSelector from "./WebhookFieldSelector";
import WebhookScheduleSelector from "./WebhookScheduleSelector";
import WebhookConfigurationPanel from "./WebhookConfigurationPanel";
import { useWebhookState } from "./hooks/useWebhookState";
import { useWebhookActions } from "./hooks/useWebhookActions";

interface WebhookInterfaceProps {
  schedule?: "manual" | "hourly" | "daily" | "weekly";
  selectedMedia?: MediaItem[];
}

const WebhookInterface = ({ 
  schedule: initialSchedule = "manual", 
  selectedMedia = [] 
}: WebhookInterfaceProps) => {
  const state = useWebhookState(initialSchedule);
  
  const actions = useWebhookActions({
    webhookUrl: state.webhookUrl,
    method: state.method,
    headers: state.headers,
    params: state.params,
    body: state.body,
    selectedFields: state.selectedFields,
    selectedMedia,
    schedule: state.schedule,
    setIsLoading: state.setIsLoading,
    setAvailableFields: state.setAvailableFields,
    setWebhookData: state.setWebhookData,
  });

  if (!state.webhookUrl) {
    return (
      <div className="space-y-4">
        <WebhookUrlManager onUrlSelect={state.setWebhookUrl} />
        <p className="text-gray-400 text-center">Select a webhook URL to continue</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WebhookUrlManager onUrlSelect={state.setWebhookUrl} />
      
      <WebhookScheduleSelector 
        schedule={state.schedule}
        onScheduleChange={state.setSchedule}
      />

      <WebhookConfigurationPanel
        method={state.method}
        onMethodChange={state.setMethod}
        isLoading={state.isLoading}
        webhookUrl={state.webhookUrl}
        webhookData={state.webhookData}
        availableFields={state.availableFields}
        onFetch={actions.fetchWebhookData}
        headers={state.headers}
        onHeadersChange={state.setHeaders}
        params={state.params}
        onParamsChange={state.setParams}
        body={state.body}
        onBodyChange={state.setBody}
      />
      
      {state.method !== "GET" && (
        <WebhookFieldSelector
          availableFields={state.availableFields}
          selectedFields={state.selectedFields}
          onFieldsChange={state.setSelectedFields}
          selectedMediaCount={selectedMedia.length}
        />
      )}

      <WebhookRequestDetails
        method={state.method}
        selectedMedia={selectedMedia}
        selectedFields={state.selectedFields}
        headers={state.headers}
        params={state.params}
        body={state.body}
      />

      <Button 
        onClick={actions.handleSendWebhook}
        disabled={state.isLoading || (state.method !== "GET" && selectedMedia.length === 0)}
        className="w-full bg-[#0088cc] hover:bg-[#0088cc]/80 text-white"
      >
        {state.schedule === "manual" ? `Send ${state.method} Request (${selectedMedia.length} items)` : `Schedule ${state.schedule} updates`}
      </Button>

      <WebhookHistoryTable />
    </div>
  );
};

export default WebhookInterface;