
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trophy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TournamentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
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
      console.log("Verifying tournament payment for session:", sessionId);
      
      const { data, error } = await supabase.functions.invoke('verify-tournament-payment', {
        body: { session_id: sessionId }
      });

      if (error) {
        console.error('Verification error:', error);
        toast.error(`Payment verification failed: ${error.message}`);
        throw error;
      }

      console.log("Tournament verification response:", data);

      if (data?.status === "paid") {
        setVerified(true);
        toast.success("Tournament access activated!");
        
        // Refresh the page after a delay to ensure the user sees the success message
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      } else {
        toast.error("Payment verification failed - payment not completed");
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error("Failed to verify payment");
    } finally {
      setVerifying(false);
    }
  };

  const handleContinue = () => {
    navigate("/");
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-2 border-primary shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-foreground font-bold">Verifying your payment...</p>
            <p className="text-muted-foreground text-sm mt-2">This may take a few moments</p>
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
              <Trophy className="h-16 w-16 text-red-600" />
            )}
          </div>
          <CardTitle className={`text-3xl font-black ${
            verified ? "text-foreground" : "text-red-600"
          }`}>
            {verified ? "Tournament Payment Successful!" : "Payment Verification Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-foreground font-semibold">
            {verified 
              ? "Welcome to the Easybucks Tournament! You can now play tournament games and compete for weekly prizes."
              : "There was an issue processing your payment. Please try again or contact support."
            }
          </p>
          
          {verified && (
            <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
              <h3 className="text-foreground font-black mb-3">✓ What's Next?</h3>
              <ul className="text-foreground text-sm space-y-2">
                <li>• Play tournament games to earn points</li>
                <li>• Check the leaderboard to see your ranking</li>
                <li>• Compete for weekly cash prizes</li>
                <li>• Tournament resets every Sunday</li>
              </ul>
            </div>
          )}

          <Button 
            onClick={handleContinue}
            className={`w-full font-black py-3 ${ 
              verified 
                ? "bg-primary text-primary-foreground hover:bg-primary/95 border-2 border-primary shadow-lg"
                : "bg-red-600 text-white hover:bg-red-700 border-2 border-red-700"
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

export default TournamentSuccess;
