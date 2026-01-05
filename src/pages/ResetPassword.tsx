import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully! You can now sign in.");
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-8">
      {/* Hero Section (same vibe as AuthForm) */}
      <div className="text-center max-w-2xl space-y-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground drop-shadow-lg">
          Easybucks Tournament
        </h1>
        <p className="text-xl sm:text-2xl text-foreground font-bold leading-relaxed drop-shadow-md">
          Secure your account by setting a new password
        </p>
      </div>

      <Card className="w-full max-w-md bg-card border-2 border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-card-foreground">
            Reset Password
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* PASSWORD */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-card-foreground">
              New Password <span className="text-red-400">* (min 6 characters)</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white text-foreground border border-border placeholder:text-muted-foreground"
                placeholder="Enter your new password"
              />
            </div>
          </div>

          <Button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full font-bold text-lg h-12"
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
