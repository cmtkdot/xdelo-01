import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, channel_id, sync_type } = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    switch (action) {
      case 'sync':
        // Create sync log entry
        const { data: syncLog, error: syncError } = await supabase
          .from('sync_logs')
          .insert({
            user_id: user.id,
            channel_id,
            sync_type,
            status: 'in_progress',
            progress: 0
          })
          .select()
          .single();

        if (syncError) throw syncError;

        // Start sync process
        const { data: channel } = await supabase
          .from('telegram_channels')
          .select('*')
          .eq('id', channel_id)
          .single();

        if (!channel) {
          throw new Error('Channel not found');
        }

        try {
          // Call Telegram API to get channel messages
          const response = await fetch(
            `https://api.telegram.org/bot${channel.bot_token}/getUpdates?chat_id=${channel.channel_id}&limit=100`
          );

          if (!response.ok) {
            throw new Error('Failed to fetch messages from Telegram');
          }

          const data = await response.json();
          
          // Process messages with media
          let processedCount = 0;
          const totalMessages = data.result.length;

          for (const update of data.result) {
            const message = update.message || update.channel_post;
            if (message && (message.photo || message.video || message.document)) {
              try {
                // Process media message
                const mediaType = message.photo ? 'photo' : message.video ? 'video' : 'document';
                const mediaItem = message.photo ? message.photo.slice(-1)[0] : message.video || message.document;

                // Get file path
                const fileResponse = await fetch(
                  `https://api.telegram.org/bot${channel.bot_token}/getFile?file_id=${mediaItem.file_id}`
                );
                const fileData = await fileResponse.json();

                if (!fileData.ok) {
                  throw new Error('Failed to get file path');
                }

                const filePath = fileData.result.file_path;
                const fileName = `${message.message_id}_${Date.now()}.${filePath.split('.').pop()}`;

                // Update sync progress
                processedCount++;
                await supabase
                  .from('sync_logs')
                  .update({
                    progress: Math.round((processedCount / totalMessages) * 100),
                    details: { processed: processedCount, total: totalMessages }
                  })
                  .eq('id', syncLog.id);

                // Insert media record
                await supabase.from('media').insert({
                  user_id: user.id,
                  chat_id: parseInt(channel.channel_id),
                  file_name: fileName,
                  file_url: `https://api.telegram.org/file/bot${channel.bot_token}/${filePath}`,
                  media_type: mediaType,
                  caption: message.caption,
                  metadata: {
                    message_id: message.message_id,
                    file_id: mediaItem.file_id,
                    media_group_id: message.media_group_id
                  }
                });
              } catch (error) {
                console.error('Error processing message:', error);
              }
            }
          }

          // Update sync status
          await supabase
            .from('sync_logs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              progress: 100
            })
            .eq('id', syncLog.id);

          // Update channel last sync
          await supabase
            .from('telegram_channels')
            .update({
              last_sync_at: new Date().toISOString(),
              sync_status: { last_sync: 'success' }
            })
            .eq('id', channel_id);

        } catch (error) {
          // Update sync log with error
          await supabase
            .from('sync_logs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', syncLog.id);

          throw error;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});