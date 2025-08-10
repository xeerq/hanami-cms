import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

const createSMTPClient = () => {
  return new SMTPClient({
    connection: {
      hostname: Deno.env.get('SMTP_HOST')!,
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      tls: true,
      auth: {
        username: Deno.env.get('SMTP_USER')!,
        password: Deno.env.get('SMTP_PASSWORD')!,
      },
    },
  });
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, type = 'notification' }: EmailRequest = await req.json();
    
    console.log(`Sending ${type} email to: ${to}`);

    const client = createSMTPClient();
    
    await client.send({
      from: Deno.env.get('SMTP_FROM_EMAIL')!,
      to,
      subject,
      content: html,
      html,
    });

    await client.close();

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