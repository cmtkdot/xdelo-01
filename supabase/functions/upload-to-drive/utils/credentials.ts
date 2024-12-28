export const parseGoogleCredentials = (credentialsStr: string) => {
  console.log('Attempting to parse Google credentials...');
  
  try {
    // First try parsing as regular JSON
    try {
      return JSON.parse(credentialsStr);
    } catch (jsonError) {
      console.log('Direct JSON parse failed, attempting base64 decode...');
      
      // If JSON parse fails, try base64 decode
      // Remove any whitespace and newlines first
      const cleanStr = credentialsStr.replace(/\s/g, '');
      const decodedStr = atob(cleanStr);
      
      try {
        return JSON.parse(decodedStr);
      } catch (base64Error) {
        console.error('Base64 decode failed:', base64Error);
        throw new Error('Failed to parse credentials as base64');
      }
    }
  } catch (error) {
    console.error('Failed to parse Google credentials:', error);
    throw new Error(`Invalid Google credentials format: ${error.message}`);
  }
};