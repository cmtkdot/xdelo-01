export const parseGoogleCredentials = (credentialsStr: string) => {
  console.log('Attempting to parse Google credentials...');
  
  try {
    if (!credentialsStr) {
      throw new Error('Google credentials string is empty');
    }

    const parsed = JSON.parse(credentialsStr);
    
    // Validate required service account fields
    const requiredFields = ['client_email', 'private_key', 'project_id'];
    const missingFields = requiredFields.filter(field => !parsed[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required service account fields: ${missingFields.join(', ')}`);
    }
    
    console.log('Successfully parsed and validated credentials');
    return parsed;
  } catch (error) {
    console.error('Failed to parse Google credentials:', error);
    throw new Error(`Invalid Google credentials format: ${error.message}`);
  }
};