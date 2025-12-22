
import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WithdrawalDialog } from "./WithdrawalDialog";
import { User, Coins, Trophy, Calendar, LogOut, DollarSign, Download, History } from "lucide-react";

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

interface ProfileScreenProps {
  profile: Profile | null;
  updateProfile: (profile: Profile) => void;
  session: Session;
}

export const ProfileScreen = ({ profile, updateProfile, session }: ProfileScreenProps) => {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || "");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [loading, setLoading] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [earningsHistory, setEarningsHistory] = useState([]);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          username, 
          full_name: fullName,
          gender: gender || null
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      
      updateProfile(data);
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error("Failed to update profile");
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      toast.error("Failed to sign out");
    }
  };

  const fetchEarningsHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('earnings_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setEarningsHistory(data || []);
    } catch (error) {
      console.error('Error fetching earnings history:', error);
    }
  };

  const handleWithdrawalSuccess = () => {
    updateProfile(profile as Profile);
    fetchEarningsHistory();
  };

  if (!profile) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3 pb-4 border-b-2 border-border">
        <h1 className="text-4xl font-black text-foreground drop-shadow-md">Profile</h1>
        <p className="text-muted-foreground text-lg">Manage your account and view stats</p>
      </div>

      {/* Profile Card */}
      <Card className="bg-card border-2 border-border shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b border-border">
          <CardTitle className="text-card-foreground flex items-center gap-2 text-2xl">
            <User className="h-6 w-6" />
            Player Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-20 w-20 border-2 border-border shadow-md">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
                {profile.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white text-foreground border border-border placeholder:text-muted-foreground"
                    placeholder="Username"
                  />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white text-foreground border border-border placeholder:text-muted-foreground"
                    placeholder="Full Name"
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-border rounded-md text-foreground"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleUpdateProfile}
                      disabled={loading}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold shadow-md"
                    >
                      {loading ? "Saving..." : "Save"}
                    </Button>
                    <Button 
                      onClick={() => setEditing(false)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-2 border-border text-foreground hover:bg-background/50"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-foreground">{profile.username}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{profile.full_name || 'No name set'}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{profile.email}</p>
                  <Button 
                    onClick={() => {
                      setUsername(profile.username);
                      setFullName(profile.full_name || '');
                      setGender(profile.gender || '');
                      setEditing(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-2 border-border text-foreground hover:bg-background/50"
                  >
                    Edit Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/10 border-2 border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5 text-center">
            <div className="bg-primary/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Coins className="h-6 w-6 text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground">{profile.total_coins}</p>
            <p className="text-xs text-muted-foreground mt-2 font-semibold">Total Coins</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-2 border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5 text-center">
            <div className="bg-primary/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground">£{profile.total_winnings?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-muted-foreground mt-2 font-semibold">Total Winnings</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-2 border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5 text-center">
            <div className="bg-primary/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground">
              {profile.tournament_active ? "✓" : "✗"}
            </p>
            <p className="text-xs text-muted-foreground mt-2 font-semibold">Tournament</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-2 border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5 text-center">
            <div className="bg-primary/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground">£{profile.total_spent?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-muted-foreground mt-2 font-semibold">Total Spent</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Section */}
      <Card className="bg-card border-2 border-border shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b border-border">
          <CardTitle className="text-card-foreground flex items-center gap-2 text-xl font-black">
            <Download className="h-5 w-5" />
            Manage Earnings
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => setShowWithdrawal(true)}
              disabled={!profile.total_winnings || profile.total_winnings < 10}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95 border-2 border-primary shadow-md hover:shadow-lg font-semibold py-2 h-auto text-base rounded-lg transition-all active:scale-95"
            >
              <Download className="h-5 w-5 mr-2" />
              Withdraw Earnings (Min £10)
            </Button>
            <Button
              onClick={fetchEarningsHistory}
              variant="outline"
              className="w-full border-2 border-border text-foreground bg-white/50 hover:bg-white shadow-md hover:shadow-lg font-semibold py-2 h-auto text-base rounded-lg transition-all"
            >
              <History className="h-5 w-5 mr-2" />
              View History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Earnings History */}
      {earningsHistory.length > 0 && (
        <Card className="bg-card border-2 border-border shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b border-border">
            <CardTitle className="text-card-foreground flex items-center gap-2 font-black">
              <History className="h-5 w-5" />
              Recent Earnings History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {earningsHistory.map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between border-b border-border/50 pb-3 hover:bg-primary/5 px-2 py-1 rounded transition-colors">
                <div>
                  <p className="text-sm text-foreground font-semibold">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className={`text-sm font-black px-3 py-1 rounded ${entry.type === 'win' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {entry.type === 'win' ? '+' : '−'}£{entry.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <Card className="bg-card border-2 border-border shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4 border-b border-border">
          <CardTitle className="text-card-foreground flex items-center gap-2 font-black">
            <Calendar className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-semibold">Email:</span>
            <span className="text-foreground font-medium">{profile.email}</span>
          </div>
          {profile.gender && (
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground font-semibold">Gender:</span>
              <span className="text-foreground font-medium capitalize">{profile.gender.replace('_', ' ')}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground font-semibold">Member since:</span>
            <span className="text-foreground font-medium">
              {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground font-semibold">Tournament Status:</span>
            <span className={`font-black px-3 py-1 rounded-full ${profile.tournament_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {profile.tournament_active ? "Active" : "Inactive"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3 pt-4 border-t-2 border-border">
        <Button 
          onClick={handleSignOut}
          className="w-full bg-red-600 hover:bg-red-700 text-white border-2 border-red-700 shadow-lg hover:shadow-xl font-semibold py-2 h-auto text-base rounded-lg transition-all active:scale-95"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </Button>
      </div>

      <WithdrawalDialog
        open={showWithdrawal}
        onOpenChange={setShowWithdrawal}
        totalWinnings={profile?.total_winnings || 0}
        onWithdrawalSuccess={handleWithdrawalSuccess}
        profile={profile}
      />
    </div>
  );
};
