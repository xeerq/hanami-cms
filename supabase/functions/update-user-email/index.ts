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
    
    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabaseClient
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
    
    if (adminError || !isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get request body
    const { userId, newEmail } = await req.json();
    
    if (!userId || !newEmail) {
      throw new Error("Missing userId or newEmail");
    }

    console.log("Updating email for user:", userId, "to:", newEmail);

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

    console.log("Email updated successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      user: updatedUser 
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