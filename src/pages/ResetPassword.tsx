import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Get the access token from the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("access_token");
    setAccessToken(token);
  }, []);

  const handleReset = async () => {
    if (!password) {
      toast.error("Please enter a new password");
      return;
    }
    if (!accessToken) {
      toast.error("Invalid reset link");
      return;
    }

    setLoading(true);

    try {
      // Use Supabase updateUser with the token from the URL
      const { data, error } = await supabase.auth.updateUser({
        password,
        // The session automatically uses access_token from the URL
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully! You can now sign in.");
      setPassword("");
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 border rounded-md bg-card space-y-4">
        <h2 className="text-xl font-bold text-card-foreground">Reset Password</h2>
        <p className="text-card-foreground text-sm">
          Enter your new password below to reset your account password.
        </p>

        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-white text-foreground border border-border"
        />

        <Button
          onClick={handleReset}
          disabled={loading}
          className="w-full font-bold text-lg"
        >
          {loading ? "Updating..." : "Reset Password"}
        </Button>
      </div>
    </div>
  );
}
