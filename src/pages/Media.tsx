import { GoogleOAuthProvider } from '@react-oauth/google';
import MediaGallery from "@/components/MediaGallery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WebhookInterface from "@/components/webhook/WebhookInterface";
import { Webhook } from "lucide-react";

const GOOGLE_CLIENT_ID = "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com";

const Media = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="container mx-auto p-6 space-y-6">
        <MediaGallery />
        
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-transparent border border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-[#0088cc]" />
                <CardTitle className="text-white">Webhook Configuration</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Configure webhook settings for media synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhookInterface />
            </CardContent>
          </Card>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Media;