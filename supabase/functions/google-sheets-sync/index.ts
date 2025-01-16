import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, action, accessToken } = await req.json();
    
    if (!accessToken) {
      throw new Error('Google access token is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    switch (action) {
      case 'init': {
        // Get the media data
        const { data: mediaData, error: mediaError } = await supabase
          .from('media')
          .select('*')
          .order('created_at', { ascending: false });
        if (mediaError) throw mediaError;

        // Get existing sheet data to preserve custom columns
        const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:ZZ`;
        const getResponse = await fetch(sheetUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!getResponse.ok) {
          console.error('Failed to fetch sheet data:', await getResponse.text());
          throw new Error(`Failed to fetch sheet data: ${getResponse.statusText}`);
        }

        const { values: existingData } = await getResponse.json();
        const existingHeaders = existingData?.[0] || [];
        
        // Get media table columns
        const mediaHeaders = Object.keys(mediaData[0] || {});
        
        // Merge headers, preserving custom columns
        const finalHeaders = Array.from(new Set([...mediaHeaders, ...existingHeaders]));
        
        // Create rows with merged data
        const mediaRows = mediaData.map(media => {
          const row = new Array(finalHeaders.length).fill('');
          finalHeaders.forEach((header, index) => {
            if (header in media) {
              // Handle special cases for JSON fields
              if (typeof media[header] === 'object' && media[header] !== null) {
                row[index] = JSON.stringify(media[header]);
              } else {
                row[index] = media[header]?.toString() || '';
              }
            } else if (existingData) {
              // Preserve existing custom column values
              const existingRowIndex = existingData.findIndex((row: any[]) => 
                row[mediaHeaders.indexOf('id')] === media.id
              );
              if (existingRowIndex > 0) { // Skip header row
                const existingColIndex = existingHeaders.indexOf(header);
                if (existingColIndex >= 0) {
                  row[index] = existingData[existingRowIndex][existingColIndex] || '';
                }
              }
            }
          });
          return row;
        });

        // Prepare final data with headers
        const finalData = [finalHeaders, ...mediaRows];

        // Update the sheet with merged data
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:${String.fromCharCode(65 + finalHeaders.length)}${mediaRows.length + 1}?valueInputOption=RAW`;
        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: finalData,
            range: `A1:${String.fromCharCode(65 + finalHeaders.length)}${mediaRows.length + 1}`,
          }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update sheet:', await updateResponse.text());
          throw new Error(`Failed to update sheet: ${updateResponse.statusText}`);
        }

        // Update google_sheets_config
        const { error: configError } = await supabase
          .from('google_sheets_config')
          .upsert({
            spreadsheet_id: spreadsheetId,
            is_headers_mapped: true,
            header_mapping: finalHeaders.reduce((acc, header) => ({
              ...acc,
              [header]: header
            }), {}),
            updated_at: new Date().toISOString(),
          });

        if (configError) throw configError;

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Sheet updated successfully',
            headers: finalHeaders
          }),
          { 
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          },
        );
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});