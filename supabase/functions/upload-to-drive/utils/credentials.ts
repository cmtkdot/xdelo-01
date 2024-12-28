export const parseGoogleCredentials = (credentialsStr: string) => {
  console.log('Attempting to parse Google credentials...');
  
  try {
    // First try parsing as regular JSON
    try {
      const parsed = JSON.parse(credentialsStr);
      console.log('Successfully parsed credentials as JSON');
      
      // Validate required service account fields
      if (!parsed.client_email || !parsed.private_key) {
        throw new Error('Missing required service account fields');
      }
      
      return parsed;
    } catch (jsonError) {
      console.error('JSON parse failed:', jsonError);
      throw new Error('Invalid service account credentials format');
    }
  } catch (error) {
    console.error('Failed to parse Google credentials:', error);
    throw new Error(`Invalid Google credentials format: ${error.message}`);
  }
};