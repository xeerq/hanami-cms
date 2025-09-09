import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

  // Create Supabase client using the service role key to bypass RLS
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Get request body
    const { items, userId } = await req.json();
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Invalid or empty cart items");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * 100), 0); // Convert to cents

    // Create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "pln",
        product_data: {
          name: item.name,
          description: item.description || "",
          images: item.image_url || item.image ? [item.image_url || item.image] : [],
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: 1,
    }));

    // Check if user exists as Stripe customer (for logged-in users)
    let customerId;
    if (userId) {
      // Get user details from Supabase
      const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
      const userEmail = userData.user?.email;

      if (userEmail) {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/shop`,
      metadata: {
        user_id: userId || "guest",
        items: JSON.stringify(items),
      },
    });

    // Create order record in Supabase
    const { error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: userId,
        items: items,
        total_amount: totalAmount / 100, // Convert back to regular currency
        currency: "pln",
        status: "pending",
        stripe_session_id: session.id,
      });

    if (orderError) {
      console.error("Error creating order:", orderError);
      // Don't throw error here - payment session is more important
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});