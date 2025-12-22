import { Card, CardContent } from "@/components/ui/card";
import { LeaderboardCard } from "../LeaderboardCard";

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

interface LeaderboardListProps {
  leaders: LeaderboardEntry[];
  showGames?: boolean;
  showDistance?: boolean;
}

export const LeaderboardList = ({ leaders, showGames = false, showDistance = false }: LeaderboardListProps) => (
  <div className="space-y-3">
    {leaders.length === 0 ? (
      <Card className="bg-card border-2 border-primary rounded-lg shadow-lg">
        <CardContent className="p-4 text-center">
          <p className="text-black">No participants yet</p>
          <p className="text-black/60 text-sm">Be the first to join the tournament!</p>
        </CardContent>
      </Card>
    ) : (
      leaders.map((entry) => (
        <LeaderboardCard 
          key={`${entry.rank}-${entry.user_id}`}
          entry={entry}
          showGames={showGames}
          showDistance={showDistance}
        />
      ))
    )}
  </div>
);
