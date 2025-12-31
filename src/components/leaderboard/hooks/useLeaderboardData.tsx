
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeaderboardEntry {
  rank: number;
  username: string;
  full_name?: string;
  best_score: number;
  total_games: number;
  user_id: string;
  tournament_id: string;
  total_distance: number;
}

interface Tournament {
  id: string;
  name: string;
  week_key: string;
  state: string;
  end_date: string;
  first_prize: number;
  second_prize: number;
  third_prize: number;
}

interface GameScore {
  id: string;
  score: number;
  coins_collected: number;
  game_duration: number;
  distance_covered?: number;
  created_at: string;
  game_mode: string;
}

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

interface CurrentUser {
  id: string;
  username: string;
  full_name?: string;
}

export const useLeaderboardData = () => {
  const [tournamentLeaders, setTournamentLeaders] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardEntry[]>([]);
  const [userGameHistory, setUserGameHistory] = useState<GameScore[]>([]);
  const [recentWinners, setRecentWinners] = useState<TournamentWinner[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setCurrentUser(profile);
        if (profile) {
          fetchUserGameHistory(profile.id);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserGameHistory = async (userId?: string) => {
    try {
      const userIdToUse = userId || currentUser?.id;
      if (!userIdToUse) return;

      const { data: gameScores, error } = await supabase
        .from('game_scores')
        .select('*')
        .eq('user_id', userIdToUse)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching user game history:', error);
        setUserGameHistory([]);
      } else {
        setUserGameHistory(gameScores || []);
      }
    } catch (error) {
      console.error('Error in fetchUserGameHistory:', error);
      setUserGameHistory([]);
    }
  };

  const fetchTournamentData = async () => {
    try {
      // Get current tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (tournamentError) {
        console.error('Error fetching tournament:', tournamentError);
        setCurrentTournament(null);
        setTournamentLeaders([]);
        return;
      }
      
      if (!tournament) {
        setCurrentTournament(null);
        setTournamentLeaders([]);
        return;
      }

      setCurrentTournament(tournament);

      if (tournament) {
        // Get tournament participants with their scores
        const { data: participants, error: participantsError } = await supabase
          .from('tournament_participants')
          .select('*')
          .eq('tournament_id', tournament.id);

        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          setTournamentLeaders([]);
          return;
        }

        // Get profiles for participants
        const userIds = participants?.map((p: any) => p.user_id) || [];
        if (userIds.length === 0) {
          setTournamentLeaders([]);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        // Process and create leaderboard entries
        const leaderboardEntries = (participants || []).map((participant: any) => {
          const profile = profileMap.get(participant.user_id);

          return {
            user_id: participant.user_id,
            username: profile?.username || 'Unknown',
            full_name: profile?.full_name || '',
            best_score: participant.best_score || 0,
            total_games: participant.total_games || 0,
            tournament_id: tournament.id,
            total_distance: participant.total_distance || 0,
            rank: 0
          };
        });

        // Sort by best_score and add ranks
        leaderboardEntries.sort((a, b) => b.best_score - a.best_score);
        leaderboardEntries.forEach((entry, index) => {
          entry.rank = index + 1;
        });

        setTournamentLeaders(leaderboardEntries);
      }
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      setTournamentLeaders([]);
    }
  };

  const fetchAllTimeData = async () => {
    try {
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('game_scores')
        .select(`
          score,
          user_id,
          profiles!inner(username, full_name)
        `)
        .eq('game_mode', 'tournament')
        .order('score', { ascending: false })
        .limit(50);

      if (allTimeError) {
        console.error('Error fetching all-time data:', allTimeError);
        setAllTimeLeaders([]);
        return;
      }

      // Process all-time data to get unique users with their best scores
      const userBestScores = new Map();
      allTimeData?.forEach((entry: any) => {
        const userId = entry.user_id;
        if (!userBestScores.has(userId) || userBestScores.get(userId).best_score < entry.score) {
          userBestScores.set(userId, {
            user_id: userId,
            username: entry.profiles.username,
            full_name: entry.profiles.full_name,
            best_score: entry.score, // For all-time, this is the best single game score
            total_distance: Math.floor(entry.score * 10),
            total_games: 1,
            rank: 0,
            tournament_id: ''
          });
        }
      });

      const allTimeArray = Array.from(userBestScores.values())
        .sort((a, b) => b.best_score - a.best_score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setAllTimeLeaders(allTimeArray);
    } catch (error) {
      console.error('Error fetching all-time leaderboard:', error);
      setAllTimeLeaders([]);
    }
  };

  const fetchRecentWinners = async () => {
    try {
      const { data: winners, error } = await supabase
        .from('tournament_winners')
        .select('*')
        .order('awarded_at', { ascending: false })
        .limit(15);

      if (error) {
        console.error('Error fetching recent winners:', error);
        setRecentWinners([]);
        return;
      }

      setRecentWinners(winners || []);
    } catch (error) {
      console.error('Error fetching recent winners:', error);
      setRecentWinners([]);
    }
  };

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTournamentData(),
        fetchAllTimeData(),
        fetchRecentWinners()
      ]);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      toast.error("Failed to load leaderboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchLeaderboardData();
    
    // Set up realtime subscription for live updates
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants'
        },
        () => {
          fetchLeaderboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_scores'
        },
        () => {
          fetchLeaderboardData();
          fetchUserGameHistory();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tournament_winners'
        },
        () => {
          fetchRecentWinners();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (currentTournament) {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const endDate = new Date(currentTournament.end_date).getTime();
        const distance = endDate - now;
        const days = Math.ceil(distance / (1000 * 60 * 60 * 24));
        setDaysLeft(Math.max(0, days));
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000 * 60 * 60);
      return () => clearInterval(interval);
    }
  }, [currentTournament]);

  return {
    tournamentLeaders,
    allTimeLeaders,
    userGameHistory,
    recentWinners,
    currentTournament,
    currentUser,
    loading,
    daysLeft,
    fetchLeaderboardData,
    fetchUserGameHistory
  };
};
