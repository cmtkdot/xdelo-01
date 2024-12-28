export const parseGoogleCredentials = (credentialsStr: string) => {
  console.log('Attempting to parse Google credentials...');
  
  try {
    // First try parsing as regular JSON
    try {
      const parsed = JSON.parse(credentialsStr);
      console.log('Successfully parsed credentials as JSON');
      return parsed;
    } catch (jsonError) {
      console.log('Direct JSON parse failed, attempting base64 decode...');
      
      // If JSON parse fails, try base64 decode
      // Remove any whitespace, newlines, and quotes
      const cleanStr = credentialsStr
        .replace(/[\s\n\r]/g, '')
        .replace(/^["']|["']$/g, '');
      
      try {
        const decodedStr = atob(cleanStr);
        const parsed = JSON.parse(decodedStr);
        console.log('Successfully parsed credentials from base64');
        return parsed;
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