import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractFileId(url: string): string | null {
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(url)) return url;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { driveUrl } = await req.json();
    if (!driveUrl) {
      return new Response(JSON.stringify({ error: 'driveUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileId = extractFileId(driveUrl);
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'Could not extract a file ID from that URL.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    
    const response = await fetch(downloadUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Google Drive returned HTTP ${response.status}. Make sure the file is shared publicly.` }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    let fileName = 'drive_file';
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
      if (match) {
        fileName = decodeURIComponent(match[1]);
      }
    }

    const fileData = new Uint8Array(await response.arrayBuffer());
    const base64 = base64Encode(fileData);

    return new Response(JSON.stringify({
      base64,
      contentType,
      fileName,
      size: fileData.byteLength,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error downloading from Google Drive:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
