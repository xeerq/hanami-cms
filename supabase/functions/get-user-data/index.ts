import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
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
    
    // Get dataType from query params
    const url = new URL(req.url);
    const dataType = url.searchParams.get("type");
    
    console.log("Request type:", dataType, "User ID:", user.id);

    switch (dataType) {
      case "users": {
        // Check if user is admin using RPC function
        const { data: isAdmin, error: adminError } = await supabaseClient
          .rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
        
        console.log("Admin check result:", isAdmin, adminError);
        
        if (adminError || !isAdmin) {
          throw new Error("Unauthorized: Admin access required");
        }

        // Get all profiles (which represent users)
        const { data: profiles, error: profilesError } = await supabaseClient
          .from("profiles")
          .select("*");
        
        if (profilesError) {
          console.error("Profiles error:", profilesError);
          throw profilesError;
        }

        // Get all user roles
        const { data: userRoles, error: rolesError } = await supabaseClient
          .from("user_roles")
          .select("*");
        
        if (rolesError) {
          console.error("Roles error:", rolesError);
          throw rolesError;
        }

        // Format users data
        const users = profiles?.map(profile => {
          const roles = userRoles?.filter(role => role.user_id === profile.user_id) || [];
          
          return {
            id: profile.user_id,
            email: `${profile.first_name || 'Użytkownik'} ${profile.last_name || ''}`.trim(),
            email_confirmed_at: null,
            created_at: profile.created_at,
            last_sign_in_at: null,
            user_metadata: {
              first_name: profile.first_name,
              last_name: profile.last_name
            },
            is_banned: false,
            roles: roles.map(r => r.role)
          };
        }) || [];

        console.log("Returning users:", users.length);

        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "appointments": {
        // Get user's appointments
        const { data: appointments, error } = await supabaseClient
          .from("appointments")
          .select(`
            *,
            services(name, duration, price),
            therapists(name)
          `)
          .eq("user_id", user.id)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({ appointments }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "orders": {
        // Get user's orders
        const { data: orders, error } = await supabaseClient
          .from("orders")
          .select(`
            *,
            order_items(
              *,
              products(name, image_url)
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ orders }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "profile":
      case null:
      case undefined: {
        // Get user's profile (default behavior)
        const { data: profile, error } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        return new Response(JSON.stringify({ profile, user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Invalid data type requested: ${dataType}`);
    }

  } catch (error) {
    console.error("Error in get-user-data function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});