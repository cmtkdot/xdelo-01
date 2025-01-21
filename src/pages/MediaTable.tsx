import { GoogleOAuthProvider } from '@react-oauth/google';
import MediaGalleryContainer from "@/components/media/MediaGalleryContainer";

const GOOGLE_CLIENT_ID = "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com";

const MediaTable = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MediaGalleryContainer />
    </GoogleOAuthProvider>
  );
};

export default MediaTable;