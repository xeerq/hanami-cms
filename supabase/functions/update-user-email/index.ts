import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://d74ff47f-eba2-4ad4-bf16-e07271835d3c.sandbox.lovable.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    
    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabaseClient
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
    
    if (adminError || !isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Validate request method
    if (req.method !== 'POST') {
      throw new Error("Method not allowed");
    }

    // Get and validate request body
    const body = await req.json();
    const { userId, newEmail } = body;
    
    if (!userId || !newEmail) {
      throw new Error("Missing required fields: userId and newEmail");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new Error("Invalid email format");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error("Invalid user ID format");
    }

    // Security logging
    console.log(`Admin ${user.id} attempting to update email for user ${userId}`);

    // Use admin client to update user email
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    );

    if (updateError) {
      console.error("Email update error:", updateError);
      throw updateError;
    }

    console.log(`Email successfully updated for user ${userId} by admin ${user.id}`);

    // Log security event
    const { error: logError } = await supabaseAdmin
      .rpc('log_security_event', {
        p_action: 'admin_email_updated',
        p_table_name: 'auth.users', 
        p_record_id: userId,
        p_details: {
          old_email: 'redacted',
          new_email: 'redacted',
          updated_by: user.id,
          timestamp: new Date().toISOString()
        }
      });

    if (logError) {
      console.error("Failed to log security event:", logError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email updated successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in update-user-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});