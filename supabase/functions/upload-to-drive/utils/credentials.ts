export const parseGoogleCredentials = (credentialsStr: string) => {
  console.log('Attempting to parse Google credentials...');
  
  try {
    // Try parsing as JSON first
    try {
      return JSON.parse(credentialsStr);
    } catch {
      // If direct JSON parse fails, try base64 decode
      console.log('Direct parse failed, attempting base64 decode...');
      const decodedStr = atob(credentialsStr);
      return JSON.parse(decodedStr);
    }
  } catch (error) {
    console.error('Failed to parse Google credentials:', error);
    throw new Error(`Invalid Google credentials format: ${error.message}`);
  }
};