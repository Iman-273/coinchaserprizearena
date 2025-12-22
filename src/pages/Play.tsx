import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import GameWorld from "@/components/game/GameWorld";

interface GameProgress {
  distance: number;
  rngSeed: number;
  score: number;
  coinsCollected: number;
}

const STORAGE_KEYS = {
  countdownStartAt: 'em.countdownStartAt',
  progress: 'em.progress',
  version: 'em.version'
};

const COUNTDOWN_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const CURRENT_VERSION = '1.0.0';

const Play = () => {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [countdownStartAt, setCountdownStartAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(COUNTDOWN_DURATION);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTimeRef = useRef<number>(0);

  // Load saved progress on mount
  useEffect(() => {
    const savedCountdownStart = localStorage.getItem(STORAGE_KEYS.countdownStartAt);
    const savedProgress = localStorage.getItem(STORAGE_KEYS.progress);
    const savedVersion = localStorage.getItem(STORAGE_KEYS.version);

    if (savedVersion !== CURRENT_VERSION) {
      // Version mismatch, clear old data
      localStorage.removeItem(STORAGE_KEYS.countdownStartAt);
      localStorage.removeItem(STORAGE_KEYS.progress);
      localStorage.setItem(STORAGE_KEYS.version, CURRENT_VERSION);
    } else {
      if (savedCountdownStart) {
        setCountdownStartAt(savedCountdownStart);
      }
      if (savedProgress) {
        try {
          const progress: GameProgress = JSON.parse(savedProgress);
          setCoinsCollected(progress.coinsCollected || 0);
          setDistance(progress.distance);
          setScore(progress.score);
        } catch (e) {
          console.error('Failed to parse saved progress:', e);
        }
      }
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!countdownStartAt) return;

    const interval = setInterval(() => {
      const startTime = new Date(countdownStartAt).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, COUNTDOWN_DURATION - elapsed);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownStartAt]);

  // Auto-save progress every 10 seconds when playing
  useEffect(() => {
    if (gameStarted) {
      saveIntervalRef.current = setInterval(() => {
        saveProgress();
      }, 10000);

      return () => {
        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current);
        }
      };
    }
  }, [gameStarted, coinsCollected, distance, score]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (gameStarted) {
        saveProgress();
      }
    };
  }, [gameStarted, coinsCollected, distance, score]);

  const saveProgress = () => {
    const progress: GameProgress = {
      distance,
      coinsCollected,
      score,
      rngSeed: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
    console.log('Progress saved:', progress);
  };

  const handleStart = () => {
    // Start countdown if not already started
    if (!countdownStartAt) {
      const startTime = new Date().toISOString();
      setCountdownStartAt(startTime);
      localStorage.setItem(STORAGE_KEYS.countdownStartAt, startTime);
    }

    setGameStarted(true);
    gameStartTimeRef.current = Date.now();
  };

  const handleContinue = () => {
    setGameStarted(true);
    gameStartTimeRef.current = Date.now();
    toast.success('Game resumed!');
  };

  const handleSaveAndExit = () => {
    saveProgress();
    setGameStarted(false);
    toast.success('Progress saved!');
    navigate('/');
  };

  const handleCoinCollect = (coins: number) => {
    setCoinsCollected(prev => prev + coins);
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

  if (!gameStarted) {
    const hasSavedProgress = distance > 0 || coinsCollected > 0;

    return (
      <div className="min-h-screen bg-background p-4 sm:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full bg-card border-2 border-border">
          <CardContent className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Easybucks Runner</h1>
              <p className="text-muted-foreground">Collect money and run forever!</p>
            </div>

            {hasSavedProgress && (
              <div className="bg-accent/20 border border-accent p-4 rounded-lg">
                <p className="text-sm font-semibold text-foreground mb-2">Saved Progress:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Coins:</span>
                    <span className="ml-2 font-bold text-foreground">{coinsCollected}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="ml-2 font-bold text-foreground">{distance}m</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {hasSavedProgress ? (
                <Button
                  onClick={handleContinue}
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  Continue Game
                </Button>
              ) : (
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  Start Game
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full border-border text-foreground"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background relative">
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-card border-b-4 border-border p-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left: Countdown Timer */}
          <div className="flex-1 flex items-center">
            <div className="bg-primary/10 px-4 py-2 rounded-lg">
              <div className="text-xs font-semibold text-muted-foreground mb-1">TIME REMAINING</div>
              <div className={`text-xl font-bold ${isExpired ? 'text-red-600' : 'text-foreground'}`}>
                {formatCountdown(timeRemaining)}
              </div>
            </div>
          </div>
          
          {/* Center: Prize Amount */}
            <div className="flex-1 flex justify-center">
            <div className="bg-primary px-6 py-3 rounded-xl border-4 border-border shadow-lg">
              <div className="text-xs font-bold text-white mb-1 text-center">PRIZE</div>
              <div className="text-4xl font-black text-primary-foreground drop-shadow-lg">50€</div>
            </div>
          </div>
          
          {/* Right: Coins and Exit */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="bg-primary/10 px-4 py-2 rounded-lg">
              <div className="text-xs font-semibold text-muted-foreground mb-1">COINS</div>
              <div className="text-xl font-bold text-foreground">{coinsCollected}</div>
            </div>
            <Button
              onClick={handleSaveAndExit}
              size="sm"
              className="font-bold"
            >
              Save & Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Radar/Scale - Right side */}
      <div className="absolute top-20 right-4 z-20 w-12 h-64 bg-card/80 rounded-lg border-2 border-border p-1">
        <div className="h-full bg-primary/20 rounded relative">
          {/* Enemy markers - just visual indicators */}
          <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="absolute top-3/4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Game stats overlay - Left side */}
      <div className="absolute top-20 left-4 z-20 space-y-2">
        <Card className="bg-primary/60 backdrop-blur-sm border-border">
          <CardContent className="p-2 text-primary-foreground">
            <div className="text-xs">Distance</div>
            <div className="text-lg font-bold">{distance}m</div>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/60 backdrop-blur-sm border-border">
          <CardContent className="p-2 text-primary-foreground">
            <div className="text-xs">Score</div>
            <div className="text-lg font-bold">{score}</div>
          </CardContent>
        </Card>
      </div>

      <GameWorld
        onGameEnd={() => {}} // Never ends
        onScoreUpdate={handleScoreUpdate}
        onCoinCollect={handleCoinCollect}
        onDistanceUpdate={handleDistanceUpdate}
      />
    </div>
  );
};

export default Play;
