import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
import { handleMediaUpload } from "../telegram-media-webhook/handlers/mediaHandler.ts"
import { saveChannel, saveMessage } from "../telegram-media-webhook/utils/database.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sourceChatId, destinationChatId } = await req.json()
    
    if (!sourceChatId || !destinationChatId) {
      throw new Error('Missing required chat IDs')
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get messages from source channel
    const messages = await getChannelMessages(botToken, sourceChatId)
    
    const results = []
    for (const message of messages) {
      try {
        // Forward message to destination channel
        const forwardResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/forwardMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: destinationChatId,
              from_chat_id: sourceChatId,
              message_id: message.message_id,
              disable_notification: true
            })
          }
        )

        const forwardData = await forwardResponse.json()
        
        if (!forwardData.ok) {
          console.error('Forward failed:', forwardData)
          continue
        }

        // Process media if present
        if (message.photo || message.video || message.document) {
          const mediaResult = await handleMediaUpload(supabase, message, message.from.id, botToken)
          
          if (mediaResult) {
            // Save forward tracking
            await supabase.from('message_forwards').insert({
              source_chat_id: sourceChatId,
              destination_chat_id: destinationChatId,
              original_message_id: message.message_id,
              forwarded_message_id: forwardData.result.message_id,
              media_id: mediaResult.mediaData.id
            })
          }
        }

        // Save message data
        await saveMessage(supabase, message.chat, message, message.from.id)
        await saveChannel(supabase, message.chat, message.from.id)

        results.push({
          original_message_id: message.message_id,
          forwarded_message_id: forwardData.result.message_id,
          success: true
        })

      } catch (error) {
        console.error('Error processing message:', error)
        results.push({
          original_message_id: message.message_id,
          error: error.message,
          success: false
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in forward-channel-messages:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function getChannelMessages(botToken: string, chatId: number) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getUpdates`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        limit: 100,
        allowed_updates: ["channel_post", "message"]
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get messages: ${response.statusText}`)
  }

  const data = await response.json()
  return data.result || []
}