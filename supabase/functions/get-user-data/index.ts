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

    // Check if user is admin for admin operations
    const { data: userRoles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some(role => role.role === 'admin') || false;

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
        
        // Admin only: Get all users with auth data
        if (!isAdmin) {
          throw new Error("Unauthorized: Admin access required");
        }

        // Check if SERVICE_ROLE_KEY is available
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        console.log("SERVICE_ROLE_KEY available:", serviceRoleKey ? "Yes" : "No");
        
        if (!serviceRoleKey) {
          throw new Error("SERVICE_ROLE_KEY not configured");
        }

        // Use Supabase admin client to get auth users
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          serviceRoleKey
        );

        console.log("Calling auth.admin.listUsers()");
        
        try {
          const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
          
          console.log("Auth users response:", { 
            success: !authError, 
            authUsersCount: authUsers?.users?.length, 
            authError: authError?.message 
          });
          
          if (authError) {
            console.error("Auth error details:", authError);
            throw new Error(`Auth API error: ${authError.message}`);
          }

          if (!authUsers || !authUsers.users) {
            throw new Error("No users data returned from auth API");
          }

          // Format users for the frontend
          const users = authUsers.users.map(authUser => ({
            id: authUser.id,
            email: authUser.email,
            email_confirmed_at: authUser.email_confirmed_at,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at,
            user_metadata: authUser.user_metadata,
            is_banned: authUser.banned_until ? new Date(authUser.banned_until) > new Date() : false
          }));

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