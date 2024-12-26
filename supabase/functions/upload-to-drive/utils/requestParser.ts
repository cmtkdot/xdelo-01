import { corsHeaders } from './cors.ts';

export interface DriveUploadRequest {
  files?: { fileUrl: string; fileName: string }[];
  fileUrl?: string;
  fileName?: string;
}

export const parseRequest = async (req: Request): Promise<DriveUploadRequest> => {
  try {
    const contentType = req.headers.get('content-type');
    let text = await req.text();
    console.log('Raw request body:', text);
    
    // Remove any BOM or invalid characters at the start
    text = text.replace(/^\uFEFF/, '');
    text = text.trim();
    
    const data = JSON.parse(text);
    console.log('Parsed request body:', data);
    return data;
  } catch (error) {
    console.error('Error parsing request:', error);
    throw new Error(`Request parsing failed: ${error.message}`);
  }
};