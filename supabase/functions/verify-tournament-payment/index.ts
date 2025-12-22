
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
    const { session_id } = await req.json();

    // Initialize Stripe with your secret key
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      // Create Supabase service client
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const tournament_id = session.metadata?.tournament_id;
      const user_id = session.metadata?.user_id;

      if (tournament_id && user_id) {
        // Update payment status
        await supabaseService
          .from("payments")
          .update({ status: "succeeded" })
          .eq("stripe_payment_intent_id", session_id);

        // Add user to tournament
        await supabaseService
          .from("tournament_participants")
          .upsert({
            tournament_id,
            user_id,
            profile_id: user_id,
            entry_payment_id: session_id,
          });

        // Update profile tournament status
        await supabaseService
          .from("profiles")
          .update({ tournament_active: true })
          .eq("id", user_id);

        // Update user's total spent
        await supabaseService.rpc("increment_total_spent", {
          user_id,
          amount: session.amount_total! / 100, // Convert cents to dollars
        });
      }
    }

    return new Response(JSON.stringify({ 
      status: session.payment_status,
      user_id: session.metadata?.user_id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
