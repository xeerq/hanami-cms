import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'appointment_reminder' | 'appointment_confirmation' | 'marketing' | 'newsletter';
  recipients?: string[]; // specific emails
  user_ids?: string[]; // specific user IDs
  all_users?: boolean; // send to all users
  subject: string;
  message: string;
  appointment_id?: string; // for appointment-related notifications
}

const getNotificationTemplate = (type: string, subject: string, message: string, appointmentDetails?: any) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject} - Hanami Spa</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #d4a574 0%, #e8c5a0 100%); padding: 30px; text-align: center; border-radius: 10px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Hanami Spa</h1>
  </div>
  
  <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
    <h2 style="color: #8b5a3c; margin-top: 0;">${subject}</h2>
    
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      ${message.replace(/\n/g, '<br>')}
    </div>
    
    ${appointmentDetails ? `
      <div style="background: #e8c5a0; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #8b5a3c;">Szczegóły wizyty:</h3>
        <p><strong>Usługa:</strong> ${appointmentDetails.service_name}</p>
        <p><strong>Terapeuta:</strong> ${appointmentDetails.therapist_name}</p>
        <p><strong>Data:</strong> ${appointmentDetails.date}</p>
        <p><strong>Godzina:</strong> ${appointmentDetails.time}</p>
      </div>
    ` : ''}
    
    ${type === 'marketing' || type === 'newsletter' ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/booking" 
           style="background: #d4a574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Zarezerwuj wizytę
        </a>
      </div>
    ` : ''}
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
    <p>© 2024 Hanami Spa. Wszystkie prawa zastrzeżone.</p>
    <p>Jeśli nie chcesz otrzymywać tego typu wiadomości, skontaktuj się z nami.</p>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and require admin role
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin'
    });
    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { 
      type, 
      recipients, 
      user_ids, 
      all_users, 
      subject, 
      message, 
      appointment_id 
    }: NotificationRequest = await req.json();

    console.log(`Processing ${type} notification`);

    let emailList: string[] = [];
    let appointmentDetails = null;

    // Get appointment details if needed
    if (appointment_id) {
      const { data: appointment } = await supabase
        .from('appointments')
        .select(`
          *,
          services(name),
          therapists(name)
        `)
        .eq('id', appointment_id)
        .single();

      if (appointment) {
        appointmentDetails = {
          service_name: appointment.services?.name || 'Nieznana usługa',
          therapist_name: appointment.therapists?.name || 'Nieznany terapeuta',
          date: new Date(appointment.appointment_date).toLocaleDateString('pl-PL'),
          time: appointment.appointment_time
        };
      }
    }

    // Determine recipients
    if (recipients) {
      emailList = recipients;
    } else if (user_ids) {
      // Get emails for specific users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .in('user_id', user_ids);

      if (profiles) {
        const userIds = profiles.map(p => p.user_id);
        // Get emails from auth.users - we'll need to use RPC or handle this differently
        // For now, we'll skip this and use the direct recipients approach
        console.log('User IDs provided but email retrieval from auth.users not implemented');
      }
    } else if (all_users) {
      // Get all user emails - this would require RPC function to access auth.users
      console.log('All users email sending not implemented - requires RPC to access auth.users');
    }

    if (emailList.length === 0) {
      throw new Error('No recipients specified or found');
    }

    const html = getNotificationTemplate(type, subject, message, appointmentDetails);

    // Send emails to all recipients
    const sendPromises = emailList.map(async (email) => {
      try {
        const response = await supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject,
            html,
            type: 'notification'
          },
          headers: {
            'X-Function-Secret': Deno.env.get('FUNCTION_SHARED_SECRET') || ''
          }
        });

        if (response.error) {
          console.error(`Failed to send to ${email}:`, response.error);
          return { email, success: false, error: response.error.message };
        }

        return { email, success: true };
      } catch (error: any) {
        console.error(`Error sending to ${email}:`, error);
        return { email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Notification sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful,
        failed: failed,
        results 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to send notification'
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