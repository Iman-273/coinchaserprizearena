import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, Lock, UserPlus, LogIn } from "lucide-react";

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
    gender: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error("Invalid email or password. Please check your credentials and try again.");
          } else if (error.message.includes('Email not confirmed')) {
            toast.error("Please check your email and click the confirmation link before signing in.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data.user) {
          toast.success("Successfully signed in!");
        }
      } else {
        // Validate form data for signup
        if (!formData.email || !formData.password || !formData.username) {
          toast.error("Please fill in all required fields");
          return;
        }

        if (formData.password.length < 6) {
          toast.error("Password must be at least 6 characters long");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/?showSignin=true`,
            data: {
              username: formData.username,
              full_name: formData.fullName,
              gender: formData.gender
            }
          }
        });
        
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error("An account with this email already exists. Please sign in instead.");
            setIsLogin(true);
          } else if (error.message.includes('Password should be at least 6 characters')) {
            toast.error("Password must be at least 6 characters long");
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data.user) {
          if (data.user.email_confirmed_at) {
            toast.success("Account created successfully! You can now sign in.");
          } else {
            toast.success("Account created! Please check your email for verification link.");
          }
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-8">
      {/* Hero Section */}
      <div className="text-center max-w-2xl space-y-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground drop-shadow-lg">
          Easybucks Tournament
        </h1>
        <p className="text-xl sm:text-2xl text-foreground font-bold leading-relaxed drop-shadow-md">
          Welcome to the ultimate Easybucks experience! Play for free or join tournaments to compete for real money prizes.
        </p>
      </div>

      <Card className="w-full max-w-md bg-card border-2 border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-card-foreground">
            {isLogin ? "Welcome back!" : "Join the competition!"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-card-foreground">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 bg-white text-foreground border border-border placeholder:text-muted-foreground"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-card-foreground">Username *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      className="pl-10 bg-white text-foreground border border-border placeholder:text-muted-foreground"
                      placeholder="Choose a username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-card-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="bg-white text-foreground border border-border placeholder:text-muted-foreground"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-card-foreground">Gender (Optional)</Label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-border rounded-md text-foreground"
                  >
                    <option value="" className="text-black">Select gender</option>
                    <option value="male" className="text-black">Male</option>
                    <option value="female" className="text-black">Female</option>
                    <option value="other" className="text-black">Other</option>
                    <option value="prefer_not_to_say" className="text-black">Prefer not to say</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-card-foreground">
                Password {!isLogin && <span className="text-red-400">* (min 6 characters)</span>}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 bg-white text-foreground border border-border placeholder:text-muted-foreground"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full font-bold text-lg h-12"
            >
              {loading ? (
                "Processing..."
              ) : isLogin ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="bg-transparent text-card-foreground hover:bg-black hover:text-primary-foreground focus:outline-none focus:ring-0 active:bg-black active:text-primary-foreground transition-colors rounded-md px-3 py-2"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
