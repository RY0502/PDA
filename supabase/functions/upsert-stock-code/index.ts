import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
// CORS headers for all origins
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Parse URL
  const url = new URL(req.url);
  // Extract stock code and company name from search parameters
  const stockCode = url.searchParams.get('stockcode');
  // Validate required parameters
  if (!stockCode) {
    return new Response(JSON.stringify({
      error: 'Missing required parameter stockcode'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    // Initialize Supabase client
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Upsert the stock code
    const { data, error } = await supabase.from('stock_code').upsert({
      code: stockCode,
      updatedAt: new Date().toISOString()
    }).select();
    if (error) {
      console.error('Upsert Error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to upsert stock code',
        details: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Successful response
    return new Response(JSON.stringify({
      message: 'Stock code upserted successfully',
      data: data
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Unexpected Error:', err);
    return new Response(JSON.stringify({
      error: 'Unexpected server error',
      details: err.toString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
console.log('Stock Code Upsert Function Initialized');
