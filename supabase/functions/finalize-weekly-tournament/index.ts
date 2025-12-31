import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getPKTDay(): number {
  // 0 = Sunday, 1 = Monday ... 6 = Saturday
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  return now.getDay();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const day = getPKTDay();
    console.log("PKT weekday:", day); // 1 = Mon ... 4 = Thu

    /* ===============================
       MONDAY – WEDNESDAY
       ACTIVE (play + join)
    ================================ */
    if (day >= 1 && day <= 3) {
      console.log("Setting tournaments to ACTIVE");

      await supabaseAdmin
        .from("tournaments")
        .update({ state: "ACTIVE" })
        .eq("week_key", getCurrentWeekKey())
        .in("state", ["UPCOMING", "LOCKED"]);
    }

    /* ===============================
       THURSDAY
       LOCKED (play only)
    ================================ */
    if (day === 4) {
      console.log("Locking tournaments (JOIN CLOSED)");

      await supabaseAdmin
        .from("tournaments")
        .update({ state: "LOCKED" })
        .eq("week_key", getCurrentWeekKey())
        .eq("state", "ACTIVE");
    }

    /* ===============================
       FRIDAY – SUNDAY
       EXPIRE + FINALIZE
    ================================ */
    if (day === 5 || day === 6 || day === 0) {
      console.log("Finalizing & expiring tournaments");

      const { data: toExpire } = await supabaseAdmin
        .from("tournaments")
        .select("*")
        .eq("week_key", getCurrentWeekKey())
        .in("state", ["ACTIVE", "LOCKED"]);

      for (const tournament of toExpire || []) {
        // finalize
        await supabaseAdmin.rpc("finalize_tournament", {
          tournament_id: tournament.id,
        });

        // mark expired
        await supabaseAdmin
          .from("tournaments")
          .update({ state: "EXPIRED" })
          .eq("id", tournament.id);

        // notify winners
        const { data: winners } = await supabaseAdmin
          .from("tournament_winners")
          .select("user_id, position, prize_amount")
          .eq("tournament_id", tournament.id)
          .order("position", { ascending: true })
          .limit(3);

        if (winners?.length) {
          const notifications = winners.map((w) => ({
            user_id: w.user_id,
            title: `You placed #${w.position} in ${tournament.name}!`,
            body: `Congratulations — you won £${w.prize_amount}`,
            link: `/tournament/${tournament.id}`,
            created_at: new Date().toISOString(),
            read: false,
          }));

          await supabaseAdmin.from("notifications").insert(notifications);
        }
      }

      // create next week tournament
      await supabaseAdmin.rpc("create_weekly_tournament");
    }

    return new Response(
      JSON.stringify({ success: true, day }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});

/* ===============================
   HELPERS
================================ */

function getCurrentWeekKey() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  const year = now.getFullYear();

  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor(
    (now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000)
  );

  const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  return `${year}-${week}`;
}
