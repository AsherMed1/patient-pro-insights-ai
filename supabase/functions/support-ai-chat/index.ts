import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a helpful, friendly support assistant for a medical appointment management system called "Insights Portal". 

Your role is to:
1. Answer questions about using the portal (appointments, status updates, analytics, etc.)
2. Help troubleshoot common issues
3. Guide users through features
4. Be concise but thorough in your responses

Key features of the system:
- Appointment management (view, filter, update status)
- Status tracking (Confirmed, Showed, No Show, Cancelled)
- Analytics dashboard with show rates and conversion metrics
- Insurance information management
- Notes and tags for appointments

If you cannot help with something or the user seems frustrated, offer to connect them with a live support agent.
Always be professional, empathetic, and helpful.

Keep responses concise - typically 2-4 sentences unless more detail is needed.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, projectName } = await req.json();
    
    console.log(`[support-ai-chat] Processing request for conversation: ${conversationId}, project: ${projectName}`);
    console.log(`[support-ai-chat] Message count: ${messages?.length || 0}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[support-ai-chat] LOVABLE_API_KEY is not configured');
      throw new Error('AI service not configured');
    }

    // Format messages for the API
    const formattedMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg: any) => ({
        role: msg.role === 'assistant' || msg.role === 'agent' ? 'assistant' : 'user',
        content: msg.content
      }))
    ];

    console.log(`[support-ai-chat] Calling Lovable AI Gateway...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: formattedMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[support-ai-chat] AI Gateway error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

    console.log(`[support-ai-chat] AI response received, length: ${aiResponse.length}`);

    // Detect if user wants live agent
    const lowerResponse = aiResponse.toLowerCase();
    const wantsAgent = 
      lowerResponse.includes('connect you with') ||
      lowerResponse.includes('live agent') ||
      lowerResponse.includes('human representative');

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        wantsAgent,
        conversationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[support-ai-chat] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
