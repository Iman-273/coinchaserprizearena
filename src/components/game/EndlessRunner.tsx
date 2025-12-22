import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import GameWorld from "./GameWorld";
import { supabase } from "@/integrations/supabase/client";

interface EndlessRunnerProps {
  mode: "free" | "tournament";
  profile: any;
  onExit: () => void;
}

interface GameProgress {
  distance: number;
  balance: number;
  score: number;
  tournamentId?: string;
}

const STORAGE_KEYS = {
  countdownStartAt: 'em.countdownStartAt',
  progress: 'em.progress',
  tournamentProgress: 'em.tournamentProgress',
};

const COUNTDOWN_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const EndlessRunner = ({ mode, profile, onExit }: EndlessRunnerProps) => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [countdownStartAt, setCountdownStartAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(COUNTDOWN_DURATION);
  const [currentTournament, setCurrentTournament] = useState<any>(null);
  const [tournamentLeaders, setTournamentLeaders] = useState<any[]>([]);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load tournament data if in tournament mode
  useEffect(() => {
    if (mode === 'tournament') {
      loadTournamentData();
    }
  }, [mode]);

  // Load saved progress on mount
  useEffect(() => {
    const storageKey = mode === 'tournament' ? STORAGE_KEYS.tournamentProgress : STORAGE_KEYS.progress;
    const savedProgress = localStorage.getItem(storageKey);
    
    if (savedProgress) {
      try {
        const progress: GameProgress = JSON.parse(savedProgress);
        setBalance(progress.balance);
        setDistance(progress.distance);
        setScore(progress.score);
      } catch (e) {
        console.error('Failed to parse saved progress:', e);
      }
    }

    if (mode === 'tournament') {
      const savedCountdownStart = localStorage.getItem(STORAGE_KEYS.countdownStartAt);
      if (savedCountdownStart) {
        setCountdownStartAt(savedCountdownStart);
      } else {
        // Start countdown for first tournament play
        const startTime = new Date().toISOString();
        setCountdownStartAt(startTime);
        localStorage.setItem(STORAGE_KEYS.countdownStartAt, startTime);
      }
    }
  }, [mode]);

  // Countdown timer for tournament mode
  useEffect(() => {
    if (mode === 'tournament' && countdownStartAt) {
      const interval = setInterval(() => {
        const startTime = new Date(countdownStartAt).getTime();
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, COUNTDOWN_DURATION - elapsed);
        setTimeRemaining(remaining);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [mode, countdownStartAt]);

  // Auto-save progress every 10 seconds
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      saveProgress();
    }, 10000);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [balance, distance, score, mode, currentTournament]);

  // Save on unmount
  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [balance, distance, score, mode, currentTournament]);

  const loadTournamentData = async () => {
    try {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setCurrentTournament(tournament);

      if (tournament) {
        // Load top players
        const { data: participants } = await supabase
          .from('tournament_participants')
          .select(`
            user_id,
            best_score,
            profiles!inner(username)
          `)
          .eq('tournament_id', tournament.id)
          .order('best_score', { ascending: false })
          .limit(5);

        setTournamentLeaders(participants || []);
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
    }
  };

  const saveProgress = async () => {
    const storageKey = mode === 'tournament' ? STORAGE_KEYS.tournamentProgress : STORAGE_KEYS.progress;
    const progress: GameProgress = {
      distance,
      balance,
      score,
      tournamentId: currentTournament?.id
    };
    localStorage.setItem(storageKey, JSON.stringify(progress));

    // Save tournament progress to database
    if (mode === 'tournament' && currentTournament && profile) {
      try {
        await supabase.rpc('save_tournament_progress', {
          p_user_id: profile.id,
          p_tournament_id: currentTournament.id,
          p_score: score,
          p_distance: distance,
          p_coins: balance
        });

        // Save game score
        await supabase.from('game_scores').insert({
          user_id: profile.id,
          profile_id: profile.id,
          tournament_id: currentTournament.id,
          score,
          coins_collected: balance,
          distance_covered: distance,
          game_mode: 'tournament',
          game_duration: Math.floor((Date.now() - new Date(countdownStartAt!).getTime()) / 1000)
        });
      } catch (error) {
        console.error('Error saving tournament progress:', error);
      }
    }
  };

  const handleSaveAndExit = async () => {
    await saveProgress();
    toast.success('Progress saved!');
    onExit();
  };

  const handleCoinCollect = (coins: number) => {
    setBalance(prev => prev + coins);
  };

  const handleDistanceUpdate = (dist: number) => {
    setDistance(dist);
  };

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  const formatCountdown = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = timeRemaining === 0 && countdownStartAt !== null;

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900 relative">
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-yellow-400 border-b-4 border-black p-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left: Countdown Timer (Tournament only) */}
          <div className="flex-1 flex items-center">
            {mode === 'tournament' && (
              <div className="bg-black/10 px-4 py-2 rounded-lg">
                <div className="text-xs font-semibold text-gray-900 mb-1">TIME REMAINING</div>
                <div className={`text-xl font-bold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCountdown(timeRemaining)}
                </div>
              </div>
            )}
          </div>
          
          {/* Center: Prize Amount (Tournament only) */}
          {mode === 'tournament' && (
            <div className="flex-1 flex justify-center">
              <div className="bg-black px-6 py-3 rounded-xl border-4 border-black shadow-lg">
                <div className="text-xs font-bold text-yellow-400/80 mb-1 text-center">PRIZES</div>
                <div className="text-2xl font-black text-yellow-400">£100 / £50 / £25</div>
              </div>
            </div>
          )}
          
          {/* Right: Balance and Exit */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="bg-black/10 px-4 py-2 rounded-lg">
              <div className="text-xs font-semibold text-gray-900 mb-1">BALANCE</div>
              <div className="text-xl font-bold text-gray-900">£{balance}</div>
            </div>
            <Button
              onClick={handleSaveAndExit}
              variant="outline"
              size="sm"
              className="bg-black text-yellow-400 border-black hover:bg-black/90 font-bold"
            >
              Save & Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Radar/Scale - Right side (Tournament only) */}
      {mode === 'tournament' && (
        <div className="absolute top-20 right-4 z-20 w-32 bg-yellow-400/90 rounded-lg border-2 border-black p-2">
          <div className="text-xs font-bold text-gray-900 text-center mb-2">TOP PLAYERS</div>
          <div className="space-y-1">
            {tournamentLeaders.slice(0, 5).map((leader: any, idx: number) => (
              <div key={leader.user_id} className="bg-black/20 rounded px-2 py-1 text-xs">
                <div className="flex justify-between text-gray-900">
                  <span className="font-semibold">#{idx + 1}</span>
                  <span className="truncate ml-1">{leader.profiles?.username}</span>
                </div>
                <div className="text-yellow-600 font-bold">{leader.best_score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game stats overlay - Left side */}
      <div className="absolute top-20 left-4 z-20 space-y-2">
        <Card className="bg-black/60 backdrop-blur-sm border-yellow-400">
          <CardContent className="p-2 text-yellow-400">
            <div className="text-xs">Distance</div>
            <div className="text-lg font-bold">{distance}m</div>
          </CardContent>
        </Card>
        
        <Card className="bg-black/60 backdrop-blur-sm border-yellow-400">
          <CardContent className="p-2 text-yellow-400">
            <div className="text-xs">Score</div>
            <div className="text-lg font-bold">{score}</div>
          </CardContent>
        </Card>
      </div>

      <GameWorld
        onGameEnd={() => {}}
        onScoreUpdate={handleScoreUpdate}
        onCoinCollect={handleCoinCollect}
        onDistanceUpdate={handleDistanceUpdate}
      />
    </div>
  );
};
