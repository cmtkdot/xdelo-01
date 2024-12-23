import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WebhookInterface from "@/components/webhook/WebhookInterface";
import { Webhook } from "lucide-react";

const WebhooksPage = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Webhook className="w-6 h-6 text-[#0088cc]" />
        <h1 className="text-2xl font-bold text-white">Webhook Management</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-transparent border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Manual Webhook</CardTitle>
            <CardDescription className="text-gray-400">
              Send media data to external webhooks on demand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookInterface />
          </CardContent>
        </Card>

        <Card className="bg-transparent border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Scheduled Webhooks</CardTitle>
            <CardDescription className="text-gray-400">
              Configure automatic webhook data sending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookInterface schedule="hourly" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebhooksPage;