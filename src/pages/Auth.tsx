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

  // 🔹 STEP 1: Verify payment (anonymous or logged-in)
  useEffect(() => {
    if (!sessionId) {
      toast.error("Please complete payment first");
      navigate("/offer");
      return;
    }

    const verifyPayment = async () => {
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

      // payment verified (claimed OR unclaimed)
      setVerifying(false);
    };

    verifyPayment();
  }, [navigate, sessionId]);

  // 🔹 STEP 2: When user signs in → CLAIM payment
  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_IN" && session?.user && sessionId) {
          // 🔁 Re-verify to CLAIM payment with user_id
          await supabase.functions.invoke("verify-website-payment", {
            body: { session_id: sessionId },
          });

          navigate("/");
        }
      });

    return () => subscription.unsubscribe();
  }, [navigate, sessionId]);

  // 🔄 Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-bold">Verifying payment...</p>
      </div>
    );
  }

  // 🔐 Show signup / signin after successful payment
  return <AuthForm />;
};

export default Auth;
