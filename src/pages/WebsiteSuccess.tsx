import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WebsiteSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setVerifying(false);
      toast.error("No payment session found");
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      console.log("Verifying payment with session_id:", sessionId);

      const { data, error } = await supabase.functions.invoke(
        "verify-website-payment",
        { body: { session_id: sessionId } }
      );

      console.log("Verification response:", { data, error });

      if (error) {
        console.error("Verification error:", error);
        throw error;
      }

      setPaymentStatus(data?.status);

      if (data?.status === "paid") {
        setVerified(true);
        toast.success("Premium access activated! 🎉");

        // Wait 3 seconds then redirect
        setTimeout(() => {
          console.log("Redirecting to home...");
          navigate("/", { replace: true });
        }, 3000);
      } else {
        console.warn("Payment not marked as paid:", data?.status);
        toast.error("Payment not completed");
      }
    } catch (err) {
      console.error("Verification failed:", err);
      toast.error("Failed to verify payment");
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-2 border-primary shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="font-bold text-foreground">Verifying your payment...</p>
            <p className="text-muted-foreground text-sm mt-2">
              This may take a few moments
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-2 border-primary shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {verified ? (
              <CheckCircle className="h-16 w-16 text-green-600" />
            ) : (
              <Crown className="h-16 w-16 text-red-600" />
            )}
          </div>

          <CardTitle
            className={`text-3xl font-black ${
              verified ? "text-foreground" : "text-red-600"
            }`}
          >
            {verified
              ? "Welcome to Premium!"
              : "Payment Verification Failed"}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="font-semibold text-foreground">
            {verified
              ? "You now have lifetime access to all Easybucks features!"
              : `There was an issue processing your payment. Status: ${paymentStatus}`}
          </p>

          {verified && (
            <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
              <h3 className="font-black mb-3">
                ✓ Premium Features Unlocked
              </h3>
              <ul className="text-sm space-y-2">
                <li>• Unlimited tournament access</li>
                <li>• Monthly paid tournaments</li>
                <li>• Priority support</li>
                <li>• Real money prizes</li>
              </ul>
            </div>
          )}

          <Button
            onClick={() => navigate("/", { replace: true })}
            className={`w-full font-black py-3 ${
              verified
                ? "bg-primary text-primary-foreground"
                : "bg-red-600 text-white"
            }`}
          >
            {verified ? (
              <>
                Start Playing <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "Try Again"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteSuccess;
