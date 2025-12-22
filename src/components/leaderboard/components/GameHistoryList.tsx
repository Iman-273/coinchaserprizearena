
import { Card, CardContent } from "@/components/ui/card";

interface GameScore {
  id: string;
  tournament_id?: string;
  score: number;
  coins_collected: number;
  game_duration: number;
  distance_covered?: number;
  created_at: string;
  game_mode: string;
}

interface GameHistoryListProps {
  games: GameScore[];
}

export const GameHistoryList = ({ games }: GameHistoryListProps) => {
  // Group games by tournament
  const groupedGames = games.reduce((acc, game) => {
    const key = game.tournament_id || 'free-play';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(game);
    return acc;
  }, {} as Record<string, GameScore[]>);

  return (
    <div className="space-y-6">
      {Object.keys(groupedGames).length === 0 ? (
        <Card className="bg-card border-2 border-primary rounded-lg shadow-lg">
          <CardContent className="p-4 text-center">
            <p className="text-black">No games played yet</p>
            <p className="text-black/60 text-sm">Start playing to see your game history!</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedGames).map(([tournamentId, tournamentGames]) => (
          <div key={tournamentId}>
            <h4 className="text-black font-medium mb-3">
              {tournamentId === 'free-play' ? 'Free Play Games' : 'Tournament Games'}
            </h4>
            <div className="space-y-3">
              {tournamentGames.map((game, index) => (
                <Card key={game.id} className="bg-card border-2 border-primary rounded-lg shadow-lg">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10">
                          <span className="text-black font-bold">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-bold text-black text-sm sm:text-base">
                            {game.game_mode === 'tournament' ? 'Tournament' : 'Free Play'}
                          </p>
                          <p className="text-xs sm:text-sm text-black/60">
                            {new Date(game.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg sm:text-2xl font-bold text-black">{game.score.toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-black/60">score</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="text-center">
                            <p className="text-xs text-yellow-400">{game.coins_collected || 0}</p>
                            <p className="text-xs text-black/60">coins</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-black/70">{Math.floor((game.distance_covered || game.score / 10))}m</p>
                            <p className="text-xs text-black/60">distance</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-black/70">{game.game_duration || 0}s</p>
                            <p className="text-xs text-black/60">time</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
