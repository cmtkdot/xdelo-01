export const parseGoogleCredentials = (credentialsStr: string) => {
  try {
    console.log('Starting credentials parsing...');
    
    if (!credentialsStr) {
      throw new Error('Google credentials string is empty');
    }

    // Parse credentials string to object
    let credentials;
    try {
      credentials = JSON.parse(credentialsStr);
    } catch (parseError) {
      console.error('Failed to parse credentials JSON:', parseError);
      throw new Error(`Invalid credentials format: ${parseError.message}`);
    }
    
    // Validate required fields
    const requiredFields = ['client_email', 'private_key', 'private_key_id'];
    const missingFields = requiredFields.filter(field => !credentials[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Format private key properly
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

    console.log('Successfully parsed credentials');
    return credentials;
  } catch (error) {
    console.error('Error parsing Google credentials:', error);
    throw new Error(`Failed to parse Google credentials: ${error.message}`);
  }
};