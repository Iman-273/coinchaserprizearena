import { useState, useEffect } from "react";
import { GameScreen } from "@/components/game/GameScreen";
import { LeaderboardScreen } from "@/components/leaderboard/LeaderboardScreen";
import { TournamentScreen } from "@/components/tournament/TournamentScreen";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import { PremiumAccessBanner } from "@/components/premium/PremiumAccessBanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Session, User } from "@supabase/supabase-js";

interface GameHubProps {
  session: Session | null;
  user: User | null;
}

interface Profile {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  premium_access?: boolean;
  premium_purchased_at?: string;
  total_coins: number;
  total_winnings: number;
  total_spent: number;
  tournament_active: boolean;
  created_at: string;
  updated_at: string;
}

export const GameHub = ({ session, user }: GameHubProps) => {
  const [activeTab, setActiveTab] = useState<'game' | 'leaderboard' | 'tournament' | 'profile'>('game');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile');
          // Try to create profile if it doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              full_name: user.user_metadata?.full_name || '',
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            toast.error('Failed to create user profile');
          } else {
            console.log('Profile created successfully:', newProfile);
            setProfile(newProfile);
          }
        } else {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load user profile');
        }
      } else {
        console.log('Profile loaded successfully:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (updatedProfile: Profile) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', user?.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      } else {
        console.log('Profile updated successfully:', updatedProfile);
        setProfile(updatedProfile);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">Easybucks Tournament</h1>
          <p className="text-muted-foreground text-center max-w-2xl">
            Welcome to the ultimate Easybucks experience! Play for free or join tournaments to compete for real money prizes.
          </p>
        </div>

        <PremiumAccessBanner profile={profile} updateProfile={handleProfileUpdate} />

        <div className="mb-8">
          <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          {activeTab === 'game' && <GameScreen profile={profile} updateProfile={handleProfileUpdate} />}
          {activeTab === 'leaderboard' && <LeaderboardScreen />}
          {activeTab === 'tournament' && <TournamentScreen profile={profile} updateProfile={handleProfileUpdate} />}
          {activeTab === 'profile' && <ProfileScreen profile={profile} updateProfile={handleUpdateProfile} session={session!} />}
        </div>
      </div>
    </div>
  );
};
