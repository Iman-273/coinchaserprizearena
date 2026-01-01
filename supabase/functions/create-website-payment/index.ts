import Stripe from "https://esm.sh/stripe@14.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // 🔥 detect frontend dynamically
  const origin =
    req.headers.get("origin") ||
    req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
    "http://localhost:5173";

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": origin,
      },
    });
  }

  try {
    const { email, userId, source } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: Deno.env.get("STRIPE_PRICE_ID")!,
          quantity: 1,
        },
      ],

      success_url: `${origin}/website-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/offer?cancelled=true`,

      ...(email ? { customer_email: email } : {}),

      metadata: {
        source: source || "offer_page",
        flow: "logged_in_payment",
        user_id: userId || null,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Stripe checkout creation failed:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400 }
    );
  }
});

