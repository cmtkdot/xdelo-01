import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

export const logMessage = async (status: 'info' | 'error' | 'success', message: string) => {
  try {
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'resync-media',
        status,
        message
      });
  } catch (error) {
    console.error('Error logging message:', error);
  }
};