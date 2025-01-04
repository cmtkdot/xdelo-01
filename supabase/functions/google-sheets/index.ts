import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { google } from "npm:googleapis@118.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, ...data } = await req.json()
    
    switch (action) {
      case 'init':
        return await handleInit(data)
      case 'sync':
        return await handleSync(data)
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function handleInit(data: any) {
  const { spreadsheetId, accessToken } = data;

  if (!spreadsheetId || !accessToken) {
    throw new Error('Missing required parameters');
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Initialize headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:K1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          'ID',
          'Channel',
          'Type',
          'Caption',
          'Created At',
          'Updated At',
          'File URL',
          'Public URL',
          'Drive URL',
          'Message ID',
          'Media Group'
        ]]
      }
    });

    // Format header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.2,
                    blue: 0.2
                  },
                  textFormat: {
                    bold: true,
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1
                    }
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0,
                gridProperties: {
                  frozenRowCount: 1
                }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          }
        ]
      }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    throw new Error('Failed to initialize spreadsheet');
  }
}

async function handleSync(data: any) {
  const { spreadsheetId, accessToken, mediaItems } = data;

  if (!spreadsheetId || !accessToken || !mediaItems) {
    throw new Error('Missing required parameters');
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const values = mediaItems.map((item: any) => [
      item.id,
      item.chat?.title || 'Unknown',
      item.media_type,
      item.caption || '',
      item.created_at,
      item.updated_at,
      item.file_url || '',
      item.public_url || '',
      item.google_drive_url || '',
      item.metadata?.message_id || '',
      item.media_group_id || ''
    ]);

    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'A2:K',
    });

    // Update with new data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A2',
      valueInputOption: 'RAW',
      requestBody: {
        values
      }
    });

    // Auto-resize columns
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 11
              }
            }
          }
        ]
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Synced ${values.length} items`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    throw new Error('Failed to sync data to spreadsheet');
  }
}