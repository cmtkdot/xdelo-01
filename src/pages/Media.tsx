import { GoogleOAuthProvider } from '@react-oauth/google';
import MediaGallery from "@/components/MediaGallery";

const GOOGLE_CLIENT_ID = "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com";

const Media = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="container mx-auto p-6 space-y-6">
        <MediaGallery />
      </div>
    </GoogleOAuthProvider>
  );
};

export default Media;