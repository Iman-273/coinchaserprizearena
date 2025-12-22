import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Starting weekly tournament finalization (Asia/Karachi)...");
    
    const nowPKT = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
    console.log(`Current time PKT: ${nowPKT}`);

    // Activate any UPCOMING tournaments whose start time has passed
    const { error: activateError } = await supabaseAdmin.rpc('activate_tournament');
    if (activateError) {
      console.error('Failed to activate tournaments:', activateError);
    }

    // Get all ACTIVE tournaments that have ended (based on end_date in PKT)
    const { data: expiredTournaments, error: tournamentError } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .eq('state', 'ACTIVE')
      .lt('end_date', new Date().toISOString());

    if (tournamentError) {
      throw new Error(`Failed to fetch expired tournaments: ${tournamentError.message}`);
    }

    console.log(`Found ${expiredTournaments?.length || 0} expired tournaments`);

    // Process each expired tournament
    for (const tournament of expiredTournaments || []) {
      console.log(`Processing tournament: ${tournament.name} (${tournament.id})`);
      
      const { error: finalizeError } = await supabaseAdmin.rpc('finalize_tournament', {
        tournament_id: tournament.id
      });

      if (finalizeError) {
        console.error(`Failed to finalize tournament ${tournament.id}:`, finalizeError);
        continue;
      }

      console.log(`Successfully finalized tournament: ${tournament.name}`);
    }

    // Create next week's tournament if none exists
    const { data: tournamentId, error: createError } = await supabaseAdmin.rpc('create_weekly_tournament');
    
    if (createError) {
      console.error('Failed to create weekly tournament:', createError);
    } else if (tournamentId) {
      console.log(`Created new tournament: ${tournamentId}`);
    } else {
      console.log('Tournament already exists for next week');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${expiredTournaments?.length || 0} tournaments`,
        processed_tournaments: expiredTournaments?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in finalize-weekly-tournament:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});