export const parseGoogleCredentials = (credentialsStr: string) => {
  try {
    if (!credentialsStr) {
      throw new Error('Google credentials string is empty');
    }

    const credentials = JSON.parse(credentialsStr);
    
    // Validate required fields
    const requiredFields = ['client_email', 'private_key', 'private_key_id'];
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Format private key properly
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

    return credentials;
  } catch (error) {
    console.error('Error parsing Google credentials:', error);
    throw new Error(`Failed to parse Google credentials: ${error.message}`);
  }
};