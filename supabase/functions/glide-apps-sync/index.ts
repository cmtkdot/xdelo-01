import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './cors.ts';
import { executeTableOperation } from './tableOperations.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableConfig, operation } = await req.json();
    console.log('Processing Glide table operation:', { tableConfig, operation });

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute the table operation
    const result = await executeTableOperation(tableConfig, operation);

    // Log the operation in Supabase
    await supabase
      .from('edge_function_logs')
      .insert({
        function_name: 'glide-apps-sync',
        status: 'success',
        message: `Successfully executed ${operation.type} operation on table ${tableConfig.table}`
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        operation: operation.type
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in Glide apps sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});