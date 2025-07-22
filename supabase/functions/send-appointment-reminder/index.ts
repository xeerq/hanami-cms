import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    console.log(`Checking appointments for ${tomorrowDate}`);

    // Get appointments for tomorrow that haven't had notifications sent
    const { data: appointments, error: appointmentError } = await supabaseClient
      .from("appointments")
      .select(`
        *,
        profiles(first_name, last_name, phone),
        services(name, duration),
        therapists(name)
      `)
      .eq("appointment_date", tomorrowDate)
      .eq("status", "confirmed")
      .eq("notification_sent", false);

    if (appointmentError) {
      throw appointmentError;
    }

    console.log(`Found ${appointments?.length || 0} appointments to notify`);

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments to notify" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send notifications for each appointment
    for (const appointment of appointments) {
      try {
        if (!appointment.profiles?.phone) {
          console.log(`No phone number for appointment ${appointment.id}`);
          continue;
        }

        // Send SMS via NotificationAPI
        const notificationResponse = await fetch("https://api.notificationapi.com/sender", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${btoa(`${Deno.env.get("NOTIFICATIONAPI_CLIENT_ID")}:${Deno.env.get("NOTIFICATIONAPI_CLIENT_SECRET")}`)}`,
          },
          body: JSON.stringify({
            notificationId: "appointment_reminder",
            user: {
              id: appointment.user_id,
              phone: appointment.profiles.phone,
            },
            mergeTags: {
              firstName: appointment.profiles.first_name || "Klient",
              serviceName: appointment.services.name,
              therapistName: appointment.therapists.name,
              appointmentDate: new Date(appointment.appointment_date).toLocaleDateString('pl-PL'),
              appointmentTime: appointment.appointment_time,
            },
          }),
        });

        if (!notificationResponse.ok) {
          console.error(`Failed to send SMS for appointment ${appointment.id}:`, await notificationResponse.text());
          continue;
        }

        // Mark notification as sent
        const { error: updateError } = await supabaseClient
          .from("appointments")
          .update({ notification_sent: true })
          .eq("id", appointment.id);

        if (updateError) {
          console.error(`Failed to update appointment ${appointment.id}:`, updateError);
        } else {
          console.log(`SMS sent successfully for appointment ${appointment.id}`);
        }

      } catch (error) {
        console.error(`Error processing appointment ${appointment.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Appointment reminders processed",
        processedCount: appointments.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in send-appointment-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});