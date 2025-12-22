import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { GameHub } from "@/components/game/GameHub";
import { toast } from "sonner";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // 1️⃣ Initial session check
    const initSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        toast.error("Authentication failed");
        setLoading(false);
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    initSession();

    // 2️⃣ Auth listener (FAST — no DB calls here)
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_IN") {
          toast.success("Welcome to Easybucks Tournament!");
        }

        if (event === "SIGNED_OUT") {
          toast.success("Signed out successfully!");
          navigate("/offer", { replace: true });
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // ⛔ Fast exit
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading Easybucks Tournament...</p>
        </div>
      </div>
    );
  }

  // 🔁 Redirect if not logged in
  if (!user) {
    navigate("/offer", { replace: true });
    return null;
  }

  return <GameHub session={session!} user={user} />;
};

export default Index;
