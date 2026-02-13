import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    console.time('total-execution');
    try {
        console.log('TTS Request received');
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const body = await req.json();
        console.log('Request body:', JSON.stringify(body));
        const { text, voice = 'alloy', speed = 1.0 } = body;

        if (!text) {
            return new Response(JSON.stringify({ error: 'Text is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Generate a cache key based on text, voice, and speed
        const inputStr = `${text}_${voice}_${speed}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(inputStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const cacheKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const fileName = `${cacheKey}.mp3`;

        console.log('Checking cache for:', fileName);

        // Check if the file already exists in storage
        const { data: existingFile, error: storageError } = await supabaseClient
            .storage
            .from('document-audio')
            .download(fileName);

        if (existingFile && !storageError) {
            console.log('Cache hit! Returning stored audio.');
            console.timeEnd('total-execution');
            return new Response(existingFile, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'audio/mpeg',
                    'X-Cache': 'HIT'
                },
            });
        }

        console.log('Cache miss. Fetching from OpenAI...');

        // Get OpenAI API Key from ai_config
        const { data: config, error: configError } = await supabaseClient
            .from('ai_config')
            .select('api_key')
            .eq('mode', 'ai')
            .eq('provider', 'openai')
            .single();

        if (configError || !config?.api_key) {
            console.error('Config error:', configError);
            return new Response(JSON.stringify({ error: 'OpenAI API key not found' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.time('openai-fetch');
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice,
                speed: speed,
            }),
        });
        console.timeEnd('openai-fetch');

        if (!response.ok) {
            const errorData = await response.json();
            return new Response(JSON.stringify({ error: 'OpenAI API error', details: errorData }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const audioBuffer = await response.arrayBuffer();

        // Upload to storage for future use (fire and forget slightly but await for safety)
        console.log('Caching audio to storage...');
        const { error: uploadError } = await supabaseClient
            .storage
            .from('document-audio')
            .upload(fileName, audioBuffer, {
                contentType: 'audio/mpeg',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('Failed to cache audio:', uploadError);
        }

        return new Response(audioBuffer, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'audio/mpeg',
                'X-Cache': 'MISS'
            },
        });

    } catch (error) {
        console.error('Catch error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } finally {
        console.timeEnd('total-execution');
    }
});
