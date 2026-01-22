import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Star, Calendar, Users } from "lucide-react";
import { EndlessRunner } from "./EndlessRunner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string;
  email: string;
  total_coins: number;
  total_winnings: number;
  total_spent: number;
  tournament_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Tournament {
  id: string;
  name: string;
  week_key: string;
  state: "UPCOMING" | "ACTIVE" | "LOCKING" | "PAID_OUT" | "ARCHIVED";
  start_at: string;
  end_date: string;
  join_start_at: string;
  join_end_at: string;
  first_prize: number;
  second_prize: number;
  third_prize: number;
  participants_count?: number;
}

interface GameScreenProps {
  profile: Profile | null;
}

export const GameScreen = ({ profile }: GameScreenProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<"free" | "tournament">("free");

  const [currentTournament, setCurrentTournament] =
    useState<Tournament | null>(null);

  const [daysLeft, setDaysLeft] = useState(0);
  const [canJoin, setCanJoin] = useState(false);
  const [joinWindowEnded, setJoinWindowEnded] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);

  /* ================= FETCH TOURNAMENT ================= */
  useEffect(() => {
    fetchCurrentTournament();
  }, []);

  const fetchCurrentTournament = async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .in("state", ["ACTIVE", "UPCOMING"])
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setCurrentTournament(null);
      return;
    }

    const { count } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", data.id);

    setCurrentTournament({ ...data, participants_count: count || 0 });
  };

  /* ================= CHECK PARTICIPATION ================= */
  useEffect(() => {
    if (!profile || !currentTournament) return;

    const checkParticipant = async () => {
      const { data } = await supabase
        .from("tournament_participants")
        .select("id")
        .eq("tournament_id", currentTournament.id)
        .eq("user_id", profile.id)
        .maybeSingle();

      setIsParticipant(!!data);
    };

    checkParticipant();
  }, [profile?.id, currentTournament?.id]);

  /* ================= JOIN WINDOW / TIMER ================= */
  useEffect(() => {
    if (!currentTournament) return;

    const updateState = () => {
      const now = Date.now();
      const start = new Date(currentTournament.start_at).getTime();
      const end = new Date(currentTournament.end_date).getTime();
      const joinEnd = new Date(currentTournament.join_end_at).getTime();

      setCanJoin(now >= start && now <= joinEnd && !isParticipant);
      setJoinWindowEnded(now > joinEnd);
      setDaysLeft(Math.max(0, Math.ceil((end - now) / 86400000)));
    };

    updateState();
    const timer = setInterval(updateState, 60000);
    return () => clearInterval(timer);
  }, [currentTournament, isParticipant]);

  /* ================= JOIN / START ================= */
  const handleTournamentAction = async () => {
    if (!profile || !currentTournament) return;

    try {
      if (!isParticipant) {
        const { error } = await supabase
          .from("tournament_participants")
          .insert({
            tournament_id: currentTournament.id,
            user_id: profile.id,
          });

        if (error) {
          toast.error("Failed to join tournament");
          return;
        }

        setIsParticipant(true);
        setCurrentTournament(prev =>
          prev
            ? {
                ...prev,
                participants_count: (prev.participants_count || 0) + 1,
              }
            : prev
        );
      }

      setGameMode("tournament");
      setGameStarted(true);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const startFreeGame = () => {
    setGameMode("free");
    setGameStarted(true);
  };

  /* ================= GAME ================= */
  if (gameStarted) {
    return (
      <EndlessRunner
        mode={gameMode}
        profile={profile}
        onExit={() => setGameStarted(false)}
      />
    );
  }

  const canPlayTournament =
    currentTournament && (canJoin || isParticipant);

  /* ================= UI ================= */
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b-2 border-primary">
        <h1 className="text-5xl font-black">Easybucks</h1>
        <p className="font-semibold">Escape hurdles, collect coins, win prizes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-red-600">
          <CardContent className="p-6 text-center text-white">
            <Calendar className="mx-auto mb-2" />
            <p className="text-4xl font-black">{daysLeft}</p>
            <p>Days Left</p>
          </CardContent>
        </Card>

        <Card className="bg-green-600">
          <CardContent className="p-6 text-center text-white">
            <Users className="mx-auto mb-2" />
            <p className="text-4xl font-black">
              {currentTournament?.participants_count || 0}
            </p>
            <p>Players</p>
          </CardContent>
        </Card>
      </div>

      {/* Tournament */}
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2">
            <Star /> Tournament Play
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-semibold">
            {isParticipant
              ? "✓ You're in! Compete Monday–Thursday."
              : joinWindowEnded
              ? "Join window closed."
              : canJoin
              ? "Join now and compete!"
              : "Tournament unavailable"}
          </p>

          <Button
            onClick={handleTournamentAction}
            disabled={!canPlayTournament}
            className="w-full font-black"
          >
            {isParticipant ? "Start Tournament Game" : "Join Tournament"}
          </Button>
        </CardContent>
      </Card>

      {/* Free Play */}
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2">
            <Play /> Free Play
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={startFreeGame} className="w-full font-black">
            Start Free Game
          </Button>
        </CardContent>
      </Card>
 

      {/* Game Rules */}
      <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
          <CardTitle className="text-foreground text-2xl font-black">🎮 How to Play</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          <div className="text-foreground text-base font-semibold space-y-3">
            <div className="flex items-start gap-3 bg-primary/5 p-3 rounded-lg border border-primary">
              <span className="text-lg">⌨️</span>
              <p>Use LEFT/RIGHT arrow keys or swipe left/right to switch lanes</p>
            </div>
            <div className="flex items-start gap-3 bg-primary/5 p-3 rounded-lg border border-primary">
              <span className="text-lg">💰</span>
              <p>Collect golden coins to increase your score (runs)</p>
            </div>
            <div className="flex items-start gap-3 bg-primary/5 p-3 rounded-lg border border-primary">
              <span className="text-lg">🏆</span>
              <p>Tournament: Join Monday–Wednesday, compete until Thursday!</p>
            </div>
            <div className="flex items-start gap-3 bg-primary/5 p-3 rounded-lg border border-primary">
              <span className="text-lg">📊</span>
              <p>Leaderboard: Total runs from ALL games - play more to win!</p>
            </div>
            <div className="flex items-start gap-3 bg-primary/5 p-3 rounded-lg border border-primary">
              <span className="text-lg">💎</span>
              <p>Top 3 winners: £150, £100, £50</p>
            </div>
            <div className="flex items-start gap-3 bg-primary/5 p-3 rounded-lg border border-primary">
              <span className="text-lg">🆓</span>
              <p>Free mode: Practice without affecting rankings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
