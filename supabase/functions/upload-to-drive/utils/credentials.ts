export const parseGoogleCredentials = (credentialsStr: string | undefined) => {
  if (!credentialsStr) {
    throw new Error('Google credentials not found in environment. Please add GOOGLE_SERVICE_ACCOUNT_CREDENTIALS to your Edge Function secrets.');
  }

  try {
    return JSON.parse(credentialsStr);
  } catch (error) {
    console.error('Error parsing Google credentials:', error);
    throw new Error('Invalid Google service account credentials format');
  }
};