import { useState } from "react";
import { HttpMethod } from "../WebhookMethodSelector";
import { Header } from "../WebhookHeaderManager";
import { QueryParam } from "../WebhookQueryManager";
import { MediaItem } from "../../media/types";

export const useWebhookState = (initialSchedule: "manual" | "hourly" | "daily" | "weekly" = "manual") => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [webhookData, setWebhookData] = useState<any[]>([]);
  const [method, setMethod] = useState<HttpMethod>("POST");
  const [headers, setHeaders] = useState<Header[]>([]);
  const [params, setParams] = useState<QueryParam[]>([]);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [body, setBody] = useState("");

  return {
    webhookUrl,
    setWebhookUrl,
    isLoading,
    setIsLoading,
    selectedFields,
    setSelectedFields,
    availableFields,
    setAvailableFields,
    webhookData,
    setWebhookData,
    method,
    setMethod,
    headers,
    setHeaders,
    params,
    setParams,
    schedule,
    setSchedule,
    body,
    setBody,
  };
};