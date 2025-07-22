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

    const url = new URL(req.url);
    const dataType = url.searchParams.get("type");

    switch (dataType) {
      case "services": {
        const { data: services, error } = await supabaseClient
          .from("services")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        return new Response(JSON.stringify({ services }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "therapists": {
        const { data: therapists, error } = await supabaseClient
          .from("therapists")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        return new Response(JSON.stringify({ therapists }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "products": {
        const { data: products, error } = await supabaseClient
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        return new Response(JSON.stringify({ products }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "availability": {
        const therapistId = url.searchParams.get("therapist_id");
        const date = url.searchParams.get("date");

        if (!therapistId || !date) {
          throw new Error("Missing therapist_id or date parameter");
        }

        // Get existing appointments for the date
        const { data: appointments, error } = await supabaseClient
          .from("appointments")
          .select("appointment_time, service_id")
          .eq("therapist_id", therapistId)
          .eq("appointment_date", date)
          .eq("status", "confirmed");

        if (error) throw error;

        // Generate available time slots (9:00 - 18:00)
        const allSlots = [
          "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
          "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
          "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
        ];

        // Filter out booked slots
        const bookedTimes = appointments.map(apt => apt.appointment_time);
        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        return new Response(JSON.stringify({ availableSlots }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error("Invalid data type requested");
    }
  } catch (error) {
    console.error("Error in get-data function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});