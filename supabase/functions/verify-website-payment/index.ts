import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paymentStatus = session.payment_status;
    const userId = session.metadata?.user_id || null;

    console.log("Payment verification:", {
      session_id,
      paymentStatus,
      userId,
      metadata: session.metadata,
    });

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 🟢 If payment is successful AND user exists → SET has_website_access = true
    if (paymentStatus === "paid" && userId) {
      console.log("Setting has_website_access = true for user:", userId);

      const { data, error } = await supabaseService
        .from("profiles")
        .update({
          has_website_access: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select();

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      console.log("Profile updated successfully:", data);

      // Try to increment total spent (won't fail if function doesn't exist)
      try {
        await supabaseService.rpc("increment_total_spent", {
          user_id: userId,
          amount: (session.amount_total ?? 9900) / 100,
        });
        console.log("Total spent incremented");
      } catch (err) {
        console.warn("Could not increment total spent (may not be critical):", err);
      }
    } else if (paymentStatus !== "paid") {
      console.warn("Payment not yet paid:", paymentStatus);
    } else {
      console.warn("No user_id in metadata");
    }

    return new Response(
      JSON.stringify({
        status: paymentStatus,
        claimed: !!userId && paymentStatus === "paid",
        user_id: userId,
        message:
          paymentStatus === "paid"
            ? "Payment verified and access granted"
            : "Payment pending or incomplete",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
