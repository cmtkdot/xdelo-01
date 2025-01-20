import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')

    if (!botToken || !webhookSecret) {
      throw new Error('Missing required environment variables')
    }

    // Your Supabase project URL - this is where Telegram will send webhook updates
    const projectUrl = Deno.env.get('SUPABASE_URL')
    if (!projectUrl) {
      throw new Error('Missing SUPABASE_URL')
    }

    // Construct the webhook URL
    const webhookUrl = `${projectUrl}/functions/v1/telegram-media-webhook`

    // Set up the webhook with Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ["message", "channel_post", "edited_message", "edited_channel_post"]
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Failed to set webhook: ${JSON.stringify(result)}`)
    }

    // Log the successful setup
    console.log('Webhook setup successful:', result)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook configured successfully',
        details: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error setting up webhook:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})