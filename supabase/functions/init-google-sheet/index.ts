import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { parseGoogleCredentials } from '../upload-to-drive/utils/credentials.ts'
import { generateServiceAccountToken } from '../upload-to-drive/utils/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting Google Sheets initialization...')
    const { spreadsheetId, gid } = await req.json()
    
    if (!spreadsheetId) {
      throw new Error('Missing required parameter: spreadsheetId')
    }

    console.log('Request payload:', { spreadsheetId, gid })

    // Get credentials and access token
    const credentials = parseGoogleCredentials(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS') || '')
    const accessToken = await generateServiceAccountToken(credentials)
    console.log('Successfully obtained access token')

    // Get spreadsheet info to verify access
    const getResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!getResponse.ok) {
      throw new Error(`Failed to get spreadsheet: ${await getResponse.text()}`)
    }

    console.log('Successfully verified spreadsheet access')
    
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})