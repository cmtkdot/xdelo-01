import { GlideDataView } from "@/components/glide/GlideDataView";
import { EdgeFunctionLogs } from "@/components/settings/EdgeFunctionLogs";
import SetupTelegramWebhook from "@/components/webhook/SetupTelegramWebhook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook } from "lucide-react";

export default function Settings() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <div className="space-y-8">
        <Card className="bg-transparent border border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-[#0088cc]" />
              <CardTitle>Telegram Webhook Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure the Telegram webhook for media synchronization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SetupTelegramWebhook />
          </CardContent>
        </Card>

        <GlideDataView />
        <EdgeFunctionLogs />
      </div>
    </div>
  );
}