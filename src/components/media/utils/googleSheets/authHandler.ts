// Store tokens in localStorage with proper typing
export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export const storeGoogleAuth = (tokens: GoogleTokens) => {
  localStorage.setItem('google_access_token', tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem('google_refresh_token', tokens.refresh_token);
  }
  localStorage.setItem('google_token_expiry', (Date.now() + tokens.expires_in * 1000).toString());
};

export const getStoredGoogleAuth = () => {
  const access_token = localStorage.getItem('google_access_token');
  const refresh_token = localStorage.getItem('google_refresh_token');
  const expiry = localStorage.getItem('google_token_expiry');

  if (!access_token || !expiry) return null;

  return {
    access_token,
    refresh_token,
    expiry: parseInt(expiry)
  };
};

export const clearGoogleAuth = () => {
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_refresh_token');
  localStorage.removeItem('google_token_expiry');
};