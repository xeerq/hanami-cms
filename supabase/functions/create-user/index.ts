import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
    
    // Check if user is admin or therapist
    const { data: isAdmin, error: adminError } = await supabaseClient
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
    
    const { data: isTherapist, error: therapistError } = await supabaseClient
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'therapist'
      });
    
    if ((adminError && therapistError) || (!isAdmin && !isTherapist)) {
      throw new Error("Unauthorized: Admin or therapist access required");
    }

    const body = await req.json();
    const { email, password, user_metadata, phone, roles = [], sendWelcomeEmail = true } = body;

    if (!email || !password || !user_metadata?.first_name || !user_metadata?.last_name) {
      throw new Error("Missing required fields: email, password, first_name, last_name");
    }

    // Use service role client to create user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Creating user with email:", email);

    // Create user in auth
    const { data: createResult, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata,
      email_confirm: true, // Auto-confirm email for admin-created users
    });

    if (createError) {
      console.error("Auth create error:", createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!createResult.user) {
      throw new Error("User creation failed - no user returned");
    }

    console.log("User created in auth, creating profile...");

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: createResult.user.id,
        first_name: user_metadata.first_name,
        last_name: user_metadata.last_name,
        phone: phone || null
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Don't throw here - user is created, just profile failed
    }

    console.log("Profile created, adding roles...");

    // Add roles if specified
    if (roles.length > 0) {
      const roleInserts = roles.map((role: string) => ({
        user_id: createResult.user.id,
        role: role
      }));

      const { error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .insert(roleInserts);

      if (rolesError) {
        console.error("Roles creation error:", rolesError);
        // Don't throw here - user is created, just roles failed
      }
    }

    console.log("User creation completed successfully");

    // Send welcome email if requested
    if (sendWelcomeEmail) {
      try {
        const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
          body: {
            to: email,
            subject: 'Witaj w naszym systemie!',
            html: `
              <h2>Witaj ${user_metadata.first_name}!</h2>
              <p>Twoje konto zostało utworzone przez administratora.</p>
              <p><strong>Dane logowania:</strong></p>
              <ul>
                <li>Email: ${email}</li>
                <li>Hasło: ${password}</li>
              </ul>
              <p>Ze względów bezpieczeństwa, zalecamy zmianę hasła po pierwszym logowaniu.</p>
              <p>Miłego korzystania z systemu!</p>
            `
          }
        });

        if (emailError) {
          console.error("Email sending error:", emailError);
        }
      } catch (emailError) {
        console.error("Email function error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: createResult.user,
        message: "User created successfully" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});