import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email templates
const getConfirmationEmailTemplate = (confirmationUrl: string, firstName?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Potwierdź swoje konto - Hanami Spa</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #d4a574 0%, #e8c5a0 100%); padding: 30px; text-align: center; border-radius: 10px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Witamy w Hanami Spa</h1>
  </div>
  
  <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
    <h2 style="color: #8b5a3c; margin-top: 0;">Potwierdź swoje konto</h2>
    
    ${firstName ? `<p>Witaj ${firstName}!</p>` : '<p>Witaj!</p>'}
    
    <p>Dziękujemy za rejestrację w Hanami Spa. Aby dokończyć proces rejestracji i aktywować swoje konto, kliknij przycisk poniżej:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${confirmationUrl}" 
         style="background: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        Potwierdź konto
      </a>
    </div>
    
    <p>Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:</p>
    <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px; font-family: monospace;">
      ${confirmationUrl}
    </p>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">
      Jeśli nie rejestrowałeś się w Hanami Spa, możesz zignorować ten email.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
    <p>© 2024 Hanami Spa. Wszystkie prawa zastrzeżone.</p>
  </div>
</body>
</html>
`;

const getRecoveryEmailTemplate = (resetUrl: string, firstName?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resetowanie hasła - Hanami Spa</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #d4a574 0%, #e8c5a0 100%); padding: 30px; text-align: center; border-radius: 10px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Resetowanie hasła</h1>
  </div>
  
  <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
    <h2 style="color: #8b5a3c; margin-top: 0;">Zresetuj swoje hasło</h2>
    
    ${firstName ? `<p>Witaj ${firstName}!</p>` : '<p>Witaj!</p>'}
    
    <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w Hanami Spa.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" 
         style="background: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        Zresetuj hasło
      </a>
    </div>
    
    <p>Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:</p>
    <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px; font-family: monospace;">
      ${resetUrl}
    </p>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">
      Link będzie aktywny przez 24 godziny. Jeśli nie prosiłeś o reset hasła, możesz zignorować ten email.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
    <p>© 2024 Hanami Spa. Wszystkie prawa zastrzeżone.</p>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify shared secret to restrict access
    const sharedSecret = Deno.env.get('FUNCTION_SHARED_SECRET');
    const headerSecret = req.headers.get('x-function-secret');
    if (!sharedSecret || headerSecret !== sharedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const payload = await req.json();
    console.log('Auth email webhook payload:', payload);

    const { 
      user, 
      email_data: { 
        token, 
        token_hash, 
        redirect_to, 
        email_action_type,
        site_url 
      } 
    } = payload;

    console.log(`Processing ${email_action_type} email for user: ${user.email}`);

    // Get user profile for personalization
    let firstName = '';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', user.id)
        .single();
      
      firstName = profile?.first_name || '';
    } catch (error) {
      console.log('Could not fetch user profile:', error);
    }

    let subject = '';
    let html = '';
    let actionUrl = '';

    if (email_action_type === 'signup') {
      actionUrl = `${site_url}/auth/confirm?token_hash=${token_hash}&type=signup&redirect_to=${redirect_to || site_url}`;
      subject = 'Potwierdź swoje konto w Hanami Spa';
      html = getConfirmationEmailTemplate(actionUrl, firstName);
    } else if (email_action_type === 'recovery') {
      actionUrl = `${site_url}/auth/reset-password?token_hash=${token_hash}&type=recovery&redirect_to=${redirect_to || site_url}`;
      subject = 'Resetowanie hasła - Hanami Spa';
      html = getRecoveryEmailTemplate(actionUrl, firstName);
    } else {
      throw new Error(`Unsupported email action type: ${email_action_type}`);
    }

    // Send email using our SMTP function with shared-secret header
    const emailResponse = await supabase.functions.invoke('send-email', {
      body: {
        to: user.email,
        subject,
        html,
        type: email_action_type === 'signup' ? 'confirmation' : 'recovery'
      },
      headers: {
        'x-function-secret': Deno.env.get('FUNCTION_SHARED_SECRET') || ''
      }
    });

    if (emailResponse.error) {
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log(`${email_action_type} email sent successfully to: ${user.email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in auth-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process auth email'
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