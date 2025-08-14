import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize SMTP client
const client = new SMTPClient({
  connection: {
    hostname: Deno.env.get('SMTP_HOST') || 'localhost',
    port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
    tls: true,
    auth: {
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASSWORD') || '',
    },
  },
});

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
    console.log('=== SEND EMAIL FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Verify shared secret to restrict access to internal callers only
    const sharedSecret = Deno.env.get('FUNCTION_SHARED_SECRET');
    const headerSecret = req.headers.get('x-function-secret');
    
    console.log('Shared secret available:', !!sharedSecret);
    console.log('Header secret available:', !!headerSecret);
    console.log('Secrets match:', sharedSecret === headerSecret);
    
    if (!sharedSecret || headerSecret !== sharedSecret) {
      console.log('UNAUTHORIZED: Secret mismatch');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { to, subject, html, type = 'notification' }: EmailRequest = await req.json();
    
    console.log('Email request details:');
    console.log('- To:', to);
    console.log('- Subject:', subject);
    console.log('- Type:', type);
    console.log('- HTML length:', html?.length || 0);

    console.log(`Sending ${type} email to: ${to}`);

    // Send using SMTP
    const from = Deno.env.get('SMTP_FROM_EMAIL') || 'Hanami Spa <noreply@hanami-spa.pl>';

    console.log('SMTP Configuration:');
    console.log('- Host:', Deno.env.get('SMTP_HOST') || 'NOT SET');
    console.log('- Port:', Deno.env.get('SMTP_PORT') || 'NOT SET');
    console.log('- User:', Deno.env.get('SMTP_USER') || 'NOT SET');
    console.log('- Password set:', !!Deno.env.get('SMTP_PASSWORD'));
    console.log('- From:', from);

    if (!Deno.env.get('SMTP_HOST') || !Deno.env.get('SMTP_USER') || !Deno.env.get('SMTP_PASSWORD')) {
      const missingConfig = [
        !Deno.env.get('SMTP_HOST') && 'SMTP_HOST',
        !Deno.env.get('SMTP_USER') && 'SMTP_USER', 
        !Deno.env.get('SMTP_PASSWORD') && 'SMTP_PASSWORD'
      ].filter(Boolean);
      console.error('Missing SMTP configuration:', missingConfig);
      throw new Error(`Missing SMTP configuration: ${missingConfig.join(', ')}`);
    }

    console.log('Attempting to send email via SMTP...');
    
    await client.send({
      from,
      to,
      subject,
      content: html,
      html,
    });

    console.log(`Email sent successfully to: ${to}`);

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