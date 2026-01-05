import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
    gender: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  /* =========================
     AUTH (LOGIN / SIGNUP)
  ========================= */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        if (data.user) toast.success("Successfully signed in!");
      } else {
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
              gender: formData.gender,
            },
          },
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        if (data.user)
          toast.success("Account created! Please check your email for verification.");
      }
    } catch (err) {
      toast.error("Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FORGOT PASSWORD
  ========================= */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Password reset link sent! Check your email.");
      setShowForgot(false);
      setForgotEmail("");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-8 bg-gray-50">
      {/* HERO */}
      <div className="text-center max-w-2xl space-y-2">
        <h1 className="text-5xl font-black text-gray-900">Easybucks Tournament</h1>
        <p className="text-lg font-semibold text-gray-700">
          Compete, win, and withdraw your rewards securely.
        </p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {showForgot ? "Reset Password" : isLogin ? "Welcome back!" : "Create an account"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* ================= FORGOT PASSWORD FORM ================= */}
          {showForgot ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your email"
              />

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send reset link"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowForgot(false)}
              >
                Back to login
              </Button>
            </form>
          ) : (
            /* ================= LOGIN / SIGNUP FORM ================= */
            <form onSubmit={handleAuth} className="space-y-4">
              {/* EMAIL */}
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
              />

              {/* SIGNUP EXTRA FIELDS */}
              {!isLogin && (
                <>
                  <Label>Username</Label>
                  <Input
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                  />

                  <Label>Full Name</Label>
                  <Input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </>
              )}

              {/* PASSWORD */}
              <Label>Password</Label>
              <Input
                name="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleInputChange}
              />

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
              </Button>

              {/* FORGOT PASSWORD */}
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm text-blue-500 underline w-full mt-1"
                >
                  Forgot password?
                </button>
              )}
            </form>
          )}

          {/* TOGGLE LOGIN / SIGNUP */}
          {!showForgot && (
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
