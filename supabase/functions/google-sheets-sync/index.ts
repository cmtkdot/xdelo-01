import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, action } = await req.json();
    const serviceAccountCreds = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '{}');
    
    if (!serviceAccountCreds.client_email || !serviceAccountCreds.private_key) {
      throw new Error('Google service account credentials not properly configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    console.log(`Processing ${action} request for spreadsheet: ${spreadsheetId}`);

    switch (action) {
      case 'init': {
        // Get the media data
        const { data: mediaData, error: mediaError } = await supabase
          .from('media')
          .select('*')
          .order('created_at', { ascending: false });

        if (mediaError) throw mediaError;

        // Create JWT token for Google Sheets API
        const jwtToken = await createJWT(serviceAccountCreds);

        // Get existing sheet data to preserve custom columns
        const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ?access_token=${jwtToken}`;
        const getResponse = await fetch(sheetUrl);
        
        if (!getResponse.ok) {
          console.error('Failed to fetch sheet data:', await getResponse.text());
          throw new Error(`Failed to fetch sheet data: ${getResponse.statusText}`);
        }

        const existingData = await getResponse.json();
        const existingHeaders = existingData.values?.[0] || [];
        const existingRows = existingData.values?.slice(1) || [];

        // Define default media table headers
        const mediaHeaders = [
          'ID',
          'File Name',
          'Media Type',
          'Caption',
          'File URL',
          'Public URL',
          'Created At',
          'Updated At',
          'Chat ID',
          'Media Group ID'
        ];

        // Merge headers - keep existing custom columns
        const finalHeaders = Array.from(new Set([...mediaHeaders, ...existingHeaders]));

        // Prepare media data rows
        const mediaRows = mediaData.map(item => {
          const row = new Array(finalHeaders.length).fill('');
          finalHeaders.forEach((header, index) => {
            let value = '';
            switch (header) {
              case 'ID': value = item.id || ''; break;
              case 'File Name': value = item.file_name || ''; break;
              case 'Media Type': value = item.media_type || ''; break;
              case 'Caption': value = item.caption || ''; break;
              case 'File URL': value = item.file_url || ''; break;
              case 'Public URL': value = item.public_url || ''; break;
              case 'Created At': value = item.created_at || ''; break;
              case 'Updated At': value = item.updated_at || ''; break;
              case 'Chat ID': value = item.chat_id?.toString() || ''; break;
              case 'Media Group ID': value = item.media_group_id || ''; break;
              default:
                // Preserve existing custom column values
                const existingRowIndex = existingRows.findIndex(row => row[0] === item.id);
                if (existingRowIndex !== -1) {
                  const headerIndex = existingHeaders.indexOf(header);
                  if (headerIndex !== -1) {
                    value = existingRows[existingRowIndex][headerIndex] || '';
                  }
                }
            }
            row[index] = value;
          });
          return row;
        });

        // Update the sheet with merged data
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:${String.fromCharCode(65 + finalHeaders.length)}${mediaRows.length + 1}?valueInputOption=RAW&access_token=${jwtToken}`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [finalHeaders, ...mediaRows],
            majorDimension: 'ROWS',
          }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update sheet:', await updateResponse.text());
          throw new Error(`Failed to update sheet: ${updateResponse.statusText}`);
        }

        const result = await updateResponse.json();
        console.log('Sheet sync completed successfully');

        // Update sync timestamp in config
        const { error: configError } = await supabase
          .from('google_sheets_config')
          .update({ 
            updated_at: new Date().toISOString(),
            is_headers_mapped: true,
            header_mapping: Object.fromEntries(
              mediaHeaders.map(header => [header, header.toLowerCase().replace(/ /g, '_')])
            )
          })
          .eq('spreadsheet_id', spreadsheetId);

        if (configError) throw configError;

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: result,
            headers: finalHeaders,
            rowCount: mediaRows.length 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  } catch (error) {
    console.error('Error in google-sheets-sync function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

// Helper function to create JWT token for Google Sheets API
async function createJWT(serviceAccountCreds: any) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccountCreds.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Create signature
  const encoder = new TextEncoder();
  const keyData = serviceAccountCreds.private_key;
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    encoder.encode(keyData),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get access token');
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}