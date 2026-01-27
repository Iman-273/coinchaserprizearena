import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { AuthForm } from "@/components/auth/AuthForm";
import { GameHub } from "@/components/game/GameHub";
import { toast } from "sonner";

interface Profile {
  id: string;
  has_website_access: boolean;
}

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const navigate = useNavigate();

  /* ================= INIT AUTH ================= */

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) console.error(error);

      const currentUser = data.session?.user ?? null;

      setSession(data.session);
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        toast.success("Welcome to Easybucks Tournament!");
        await fetchProfile(session.user.id);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ================= PROFILE FETCH ================= */

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    setFetchError(null);

    try {
      const result = await Promise.race<Profile | null>([
        (async () => {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, has_website_access")
            .eq("id", userId)
            .maybeSingle<Profile>();

          if (error) throw error;

          return data ?? null;
        })(),

        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timeout")), 10000)
        ),
      ]);

      setProfile(result);
    } catch (err: any) {
      console.error("[fetchProfile]", err);
      setProfile(null);
      setFetchError(err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  /* ================= REDIRECT (NO FLASH) ================= */

  useEffect(() => {
    if (!loading && user && profile) {
      if (!profile.has_website_access) {
        navigate("/offer", { replace: true });
      }
    }
  }, [loading, user, profile, navigate]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white">Loading Easybucks Tournament...</p>
        </div>
      </div>
    );
  }

  /* ================= ERROR ================= */

  if (fetchError && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <p className="text-white text-lg font-semibold mb-2">Oops!</p>
          <p className="text-gray-300 text-sm mb-6">{fetchError}</p>
          <button
            onClick={() => user && fetchProfile(user.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ================= AUTH ================= */

  if (!user) return <AuthForm />;

  /* ================= BLOCK RENDER WHILE REDIRECTING ================= */

  if (!loading && user && profile && !profile.has_website_access) {
    return null;
  }

  /* ================= MAIN APP ================= */

  return <GameHub session={session!} user={user} />;
};

export default Index;
