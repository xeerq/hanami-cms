
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  type?: 'confirmation' | 'recovery' | 'notification' | 'marketing';
}

// Simple SMTP implementation using native fetch
const sendSMTPEmail = async (to: string, subject: string, html: string, from: string) => {
  const host = Deno.env.get('SMTP_HOST');
  const port = parseInt(Deno.env.get('SMTP_PORT') || '587');
  const user = Deno.env.get('SMTP_USER');
  const password = Deno.env.get('SMTP_PASSWORD');

  console.log('Connecting to SMTP server...');
  
  try {
    // Create connection to SMTP server
    const conn = await Deno.connect({
      hostname: host!,
      port: port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to read response
    const readResponse = async () => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, n || 0));
    };

    // Helper function to send command
    const sendCommand = async (command: string) => {
      console.log('SMTP Command:', command.replace(password || '', '***'));
      await conn.write(encoder.encode(command + '\r\n'));
      const response = await readResponse();
      console.log('SMTP Response:', response);
      return response;
    };

    // SMTP conversation
    await readResponse(); // Welcome message
    await sendCommand('EHLO localhost');
    await sendCommand('STARTTLS');
    
    // Start TLS connection
    const tlsConn = await Deno.startTls(conn, { hostname: host });
    
    // Continue with TLS connection
    const tlsEncoder = new TextEncoder();
    const tlsDecoder = new TextDecoder();
    
    const tlsReadResponse = async () => {
      const buffer = new Uint8Array(1024);
      const n = await tlsConn.read(buffer);
      return tlsDecoder.decode(buffer.subarray(0, n || 0));
    };

    const tlsSendCommand = async (command: string) => {
      console.log('TLS SMTP Command:', command.replace(password || '', '***'));
      await tlsConn.write(tlsEncoder.encode(command + '\r\n'));
      const response = await tlsReadResponse();
      console.log('TLS SMTP Response:', response);
      return response;
    };

    await tlsSendCommand('EHLO localhost');
    await tlsSendCommand('AUTH LOGIN');
    await tlsSendCommand(btoa(user!));
    await tlsSendCommand(btoa(password!));
    await tlsSendCommand(`MAIL FROM:<${user}>`);
    await tlsSendCommand(`RCPT TO:<${to}>`);
    await tlsSendCommand('DATA');
    
    // Email content
    const emailContent = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
      '.'
    ].join('\r\n');
    
    await tlsConn.write(tlsEncoder.encode(emailContent + '\r\n'));
    await tlsReadResponse();
    await tlsSendCommand('QUIT');
    
    tlsConn.close();
    
    console.log('Email sent successfully via native SMTP');
    return true;
    
  } catch (error) {
    console.error('Native SMTP error:', error);
    throw error;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SEND EMAIL FUNCTION START ===');
    console.log('Request method:', req.method);
    
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

    // Send using native SMTP
    const from = Deno.env.get('SMTP_FROM_EMAIL') || 'noreply@hanami-spa.pl';

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

    console.log('Attempting to send email via native SMTP...');
    
    await sendSMTPEmail(to, subject, html, from);

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
