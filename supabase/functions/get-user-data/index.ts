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
    
    // Get dataType from query params or request body
    const url = new URL(req.url);
    let dataType = url.searchParams.get("type");
    
    // If not in query params, try to get from request body
    if (!dataType && req.method === 'POST') {
      try {
        const body = await req.json();
        dataType = body.type;
        console.log("Parsed dataType from body:", dataType);
      } catch (error) {
        console.log("Failed to parse request body:", error);
        // If body parsing fails, continue with null dataType
      }
    }
    
    console.log("Final dataType:", dataType, "Method:", req.method);

    // Check if user is admin for admin operations using RPC function
    console.log("Checking admin status for user:", user.id);
    
    const { data: isAdminResult, error: adminError } = await supabaseClient
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
    
    console.log("Admin check result:", { isAdminResult, adminError });

    const isAdmin = isAdminResult === true;
    console.log("Final isAdmin result:", isAdmin);

    switch (dataType) {
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

      case "profile": {
        // Get user's profile
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

      case "users": {
        console.log("Processing users request, isAdmin:", isAdmin);
        
        // Admin only: Get all users with profile data
        if (!isAdmin) {
          throw new Error("Unauthorized: Admin access required");
        }

        try {
          // Get users from profiles table instead of auth.users
          const { data: profiles, error: profilesError } = await supabaseClient
            .from("profiles")
            .select(`
              id,
              user_id,
              first_name,
              last_name,
              phone,
              created_at,
              updated_at
            `);
          
          if (profilesError) {
            console.error("Profiles error:", profilesError);
            throw profilesError;
          }

          console.log("Profiles fetched:", profiles?.length);

          // Get user roles
          const { data: userRoles, error: rolesError } = await supabaseClient
            .from("user_roles")
            .select("user_id, role");
          
          if (rolesError) {
            console.error("Roles error:", rolesError);
            throw rolesError;
          }

          // Format users for the frontend (using profiles data)
          const users = profiles?.map(profile => ({
            id: profile.user_id,
            email: "Email not available", // We can't get email from profiles
            email_confirmed_at: null,
            created_at: profile.created_at,
            last_sign_in_at: null,
            user_metadata: {
              first_name: profile.first_name,
              last_name: profile.last_name
            },
            is_banned: false, // We can't check ban status without auth.users access
            roles: userRoles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || []
          })) || [];

          console.log("Users formatted:", users.length);

          return new Response(JSON.stringify({ users }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error in users case:", error);
          throw error;
        }
      }

      case null:
      case undefined: {
        // Default behavior for backwards compatibility - return user profile
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
        console.error("Invalid data type requested. Received:", dataType);
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