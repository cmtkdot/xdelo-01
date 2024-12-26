const GOOGLE_CLIENT_ID = "977351558653-ohvqd6j78cbei8aufarbdsoskqql05s1.apps.googleusercontent.com";

export const getGoogleAuthToken = async () => {
  try {
    const tokenResponse = await new Promise<google.accounts.oauth2.TokenResponse>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (response) => {
          if ('error' in response) {
            reject(response);
          } else {
            resolve(response);
          }
        },
      });
      tokenClient.requestAccessToken();
    });

    return tokenResponse.access_token;
  } catch (error) {
    console.error('Error getting Google auth token:', error);
    throw error;
  }
};