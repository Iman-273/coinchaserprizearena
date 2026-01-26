import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 🔥 detect frontend dynamically (SAME AS STRIPE)
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
    const { email, type, token } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    let subject = "";
    let html = "";

    if (type === "verify") {
      subject = "Verify your Game Coin account";
      html = `
        <h2>Welcome to Game Coin 🎮</h2>
        <p>Please verify your email:</p>
        <a href="${origin}/verify?token=${token}">
          Verify Email
        </a>
      `;
    }

    if (type === "reset") {
      subject = "Reset your Game Coin password";
      html = `
        <h2>Password Reset</h2>
        <p>Click below to reset password:</p>
        <a href="${origin}/reset-password?token=${token}">
          Reset Password
        </a>
      `;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Game Coin <no-reply@yourdomain.com>",
        to: email,
        subject,
        html,
      }),
    });

    const data = await resendResponse.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Email send failed:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400 }
    );
  }
});
