import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getContentType, getBucketId, generateSafeFileName } from "../telegram-media-webhook/utils/fileHandling.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramMessage {
  message_id: number;
  chat: {
    id: number;
    title?: string;
  };
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    file_size?: number;
  }>;
  video?: {
    file_id: string;
    file_unique_id: string;
    mime_type?: string;
    file_size?: number;
  };
  document?: {
    file_id: string;
    file_unique_id: string;
    mime_type?: string;
    file_size?: number;
  };
  caption?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { channelIds } = await req.json()
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Function to log events
    const logEvent = async (message: string, status: 'info' | 'error' | 'success') => {
      await supabase.from('edge_function_logs').insert({
        function_name: 'sync-telegram-channel',
        status,
        message
      })
    }

    // Function to get file from Telegram
    const getFile = async (fileId: string) => {
      const fileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
      const fileResponse = await fetch(fileUrl)
      const fileData = await fileResponse.json()
      
      if (!fileData.ok) {
        throw new Error(`Failed to get file path: ${JSON.stringify(fileData)}`)
      }
      
      return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
    }

    // Function to process and save media
    const processMedia = async (message: TelegramMessage, userId: string) => {
      const mediaItem = message.photo 
        ? message.photo[message.photo.length - 1] 
        : message.video || message.document

      if (!mediaItem) return null

      const downloadUrl = await getFile(mediaItem.file_id)
      const fileContent = await (await fetch(downloadUrl)).arrayBuffer()
      
      const timestamp = Date.now()
      const fileExt = downloadUrl.split('.').pop()?.toLowerCase() || 'unknown'
      const safeFileName = generateSafeFileName(
        `${mediaItem.file_unique_id}_${timestamp}`,
        fileExt
      )

      let mediaType = message.document?.mime_type || 'application/octet-stream'
      if (message.photo) {
        mediaType = 'image/jpeg'
      } else if (message.video) {
        mediaType = 'video/mp4'
      }

      const bucketId = getBucketId()
      const contentType = getContentType(safeFileName, mediaType)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketId)
        .upload(safeFileName, fileContent, {
          contentType,
          upsert: false,
          cacheControl: '3600'
        })

      if (uploadError) throw uploadError

      const publicUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucketId}/${safeFileName}`

      const metadata = {
        file_id: mediaItem.file_id,
        file_unique_id: mediaItem.file_unique_id,
        file_size: mediaItem.file_size,
        message_id: message.message_id,
        content_type: contentType,
        mime_type: mediaType
      }

      const { data: savedMedia, error: dbError } = await supabase
        .from('media')
        .insert({
          user_id: userId,
          chat_id: message.chat.id,
          file_name: safeFileName,
          file_url: publicUrl,
          media_type: mediaType,
          caption: message.caption,
          metadata,
          public_url: publicUrl
        })
        .select()
        .single()

      if (dbError) throw dbError

      return savedMedia
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.split('Bearer ')[1] ?? ''
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const results = []
    const errors = []

    // Process each channel
    for (const channelId of channelIds) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?chat_id=${channelId}&limit=100`
        )
        const data = await response.json()

        if (!data.ok) {
          throw new Error(`Failed to fetch messages: ${JSON.stringify(data)}`)
        }

        // Process each message with media
        for (const update of data.result) {
          const message = update.message || update.channel_post
          if (message && (message.photo || message.video || message.document)) {
            try {
              const result = await processMedia(message, user.id)
              if (result) results.push(result)
            } catch (error) {
              errors.push({
                messageId: message.message_id,
                error: error.message
              })
              await logEvent(
                `Failed to process message ${message.message_id}: ${error.message}`,
                'error'
              )
            }
          }
        }
      } catch (error) {
        errors.push({
          channelId,
          error: error.message
        })
        await logEvent(
          `Failed to process channel ${channelId}: ${error.message}`,
          'error'
        )
      }
    }

    await logEvent(
      `Processed ${results.length} media items with ${errors.length} errors`,
      errors.length > 0 ? 'error' : 'success'
    )

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        errors: errors.length,
        details: { results, errors }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    await supabase.from('edge_function_logs').insert({
      function_name: 'sync-telegram-channel',
      status: 'error',
      message: `Error in sync-telegram-channel: ${error.message}`
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})