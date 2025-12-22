import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { AuthForm } from "@/components/auth/AuthForm";
import { toast } from "sonner";

const Auth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      toast.error("Please complete payment first");
      navigate("/offer");
      return;
    }

    const verifyPayment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "verify-website-payment",
          {
            body: { session_id: sessionId },
          }
        );

        if (error || data?.status !== "paid") {
          toast.error("Payment verification failed");
          navigate("/offer");
          return;
        }

        setVerifying(false);
      } catch (err: any) {
        console.error(err);
        toast.error("Payment verification failed");
        navigate("/offer");
      }
    };

    verifyPayment();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_IN" && session?.user) {
          // ✅ Claim any unclaimed payments after signup/signin
          try {
            const userId = session.user.id;
            await supabase.functions.invoke("claim-unclaimed-payments", {
              body: { user_id: userId },
            });
          } catch (err) {
            console.error("Failed to claim payments:", err);
          }

          navigate("/");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, sessionId]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-bold">Verifying payment...</p>
      </div>
    );
  }

  return <AuthForm />;
};

export default Auth;
