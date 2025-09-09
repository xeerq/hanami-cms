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

  // Create Supabase client using the service role key
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { sessionId, userId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    // Get order details from session ID
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Update order status to paid
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    if (updateError) {
      throw new Error("Failed to update order status");
    }

    // Process voucher purchases from the order items
    const voucherItems = order.items.filter((item: any) => item.category === "Bony");
    
    for (const voucher of voucherItems) {
      // Generate voucher code
      const { data: codeData, error: codeError } = await supabaseClient
        .rpc('generate_voucher_code');

      if (codeError) {
        console.error('Error generating voucher code:', codeError);
        continue;
      }

      // Create voucher record
      const voucherData = {
        code: codeData,
        voucher_type: voucher.type,
        user_id: userId || order.user_id,
        service_id: voucher.service_id || null,
        original_value: voucher.type === 'single' && voucher.value ? voucher.value : null,
        remaining_value: voucher.type === 'single' && voucher.value ? voucher.value : null,
        original_sessions: voucher.type === 'package' ? voucher.sessions : 1,
        remaining_sessions: voucher.type === 'package' ? voucher.sessions : 1,
        status: 'active',
        created_by: userId || order.user_id,
        expires_at: voucher.type === 'single' && voucher.value ? 
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : // 1 year from now
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()   // 6 months for packages
      };

      const { error: voucherError } = await supabaseClient
        .from('vouchers')
        .insert(voucherData);

      if (voucherError) {
        console.error('Error creating voucher:', voucherError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Payment processed successfully",
      vouchersCreated: voucherItems.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing voucher purchase:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});