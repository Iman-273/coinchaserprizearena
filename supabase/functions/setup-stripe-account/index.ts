import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-STRIPE-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { 
      routing_number, 
      account_number, 
      account_holder_name,
      account_holder_type = "individual" 
    } = await req.json();

    if (!routing_number || !account_number || !account_holder_name) {
      throw new Error("Missing required bank account information");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Stripe Express account for the user
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        email: user.email,
      },
      external_account: {
        object: 'bank_account',
        country: 'US',
        currency: 'usd',
        routing_number: routing_number,
        account_number: account_number,
        account_holder_name: account_holder_name,
        account_holder_type: account_holder_type,
      },
    });

    logStep("Stripe account created", { accountId: account.id });

    // Create account link for user to complete verification
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/profile?refresh=true`,
      return_url: `${req.headers.get("origin")}/profile?setup=complete`,
      type: 'account_onboarding',
    });

    logStep("Account link created", { linkUrl: accountLink.url });

    // Update user profile with Stripe account info
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService
      .from("profiles")
      .update({
        stripe_account_id: account.id,
        stripe_account_verified: false,
        bank_routing_number_last4: routing_number.slice(-4),
        bank_account_last4: account_number.slice(-4),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    logStep("Profile updated with Stripe account info");

    return new Response(JSON.stringify({ 
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in setup-stripe-account", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});