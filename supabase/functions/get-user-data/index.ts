import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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
    
    // Get dataType from query params or request body
    let dataType: string | null = null;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      dataType = url.searchParams.get("type");
    } else if (req.method === 'POST') {
      const body = await req.json();
      dataType = body.type;
    }
    
    // Validate dataType
    const allowedTypes = ['users', 'appointments', 'orders', 'profile'];
    if (dataType && !allowedTypes.includes(dataType)) {
      throw new Error(`Invalid data type: ${dataType}`);
    }
    
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

        console.log("About to create service role client");
        
        // Use service role client to bypass RLS for admin operations
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log("Service role client created, fetching profiles...");

        // Get all profiles using admin client
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from("profiles")
          .select("*");
        
        console.log("Profiles result:", { profilesCount: profiles?.length, profilesError });
        
        if (profilesError) {
          console.error("Profiles error:", profilesError);
          throw profilesError;
        }

        // Get all user roles using admin client
        const { data: userRoles, error: rolesError } = await supabaseAdmin
          .from("user_roles")
          .select("*");
        
        console.log("Roles result:", { rolesCount: userRoles?.length, rolesError });
        
        if (rolesError) {
          console.error("Roles error:", rolesError);
          throw rolesError;
        }

        // Get auth users to get real email addresses
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        console.log("Auth users result:", { authUsersCount: authUsers?.users?.length, authError });
        
        if (authError) {
          console.error("Auth error:", authError);
          throw authError;
        }

        // Format users data with real email from auth
        const users = profiles?.map(profile => {
          const roles = userRoles?.filter(role => role.user_id === profile.user_id) || [];
          const authUser = authUsers?.users?.find(au => au.id === profile.user_id);
          
          return {
            id: profile.user_id,
            email: authUser?.email || 'Brak emaila',
            email_confirmed_at: authUser?.email_confirmed_at || null,
            created_at: profile.created_at,
            last_sign_in_at: authUser?.last_sign_in_at || null,
            user_metadata: {
              first_name: profile.first_name,
              last_name: profile.last_name
            },
            phone: profile.phone,
            is_banned: authUser?.banned_until ? new Date(authUser.banned_until) > new Date() : false,
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