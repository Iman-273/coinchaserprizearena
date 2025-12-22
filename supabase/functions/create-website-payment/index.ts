
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
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
    console.log("Create website payment function called");
    
    // Get the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header provided");
    }

    console.log("Authorization header found");

    // Create Supabase client with anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error("User authentication error:", userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      console.error("No authenticated user found");
      throw new Error("User not authenticated");
    }

    if (!user.email) {
      console.error("User has no email address");
      throw new Error("User email not available");
    }

    console.log("User authenticated successfully:", user.email);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      throw new Error("Stripe configuration missing");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log("Stripe initialized, checking for existing customer");

    // Create a Stripe customer if one doesn't exist
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    } else {
      console.log("Creating new customer for:", user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log("Created new customer:", customerId);
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "https://guzchhozqqqcijqisbbb.supabase.co";
    console.log("Using origin for redirects:", origin);

    // Create checkout session
    console.log("Creating Stripe checkout session");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Sky Runner Platform Access",
              description: "One-time payment for lifetime platform access",
            },
            unit_amount: 9900, // £99.00 in pence
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/website-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
      },
    });

    console.log("Checkout session created:", session.id);

    // Create Supabase service client for inserting payment record
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Record the payment attempt
    console.log("Recording payment attempt in database");
    const { error: insertError } = await supabaseService.from("payments").insert({
      user_id: user.id,
      amount: 99.00,
      currency: "gbp",
      status: "pending",
      stripe_payment_intent_id: session.id,
    });

    if (insertError) {
      console.error("Failed to record payment:", insertError);
      // Don't throw here as the payment session was created successfully
    } else {
      console.log("Payment recorded successfully");
    }

    console.log("Returning checkout URL:", session.url);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create payment session" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
