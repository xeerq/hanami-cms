import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') || '');

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  type?: 'confirmation' | 'recovery' | 'notification' | 'marketing';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify shared secret to restrict access to internal callers only
    const sharedSecret = Deno.env.get('FUNCTION_SHARED_SECRET');
    const headerSecret = req.headers.get('x-function-secret');
    if (!sharedSecret || headerSecret !== sharedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { to, subject, html, type = 'notification' }: EmailRequest = await req.json();
    
    console.log(`Sending ${type} email to: ${to}`);

    // Actually send using Resend
    const from = Deno.env.get('SMTP_FROM_EMAIL') || 'Hanami Spa <onboarding@resend.dev>';

    if (!Deno.env.get('RESEND_API_KEY')) {
      throw new Error('Missing RESEND_API_KEY');
    }

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(typeof error === 'string' ? error : (error.message || 'Email send failed'));
    }

    console.log(`Email sent successfully to: ${to}`, data);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);