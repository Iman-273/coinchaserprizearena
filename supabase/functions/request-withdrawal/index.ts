import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount } = await req.json();

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

    // Create withdrawal request using database function
    const { data: withdrawalResult, error: withdrawalError } = await supabaseClient
      .rpc('request_withdrawal', {
        user_id: user.id,
        amount: parseFloat(amount)
      });

    if (withdrawalError) {
      throw new Error(withdrawalError.message);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get user's Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
      // Create Stripe customer if doesn't exist
      const customer = await stripe.customers.create({
        email: user.email,
      });
      customerId = customer.id;
    }

    // Process immediate transfer (in production, you'd queue this)
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: 'usd',
        destination: customerId, // In production, use connected account
      });

      // Update withdrawal status
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseService
        .from("withdrawal_requests")
        .update({ 
          status: 'completed',
          stripe_transfer_id: transfer.id,
          processed_at: new Date().toISOString()
        })
        .eq("id", withdrawalResult);

      // Deduct from user's winnings
      await supabaseService
        .from("profiles")
        .update({ 
          total_winnings: sql`total_winnings - ${parseFloat(amount)}`
        })
        .eq("id", user.id);

      // Add to earnings history
      await supabaseService
        .from("earnings_history")
        .insert({
          user_id: user.id,
          profile_id: user.id,
          amount: -parseFloat(amount),
          type: 'withdrawal',
          description: 'Withdrawal request processed'
        });

    } catch (stripeError) {
      console.error("Stripe transfer failed:", stripeError);
      // Update withdrawal status to failed
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseService
        .from("withdrawal_requests")
        .update({ status: 'rejected', notes: 'Transfer failed' })
        .eq("id", withdrawalResult);

      throw new Error("Transfer failed");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      withdrawal_id: withdrawalResult 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});