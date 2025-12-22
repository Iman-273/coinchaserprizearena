
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, DollarSign, Calendar, Users, Trophy, Star, CreditCard } from "lucide-react";
import { toast } from "sonner";
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
  premium_access?: boolean;
  premium_purchased_at?: string;
  created_at: string;
  updated_at: string;
}

interface Tournament {
  id: string;
  name: string;
  week_key?: string;
  state?: string;
  entry_fee: number;
  end_date: string;
  first_prize: number;
  second_prize: number;
  third_prize: number;
}

interface TournamentScreenProps {
  profile: Profile | null;
  updateProfile: (profile: Profile) => void;
}

export const TournamentScreen = ({ profile, updateProfile }: TournamentScreenProps) => {
  const [loading, setLoading] = useState(false);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [gameHistory, setGameHistory] = useState<any[]>([]);

  useEffect(() => {
    getCurrentTournament();
    if (profile) {
      getGameHistory();
    }
  }, [profile]);

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
      const interval = setInterval(updateCountdown, 1000 * 60 * 60); // Update every hour
      return () => clearInterval(interval);
    }
  }, [currentTournament]);

  const getCurrentTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setCurrentTournament(data);
    } catch (error: any) {
      console.error('Error fetching tournament:', error);
    }
  };

  const getGameHistory = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .eq('user_id', profile.id)
        .eq('game_mode', 'tournament')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGameHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching game history:', error);
    }
  };

  const handleJoinTournament = async () => {
    if (!profile || !currentTournament) return;

    // Check if user has premium access first
    if (!profile.premium_access) {
      toast.error("You need to purchase platform access (£99) first to join tournaments!");
      return;
    }

    setLoading(true);
    
    try {
      console.log("Starting tournament payment process...");
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error("Please sign in to continue with payment");
        setLoading(false);
        return;
      }

      // Call Stripe payment function for £2 tournament entry
      const { data, error } = await supabase.functions.invoke('create-tournament-payment', {
        body: { 
          tournament_id: currentTournament.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        if (error.message?.includes('User not authenticated')) {
          toast.error("Authentication expired. Please sign in again.");
        } else {
          toast.error(`Payment error: ${error.message}`);
        }
        return;
      }

      console.log("Tournament payment response:", data);

      if (data?.url) {
        console.log("Redirecting to Stripe checkout:", data.url);
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        toast.success("Redirecting to payment...");
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Failed to initiate payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = () => {
    toast.info("Billing management will be available soon!");
  };

  // Check if user can play tournament
  const canPlayTournament = async () => {
    if (!profile) return false;
    
    try {
      const { data, error } = await supabase.rpc('can_play_tournament', {
        user_id: profile.id
      });
      
      if (error) {
        console.error('Error checking tournament access:', error);
        return false;
      }
      
      return data;
    } catch (error) {
      console.error('Error checking tournament access:', error);
      return false;
    }
  };

  // Show platform access required message if user doesn't have premium
  if (!profile?.premium_access) {
    return (
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3 pb-4 border-b-2 border-primary">
          <h1 className="text-5xl font-black text-foreground drop-shadow-lg">Monthly Tournament</h1>
          <p className="text-foreground font-semibold text-lg">Compete for real cash prizes every month</p>
        </div>

        {/* Platform Access Required */}
        <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
            <CardTitle className="text-foreground flex items-center gap-3 text-2xl font-black">
              <Crown className="h-6 w-6" />
              Platform Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <p className="text-foreground font-semibold mb-4">
                You need to purchase platform access to join tournaments.
              </p>
              <div className="bg-primary px-6 py-4 rounded-lg border-2 border-primary shadow-md mb-4">
                <p className="text-4xl font-black text-primary-foreground mb-2">£99</p>
                <p className="text-white font-semibold">Lifetime Access</p>
              </div>
              <p className="text-muted-foreground font-semibold">
                Then £2 to join each monthly tournament
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
            <CardTitle className="text-foreground flex items-center gap-3 text-2xl font-black">
              <Star className="h-6 w-6" />
              How Monthly Tournament Works
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-primary/10 p-4 rounded-lg border border-primary">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-black flex-shrink-0">1</div>
                <div>
                  <p className="text-foreground font-black">Purchase Platform Access - £99</p>
                  <p className="text-muted-foreground text-sm">One-time payment for lifetime platform access</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-primary/10 p-4 rounded-lg border border-primary">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-black flex-shrink-0">2</div>
                <div>
                  <p className="text-foreground font-black">Join Monthly Tournament - £2</p>
                  <p className="text-muted-foreground text-sm">Pay £2 anytime during the month to participate</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-primary/10 p-4 rounded-lg border border-primary">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-black flex-shrink-0">3</div>
                <div>
                  <p className="text-foreground font-black">Compete All Month</p>
                  <p className="text-muted-foreground text-sm">Play unlimited games throughout the month</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-primary/10 p-4 rounded-lg border border-primary">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-black flex-shrink-0">4</div>
                <div>
                  <p className="text-foreground font-black">Winners Announced</p>
                  <p className="text-muted-foreground text-sm">Every Sunday night - New tournament starts Monday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3 pb-4 border-b-2 border-primary">
        <h1 className="text-5xl font-black text-foreground drop-shadow-lg">Monthly Tournament</h1>
        <p className="text-foreground font-semibold text-lg">Compete for real cash prizes every month</p>
      </div>

      {/* Premium Status Banner */}
      <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-3 text-foreground mb-3">
            <Crown className="h-7 w-7 drop-shadow-md" />
            <span className="font-black text-2xl">PREMIUM MEMBER</span>
          </div>
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
            <p className="text-foreground font-semibold">
              ✓ Platform access active! Pay £2 to join this month's tournament.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Countdown */}
      {currentTournament && (
        <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="bg-primary/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <p className="text-5xl font-black text-foreground mb-2">{daysLeft}</p>
            <p className="text-lg font-black text-foreground">Days Until Tournament Ends</p>
            <p className="text-muted-foreground font-semibold mt-2">Winners announced Sunday night</p>
          </CardContent>
        </Card>
      )}

      {/* Tournament Status */}
      <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
          <CardTitle className="text-foreground flex items-center gap-3 text-2xl font-black">
            <Crown className="h-6 w-6" />
            This Month's Tournament Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center">
            <div className={`inline-block px-6 py-3 rounded-full font-black text-lg mb-3 ${
              profile?.tournament_active 
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}>
              {profile?.tournament_active ? "✓ JOINED" : "NOT JOINED"}
            </div>
            <p className="text-foreground font-semibold text-lg">
              {profile?.tournament_active 
                ? "You're competing in this month's tournament!"
                : "Pay £2 to join this month's tournament"
              }
            </p>
          </div>
          
          {!profile?.tournament_active && currentTournament && (
            <Button 
              onClick={handleJoinTournament}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95 border-2 border-primary shadow-lg hover:shadow-xl font-black text-base py-3 h-auto rounded-lg transition-all active:scale-95"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {loading ? "Processing..." : `Join This Month's Tournament - £${currentTournament.entry_fee}`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Current Month Prizes */}
      {currentTournament && (
        <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
            <CardTitle className="text-foreground flex items-center gap-3 text-2xl font-black">
              <Trophy className="h-6 w-6" />
              This Month's Prizes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-primary/10 p-4 rounded-lg border border-primary">
                  <div className="bg-primary rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary-foreground font-black text-lg">🥇</span>
                  </div>
                  <p className="text-3xl font-black text-foreground">£{currentTournament.first_prize}</p>
                  <p className="text-sm font-black text-muted-foreground mt-2">1st Place</p>
                </div>
                <div className="text-center bg-primary/10 p-4 rounded-lg border border-primary">
                  <div className="bg-primary rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary-foreground font-black text-lg">🥈</span>
                  </div>
                  <p className="text-3xl font-black text-foreground">£{currentTournament.second_prize}</p>
                  <p className="text-sm font-black text-muted-foreground mt-2">2nd Place</p>
                </div>
                <div className="text-center bg-primary/10 p-4 rounded-lg border border-primary">
                  <div className="bg-primary rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary-foreground font-black text-lg">🥉</span>
                  </div>
                  <p className="text-3xl font-black text-foreground">£{currentTournament.third_prize}</p>
                  <p className="text-sm font-black text-muted-foreground mt-2">3rd Place</p>
                </div>
              </div>
              
              <div className="text-center pt-4 border-t-2 border-primary">
                <p className="text-foreground font-black">Prize pool grows with more participants!</p>
                <p className="text-muted-foreground text-sm mt-2">Participants shown when tournament is active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Schedule */}
      <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
          <CardTitle className="text-foreground flex items-center gap-3 text-2xl font-black">
            <Calendar className="h-6 w-6" />
            Tournament Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-primary/30 bg-primary/5 px-4 rounded">
              <span className="text-foreground font-black">Tournament Duration</span>
              <span className="text-foreground font-semibold">Full Month</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-primary/30 bg-primary/5 px-4 rounded">
              <span className="text-foreground font-black">Entry Fee</span>
              <span className="text-foreground font-semibold">£2 (anytime)</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-primary/30 bg-primary/5 px-4 rounded">
              <span className="text-foreground font-black">Winners Announced</span>
              <span className="text-foreground font-semibold">Every Sunday Night</span>
            </div>
            <div className="flex items-center justify-between py-3 bg-primary/5 px-4 rounded">
              <span className="text-foreground font-black">New Tournament Starts</span>
              <span className="text-foreground font-semibold">Every Monday</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game History */}
      {profile?.tournament_active && gameHistory.length > 0 && (
        <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
            <CardTitle className="text-foreground flex items-center gap-3 text-2xl font-black">
              <Trophy className="h-6 w-6" />
              Your Tournament Games
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {gameHistory.slice(0, 5).map((game, index) => (
              <div key={game.id} className="flex justify-between items-center py-3 border-b border-primary/30 hover:bg-primary/5 px-3 rounded transition">
                <div>
                  <p className="text-foreground font-black">Score: {game.score}</p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(game.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-foreground font-black">{game.coins_collected} coins</p>
                  <p className="text-muted-foreground text-sm">{game.game_duration}s</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payment Structure Info */}
      <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
          <CardTitle className="text-foreground flex items-center gap-3 text-2xl font-black">
            <Star className="h-6 w-6" />
            Payment Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-green-100 border-2 border-green-300 p-4 rounded-lg">
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-black flex-shrink-0">✓</div>
              <div>
                <p className="text-foreground font-black">Platform Access - £99 (PAID)</p>
                <p className="text-muted-foreground text-sm">Lifetime access to the platform</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-primary/10 border-2 border-primary p-4 rounded-lg">
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-black flex-shrink-0">£</div>
              <div>
                <p className="text-foreground font-black">Monthly Tournament Entry - £2</p>
                <p className="text-muted-foreground text-sm">Pay once per month to participate in tournaments</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-primary/10 border-2 border-primary p-4 rounded-lg">
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-black flex-shrink-0">🏆</div>
              <div>
                <p className="text-foreground font-black">Win Real Money</p>
                <p className="text-muted-foreground text-sm">Up to £2,500 first place prize each month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Management */}
      {profile?.tournament_active && (
        <Card className="bg-card border-2 border-primary shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b-2 border-primary">
            <CardTitle className="text-foreground flex items-center gap-3 text-2xl font-black">
              <DollarSign className="h-6 w-6" />
              Billing & Account
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Button 
              onClick={handleManageBilling}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95 border-2 border-primary shadow-lg hover:shadow-xl font-black text-base py-3 h-auto rounded-lg transition-all"
            >
              Manage Billing
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
