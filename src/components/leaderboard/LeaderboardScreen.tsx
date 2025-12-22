
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeaderboardData } from "./hooks/useLeaderboardData";
import { TournamentInfo } from "./components/TournamentInfo";
import { LeaderboardList } from "./components/LeaderboardList";
import { GameHistoryList } from "./components/GameHistoryList";
import { WinnersList } from "./components/WinnersList";

export const LeaderboardScreen = () => {
  const {
    tournamentLeaders,
    allTimeLeaders,
    userGameHistory,
    recentWinners,
    currentTournament,
    loading,
    daysLeft
  } = useLeaderboardData();

  console.log('[LeaderboardScreen] render - loading:', loading, 'tournament:', currentTournament?.id, 'leaders:', tournamentLeaders.length);

  if (loading) {
    console.log('[LeaderboardScreen] still in loading state - showing spinner');
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  console.log('[LeaderboardScreen] content rendered - no longer loading');

  return (
    <div className="p-6 space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl sm:text-5xl font-black text-black">Leaderboard</h1>
        <p className="text-sm sm:text-base text-black/70">See how you rank against other players</p>
        <div className="w-full mt-4 border-t-2 border-primary"></div>
      </div>

      {/* Tournament Information */}
      {currentTournament && (
        <TournamentInfo 
          tournament={currentTournament}
          daysLeft={daysLeft}
          participantCount={tournamentLeaders.length}
        />
      )}

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="tournament" className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-3 mt-4 bg-transparent">
          <TabsTrigger
            value="tournament"
            className="text-black text-xs sm:text-sm px-4 py-2 rounded-full border-2 border-primary bg-transparent hover:shadow-md transition-transform duration-150 transform active:scale-99 data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
          >
            Tournament ({tournamentLeaders.length})
          </TabsTrigger>
          <TabsTrigger
            value="alltime"
            className="text-black text-xs sm:text-sm px-4 py-2 rounded-full border-2 border-primary bg-transparent hover:shadow-md transition-transform duration-150 transform active:scale-99 data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
          >
            All Time ({allTimeLeaders.length})
          </TabsTrigger>
          <TabsTrigger
            value="winners"
            className="text-black text-xs sm:text-sm px-4 py-2 rounded-full border-2 border-primary bg-transparent hover:shadow-md transition-transform duration-150 transform active:scale-99 data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
          >
            Winners ({recentWinners.length})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-black text-xs sm:text-sm px-4 py-2 rounded-full border-2 border-primary bg-transparent hover:shadow-md transition-transform duration-150 transform active:scale-99 data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
          >
            My Games ({userGameHistory.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tournament" className="mt-4">
          <LeaderboardList 
            leaders={tournamentLeaders} 
            showGames={true} 
            showDistance={true} 
          />
        </TabsContent>
        
        <TabsContent value="alltime" className="mt-4">
          <LeaderboardList 
            leaders={allTimeLeaders} 
            showDistance={true} 
          />
        </TabsContent>
        
        <TabsContent value="winners" className="mt-4">
          <WinnersList winners={recentWinners} />
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <GameHistoryList games={userGameHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
