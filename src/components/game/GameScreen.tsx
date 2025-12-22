import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Trophy, Star, Calendar, Users } from "lucide-react";
import { EndlessRunner } from "./EndlessRunner";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  gender?: string;
  avatar_url?: string;
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
  updateProfile: (profile: Profile) => void;
}

export const GameScreen = ({ profile }: GameScreenProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<"free" | "tournament">("free");
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [canJoin, setCanJoin] = useState(false);
  const [joinWindowEnded, setJoinWindowEnded] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);

  useEffect(() => {
    getCurrentTournament();
  }, []);

  useEffect(() => {
    if (!currentTournament || !profile) return;

    const check = async () => {
      const { data } = await supabase
        .from("tournament_participants")
        .select("id")
        .eq("tournament_id", currentTournament.id)
        .eq("user_id", profile.id)
        .maybeSingle();

      setIsParticipant(!!data);
    };

    check();
  }, [currentTournament?.id, profile?.id]);

  useEffect(() => {
    if (!currentTournament) return;

    const updateCountdown = () => {
      const now = Date.now();
      const end = new Date(currentTournament.end_date).getTime();
      const joinEnd = new Date(currentTournament.join_end_at).getTime();

      const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
      const joinEnded = now > joinEnd;
      const canJoinNow =
        currentTournament.state === "ACTIVE" && !joinEnded && !isParticipant;

      setDaysLeft(prev => (prev !== days ? days : prev));
      setJoinWindowEnded(prev => (prev !== joinEnded ? joinEnded : prev));
      setCanJoin(prev => (prev !== canJoinNow ? canJoinNow : prev));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [currentTournament?.id, isParticipant]);

  const getCurrentTournament = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .in("state", ["ACTIVE", "UPCOMING"])
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data) {
      setCurrentTournament(null);
      return;
    }

    const { count } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", data.id);

    setCurrentTournament({
      ...data,
      participants_count: count || 0,
    });
  };

  const startGame = (mode: "free" | "tournament") => {
    setGameMode(mode);
    setGameStarted(true);
  };

  if (gameStarted) {
    return <EndlessRunner mode={gameMode} profile={profile} onExit={() => setGameStarted(false)} />;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3 pb-4 border-b-2 border-primary">
        <h1 className="text-5xl font-black text-foreground drop-shadow-lg">Easybucks</h1>
        <p className="text-foreground font-semibold text-lg">Escape the hurdles, collect coins, win prizes!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-red-600 border-2 border-red-700 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="bg-red-700/30 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <p className="text-4xl font-black text-white mb-1">{currentTournament ? daysLeft : 0}</p>
            <p className="text-base font-bold text-white">Days Left</p>
            {currentTournament && daysLeft <= 2 && (
              <p className="text-xs bg-red-700/50 rounded px-2 py-1 mt-2 font-semibold text-white">
                Closing Soon!
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-green-600 border-2 border-green-700 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="bg-green-700/30 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
              <Users className="h-7 w-7 text-white" />
            </div>
            <p className="text-4xl font-black text-white mb-1">{currentTournament?.participants_count || 0}</p>
            <p className="text-base font-bold text-white">Players</p>
          </CardContent>
        </Card>
      </div>

      {/* Prize Pool */}
      {currentTournament && (
        <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
            <CardTitle className="flex items-center gap-3 text-2xl font-black text-foreground drop-shadow-md">
              <Trophy className="h-6 w-6" />
              Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="bg-primary px-6 py-4 rounded-lg border-2 border-primary shadow-md">
              <p className="text-5xl font-black text-primary-foreground mb-2">${currentTournament.first_prize}</p>
              <p className="text-lg font-black text-white">🥇 1st Place Winner</p>
            </div>
            <div className="bg-primary/20 border-2 border-primary rounded-lg p-4">
              <p className="text-sm font-semibold text-foreground">
                Tournament resets every Sunday • Winners by highest score
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Play */}
      <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
          <CardTitle className="flex items-center gap-3 text-foreground text-2xl font-black">
            <Star className="h-6 w-6" />
            Tournament Play
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
            <p className="text-foreground text-base font-semibold">
              {isParticipant 
                ? "✓ You're in! 7 days timer. Your total runs count toward the prize!"
                : joinWindowEnded
                ? "Join window closed (Mon-Thu). Come back Monday!"
                : canJoin
                ? "Join now! 7 days timer. Runs from all games count. Top 3 win prizes!"
                : currentTournament?.state === 'UPCOMING'
                ? "Tournament starts Monday! Join: Mon-Thu only"
                : "Tournament not available for joining"
              }
            </p>
          </div>
          <Button 
            onClick={() => startGame("tournament")}
            disabled={!currentTournament || currentTournament.state !== 'ACTIVE'}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/95 border-2 border-primary shadow-lg hover:shadow-xl font-black text-base py-3 h-auto rounded-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {isParticipant ? "Start Tournament Game" : "Join Tournament (50€)"}
          </Button>
          {joinWindowEnded && !isParticipant && (
            <p className="text-xs text-muted-foreground text-center font-semibold">
              Join: Mon 00:00 - Thu 23:59 (Asia/Karachi)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Free Play */}
      <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
          <CardTitle className="flex items-center gap-3 text-foreground text-2xl font-black">
            <Play className="h-6 w-6" />
            Free Play
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
            <p className="text-foreground text-base font-semibold">
              Practice your skills! Free play helps you improve before tournaments.
            </p>
          </div>
          <Button 
            onClick={() => startGame("free")}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/95 border-2 border-primary shadow-lg hover:shadow-xl font-black text-base py-3 h-auto rounded-lg transition-all active:scale-95"
          >
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
              <p>Tournament: 7 days timer - Join Mon-Thu, compete until Sunday!</p>
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
