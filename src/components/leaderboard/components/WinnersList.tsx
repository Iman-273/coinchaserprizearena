import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Trophy, Medal, DollarSign } from "lucide-react";

interface TournamentWinner {
  id: string;
  username: string;
  full_name: string;
  position: number;
  final_score: number;
  final_distance: number;
  prize_amount: number;
  tournament_id: string;
  user_id: string;
  profile_id: string;
  awarded_at: string;
  created_at: string;
}

interface WinnersListProps {
  winners: TournamentWinner[];
}

const getPositionIcon = (position: number) => {
  // Use black icons for consistency
  switch (position) {
    case 1:
      return <Crown className="h-5 w-5 text-foreground" />;
    case 2:
      return <Trophy className="h-5 w-5 text-foreground" />;
    case 3:
      return <Medal className="h-5 w-5 text-foreground" />;
    default:
      return null;
  }
};

export const WinnersList = ({ winners }: WinnersListProps) => {
  if (winners.length === 0) {
    return (
      <Card className="bg-card border-2 border-primary rounded-lg shadow-lg">
        <CardContent className="p-8 text-center">
          <Trophy className="h-12 w-12 text-foreground mx-auto mb-4" />
          <p className="text-black text-lg">No tournament winners yet</p>
          <p className="text-black/60 text-sm mt-2">Winners will be announced at the end of each tournament</p>
        </CardContent>
      </Card>
    );
  }

  // Sort winners by awarded_at (most recent first) and position
  const sortedWinners = [...winners].sort((a, b) => {
    const dateCompare = new Date(b.awarded_at).getTime() - new Date(a.awarded_at).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.position - b.position;
  });

  return (
    <div className="space-y-3">
      {sortedWinners.map((winner) => (
        <Card key={winner.id} className="bg-card border-2 border-primary rounded-lg shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center">
                  {getPositionIcon(winner.position)}
                </div>
                <div>
                  <p className="text-black font-bold text-base">
                    {winner.full_name || winner.username}
                  </p>
                  <p className="text-black/60 text-sm">@{winner.username}</p>
                  <p className="text-black/50 text-xs">{new Date(winner.awarded_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-1 text-black font-bold text-lg">
                  <DollarSign className="h-4 w-4 text-foreground" />
                  {winner.prize_amount.toLocaleString()}
                </div>
                <p className="text-black/60 text-sm">{winner.final_score.toLocaleString()} pts</p>
                <p className="text-black/50 text-xs">{winner.final_distance.toLocaleString()}m distance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};