import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logError(supabase: any, error: any, context: string) {
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  };
  
  console.error(`Error in ${context}:`, errorDetails);
  
  await supabase.from('edge_function_logs').insert({
    function_name: 'sync-telegram-channel',
    status: 'error',
    message: JSON.stringify(errorDetails)
  });
}

export async function logSuccess(supabase: any, message: string) {
  console.log(`[Success] ${message}`);
  
  await supabase.from('edge_function_logs').insert({
    function_name: 'sync-telegram-channel',
    status: 'success',
    message
  });
}

export async function logInfo(supabase: any, message: string) {
  console.log(`[Info] ${message}`);
  
  await supabase.from('edge_function_logs').insert({
    function_name: 'sync-telegram-channel',
    status: 'info',
    message
  });
}