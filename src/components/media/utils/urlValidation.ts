export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateMediaUrl = (url: string | null | undefined, mediaType?: string): string | null => {
  if (!isValidUrl(url)) {
    console.warn(`Invalid URL detected: ${url}`);
    return null;
  }
  return url;
};

export const generatePublicUrl = (filename: string, mediaType: string): string => {
  // Default to telegram-media bucket for simplicity
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/telegram-media/${filename}`;
};