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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Invalid or expired token");
    }

    const user = userData.user;
    const { serviceId, therapistId, appointmentDate, appointmentTime, notes } = await req.json();

    if (!serviceId || !therapistId || !appointmentDate || !appointmentTime) {
      throw new Error("Missing required booking parameters");
    }

    // Check if the time slot is still available
    const { data: existingAppointment } = await supabaseClient
      .from("appointments")
      .select("id")
      .eq("therapist_id", therapistId)
      .eq("appointment_date", appointmentDate)
      .eq("appointment_time", appointmentTime)
      .eq("status", "confirmed")
      .single();

    if (existingAppointment) {
      throw new Error("This time slot is no longer available");
    }

    // Create the appointment
    const { data: appointment, error: insertError } = await supabaseClient
      .from("appointments")
      .insert({
        user_id: user.id,
        service_id: serviceId,
        therapist_id: therapistId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: "confirmed",
        notes: notes || null
      })
      .select(`
        *,
        services(name, duration, price),
        therapists(name)
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log("Appointment created successfully:", appointment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointment,
        message: "Wizyta została zarezerwowana pomyślnie!" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in create-booking function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});