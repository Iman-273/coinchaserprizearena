import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-WITHDRAWAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Invalid withdrawal amount");
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

    // Get user profile with Stripe account info
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    if (!profile.stripe_account_id) {
      throw new Error("Stripe account not set up. Please add your bank account first.");
    }

    if (profile.total_winnings < amount) {
      throw new Error("Insufficient balance for withdrawal");
    }

    if (amount < 10) {
      throw new Error("Minimum withdrawal amount is $10");
    }

    logStep("Profile validation passed", { 
      stripeAccountId: profile.stripe_account_id,
      totalWinnings: profile.total_winnings 
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check account status
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    
    if (!account.charges_enabled || !account.payouts_enabled) {
      throw new Error("Stripe account verification incomplete. Please complete your account setup.");
    }

    logStep("Stripe account verified", { accountId: account.id });

    // Create withdrawal request first
    const { data: withdrawalResult, error: withdrawalError } = await supabaseClient
      .rpc('request_withdrawal', {
        user_id: user.id,
        amount: parseFloat(amount)
      });

    if (withdrawalError) {
      throw new Error(withdrawalError.message);
    }

    logStep("Withdrawal request created", { withdrawalId: withdrawalResult });

    // Process the transfer to user's account
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: 'usd',
        destination: profile.stripe_account_id,
        description: `Withdrawal for ${user.email}`,
      });

      logStep("Stripe transfer created", { transferId: transfer.id });

      // Calculate expected arrival date (typically 1-2 business days)
      const expectedArrival = new Date();
      expectedArrival.setDate(expectedArrival.getDate() + 2);

      // Update withdrawal status and profile
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Update withdrawal request
      await supabaseService
        .from("withdrawal_requests")
        .update({ 
          status: 'completed',
          stripe_transfer_id: transfer.id,
          processed_at: new Date().toISOString(),
          bank_account_last4: profile.bank_account_last4,
          expected_arrival_date: expectedArrival.toISOString().split('T')[0]
        })
        .eq("id", withdrawalResult);

      // Deduct from user's winnings
      await supabaseService
        .from("profiles")
        .update({ 
          total_winnings: profile.total_winnings - parseFloat(amount),
          updated_at: new Date().toISOString()
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
          description: `Withdrawal processed to account ending in ${profile.bank_account_last4}`
        });

      logStep("Database updated successfully");

      return new Response(JSON.stringify({ 
        success: true,
        withdrawal_id: withdrawalResult,
        transfer_id: transfer.id,
        expected_arrival: expectedArrival.toISOString().split('T')[0],
        amount: parseFloat(amount)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError) {
      logStep("Stripe transfer failed", { error: stripeError.message });

      // Update withdrawal status to failed
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseService
        .from("withdrawal_requests")
        .update({ 
          status: 'rejected', 
          notes: `Transfer failed: ${stripeError.message}` 
        })
        .eq("id", withdrawalResult);

      throw new Error(`Transfer failed: ${stripeError.message}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-withdrawal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});