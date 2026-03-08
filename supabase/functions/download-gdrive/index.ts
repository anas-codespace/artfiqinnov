import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractFileId(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // https://drive.google.com/open?id=FILE_ID
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // https://docs.google.com/document/d/FILE_ID/
  match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Raw file ID
  if (/^[a-zA-Z0-9_-]{10,}$/.test(url)) return url;

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driveUrl } = await req.json();
    if (!driveUrl) {
      return new Response(JSON.stringify({ error: 'driveUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileId = extractFileId(driveUrl);
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'Could not extract a file ID from that URL. Make sure the link is a valid Google Drive share link.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the export/download endpoint for publicly shared files
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    
    const response = await fetch(downloadUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Google Drive returned HTTP ${response.status}. Make sure the file is shared publicly (Anyone with the link).` }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Try to get filename from content-disposition header
    let fileName = 'drive_file';
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
      if (match) {
        fileName = decodeURIComponent(match[1]);
      }
    }

    const fileData = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileData)));

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
