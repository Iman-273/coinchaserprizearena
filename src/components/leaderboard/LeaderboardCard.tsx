
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Medal, Star, MapPin } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  username: string;
  full_name?: string;
  total_runs: number;
  total_games: number;
  user_id: string;
  tournament_id: string;
  max_distance_covered?: number;
  total_distance_covered?: number;
}

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  showGames?: boolean;
  showDistance?: boolean;
}

export const LeaderboardCard = ({ entry, showGames = false, showDistance = false }: LeaderboardCardProps) => {
  const getRankIcon = (rank: number) => {
    // Use black/foreground icons for consistency with theme
    return <>{/* placeholder to satisfy jsx expression below */}</>;
  };

  const getRankBg = (_rank: number) => {
    return "bg-card border-2 border-primary rounded-lg shadow-lg";
  };

  return (
    <Card className={`${getRankBg(entry.rank)}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex-shrink-0">
              {entry.rank === 1 ? <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" /> :
               entry.rank === 2 ? <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" /> :
               entry.rank === 3 ? <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" /> :
               <Star className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-black text-sm sm:text-base">#{entry.rank}</p>
              <p className="text-xs sm:text-sm text-black/60 truncate">{entry.username}</p>
              {entry.full_name && (
                <p className="text-xs text-black/50 truncate">{entry.full_name}</p>
              )}
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <p className="text-lg sm:text-2xl font-bold text-black">{entry.total_runs.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-black/60">total runs</p>
            
            {showDistance && entry.max_distance_covered && (
              <div className="flex items-center justify-end gap-1 mt-1">
                <MapPin className="h-3 w-3 text-foreground" />
                <p className="text-xs text-black/60">{entry.max_distance_covered}m</p>
              </div>
            )}
            
            {showGames && (
              <p className="text-xs text-blue-300">{entry.total_games} games</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
