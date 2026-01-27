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

  // 🔐 Detect Supabase email actions (verify / reset password)
  const authType = searchParams.get("type");
  const isEmailFlow = authType === "signup" || authType === "recovery";

  /* ================= STEP 1: PAYMENT VERIFICATION ================= */

  useEffect(() => {
    // 👉 If coming from email verification or reset → skip payment check
    if (isEmailFlow) {
      setVerifying(false);
      return;
    }

    // 👉 Normal auth flow must have payment session
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

      // ✅ payment verified (claimed or not)
      setVerifying(false);
    };

    verifyPayment();
  }, [navigate, sessionId, isEmailFlow]);

  /* ================= STEP 2: CLAIM PAYMENT AFTER LOGIN ================= */

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // 👉 Only claim payment in payment flow
      if (event === "SIGNED_IN" && session?.user && sessionId && !isEmailFlow) {
        await supabase.functions.invoke("verify-website-payment", {
          body: { session_id: sessionId },
        });

        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, sessionId, isEmailFlow]);

  /* ================= LOADING UI ================= */

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-bold">Verifying payment...</p>
      </div>
    );
  }

  /* ================= AUTH FORM ================= */

  return <AuthForm />;
};

export default Auth;
