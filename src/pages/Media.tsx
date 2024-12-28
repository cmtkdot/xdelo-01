import { GoogleOAuthProvider } from '@react-oauth/google';
import MediaGallery from "@/components/MediaGallery";

const GOOGLE_CLIENT_ID = "977351558653-ohvqd6j78cbei8aufarbdsoskqql05s1.apps.googleusercontent.com";

const Media = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MediaGallery />
    </GoogleOAuthProvider>
  );
};

export default Media;