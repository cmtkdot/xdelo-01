import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logError(supabase: any, error: any, context: string) {
  console.error(`Error in ${context}:`, error);
  
  await supabase.from('edge_function_logs').insert({
    function_name: 'sync-telegram-channel',
    status: 'error',
    message: `Error in ${context}: ${error.message}`
  });
}

export async function logSuccess(supabase: any, message: string) {
  await supabase.from('edge_function_logs').insert({
    function_name: 'sync-telegram-channel',
    status: 'success',
    message
  });
}

export async function logInfo(supabase: any, message: string) {
  await supabase.from('edge_function_logs').insert({
    function_name: 'sync-telegram-channel',
    status: 'info',
    message
  });
}