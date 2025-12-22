
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, Trophy, Play, Coins, Star, MapPin } from "lucide-react";
import GameWorld from "./GameWorld";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface SkyRunnerGameProps {
  onGameEnd: (score: number, coinsCollected: number, gameTime: number, distance: number) => void;
  profile: Profile | null;
  isTournament: boolean;
}

export const SkyRunnerGame = ({ onGameEnd, profile, isTournament }: SkyRunnerGameProps) => {
  const [score, setScore] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [distance, setDistance] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const gameStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const interval = setInterval(() => {
        setGameTime(Math.floor((Date.now() - gameStartTimeRef.current) / 1000));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameStarted, gameOver]);

  const handleGameStart = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setCoinsCollected(0);
    setDistance(0);
    setGameTime(0);
    gameStartTimeRef.current = Date.now();
  };

  const saveGameScore = async (finalScore: number, coins: number, finalDistance: number, finalTime: number) => {
    if (!profile) return;

    try {
      console.log('Saving game score:', { finalScore, coins, finalDistance, finalTime, isTournament });

      // Get current tournament if playing tournament mode
      let tournamentId = null;
      if (isTournament) {
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('id')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (tournament) {
          tournamentId = tournament.id;
          console.log('Tournament ID:', tournamentId);
        }
      }

      // Save game score to database
      const { error: scoreError } = await supabase
        .from('game_scores')
        .insert({
          user_id: profile.id,
          profile_id: profile.id,
          tournament_id: tournamentId,
          score: finalScore,
          coins_collected: coins,
          game_duration: finalTime,
          distance_covered: finalDistance,
          obstacles_avoided: Math.floor(finalDistance / 50), // Estimate obstacles avoided
          game_mode: isTournament ? 'tournament' : 'free_play'
        });

      if (scoreError) {
        console.error('Error saving game score:', scoreError);
        throw scoreError;
      }

      // Update user's total coins
      const { error: coinsError } = await supabase
        .from('profiles')
        .update({ 
          total_coins: (profile.total_coins || 0) + coins 
        })
        .eq('id', profile.id);

      if (coinsError) {
        console.error('Error updating coins:', coinsError);
        throw coinsError;
      }

      // If tournament mode, update tournament participant stats
      if (isTournament && tournamentId) {
        // Get current best score for this user in this tournament
        const { data: currentParticipant } = await supabase
          .from('tournament_participants')
          .select('total_runs, games_played')
          .eq('tournament_id', tournamentId)
          .eq('user_id', profile.id)
          .single();

        if (currentParticipant) {
          // For tournaments, we don't track "best score" anymore
          // The leaderboard aggregates ALL games via total_runs
          // Just increment games_played
          const newGamesPlayed = (currentParticipant.games_played || 0) + 1;

          const { error: participantError } = await supabase
            .from('tournament_participants')
            .update({
              games_played: newGamesPlayed
            })
            .eq('tournament_id', tournamentId)
            .eq('user_id', profile.id);

          if (participantError) {
            console.error('Error updating tournament participant:', participantError);
            throw participantError;
          }

          console.log('Updated tournament participant - games_played incremented');
        }
      }

      toast.success(`Game saved! Score: ${finalScore}, Distance: ${finalDistance}m, Coins: ${coins}`);
      console.log('Game score saved successfully');
    } catch (error: any) {
      console.error('Error saving game data:', error);
      toast.error("Failed to save game data");
    }
  };

  const handleGameOver = useCallback(async (finalScore: number, coins: number, finalDistance: number) => {
    setGameOver(true);
    setScore(finalScore);
    setCoinsCollected(coins);
    setDistance(finalDistance);
    const finalTime = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    setGameTime(finalTime);

    // Save to database
    await saveGameScore(finalScore, coins, finalDistance, finalTime);
  }, [profile, isTournament]);

  const handleBackToMenu = async () => {
    if (gameOver) {
      onGameEnd(score, coinsCollected, gameTime, distance);
    } else if (gameStarted) {
      // Save current game progress when backing out during gameplay
      const finalTime = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
      await saveGameScore(score, coinsCollected, distance, finalTime);
      setGameStarted(false);
      setGameOver(false);
      onGameEnd(score, coinsCollected, finalTime, distance);
    } else {
      setGameStarted(false);
      setGameOver(false);
    }
  };

  const handleRestart = () => {
    handleGameStart();
  };

  if (!gameStarted) {
    return (
      <div className="p-4 space-y-6 pb-24 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-black">Easybucks</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {isTournament ? "Tournament Mode" : "Free Play Mode"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <Coins className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-black">{profile?.total_coins || 0}</p>
              <p className="text-xs sm:text-sm text-blue-200">Total Coins</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400 mx-auto mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-black">
                {profile?.tournament_active ? "Active" : "Inactive"}
              </p>
              <p className="text-xs sm:text-sm text-blue-200">Tournament</p>
            </CardContent>
          </Card>
        </div>

        {/* Start Game Card */}
        <Card className={`backdrop-blur-sm ${
          isTournament 
            ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30"
            : "bg-gradient-to-r from-green-500/20 to-blue-500/20 border-green-400/30"
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-black text-lg sm:text-xl">
              {isTournament ? <Star className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isTournament ? "Tournament Mode" : "Free Play"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-blue-200 text-sm">
              {isTournament 
                ? "Your score and distance will count toward the tournament leaderboard!"
                : "Practice your skills and collect coins!"
              }
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleGameStart}
                className={`flex-1 font-bold text-sm sm:text-base ${
                  isTournament 
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                Start Game
              </Button>
              <Button 
                onClick={handleBackToMenu}
                variant="outline"
                className="bg-white/10 border-white/20 text-black"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Game Rules */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-black text-base sm:text-lg">🎮 Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-muted-foreground text-xs sm:text-sm space-y-1">
              <p>• Use ← → arrow keys or swipe left/right to switch lanes</p>
              <p>• Collect golden coins for points</p>
              <p>• Avoid all obstacles</p>
              <p>• Cover maximum distance to win tournaments!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="p-4 space-y-6 pb-24 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-black">Game Over!</h1>
          <p className="text-blue-200 text-sm sm:text-base">
            {isTournament ? "Tournament score recorded" : "Good run!"}
          </p>
        </div>

        {/* Score Card */}
        <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border-purple-400/30">
          <CardHeader>
            <CardTitle className="text-black text-center text-lg sm:text-xl">Final Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-3xl sm:text-4xl font-bold text-black">{score}</p>
              <p className="text-blue-200 text-sm sm:text-base">Points</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <p className="text-lg sm:text-2xl font-bold text-yellow-400">{coinsCollected}</p>
                <p className="text-xs sm:text-sm text-yellow-200">Coins</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-green-400">{distance}m</p>
                <p className="text-xs sm:text-sm text-green-200">Distance</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-blue-400">{gameTime}s</p>
                <p className="text-xs sm:text-sm text-blue-200">Time</p>
              </div>
            </div>

            {isTournament && (
              <div className="text-center mt-4 p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                <p className="text-yellow-200 text-sm">
                  🏆 Score saved to tournament leaderboard!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleRestart}
            className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 font-bold text-sm sm:text-base"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Play Again
          </Button>
          <Button 
            onClick={handleBackToMenu}
            variant="outline"
            className="flex-1 bg-white/10 border-white/20 text-black"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900">
      {/* Game HUD */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        <Card className="bg-yellow-400/90 backdrop-blur-sm border-yellow-500/30">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-4 text-black">
              <div className="text-center">
                <p className="text-sm sm:text-lg font-bold">{score}</p>
                <p className="text-xs">Score</p>
              </div>
              <div className="text-center">
                <p className="text-sm sm:text-lg font-bold text-yellow-400">{coinsCollected}</p>
                <p className="text-xs">Coins</p>
              </div>
              <div className="text-center">
                <p className="text-sm sm:text-lg font-bold text-green-400">{distance}m</p>
                <p className="text-xs">Distance</p>
              </div>
              <div className="text-center">
                <p className="text-sm sm:text-lg font-bold text-blue-400">{gameTime}s</p>
                <p className="text-xs">Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Button 
          onClick={handleBackToMenu}
          variant="outline"
          size="sm"
          className="bg-black/50 border-white/20 text-black"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <GameWorld 
        onGameEnd={handleGameOver}
        onScoreUpdate={setScore}
        onCoinCollect={setCoinsCollected}
        onDistanceUpdate={setDistance}
      />
    </div>
  );
};
