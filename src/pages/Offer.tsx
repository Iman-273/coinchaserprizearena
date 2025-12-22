import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const Offer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleBuyNow = async () => {
    setLoading(true);

    try {
      // ❌ Anonymous payment (no auth required)
      const { data, error } = await supabase.functions.invoke(
        "create-website-payment",
        {
          body: {
            source: "offer_page",
            // optional: email if user is logged in
          },
        }
      );

      if (error) {
        console.error(error);
        toast.error(error.message || "Payment failed");
        return;
      }

      if (data?.url) {
        // ✅ Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast.error("No payment URL received");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl sm:text-7xl font-black">£99</h1>
          <p className="text-2xl font-black">
            Make from £20 up to £5000 every week
          </p>
          <p className="text-lg font-bold">
            One time payment for lifetime platform access
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <ul className="space-y-3 font-semibold">
              <li>• Weekly tournaments with real cash prizes</li>
              <li>• Withdraw winnings to bank</li>
              <li>• Premium game modes</li>
              <li>• 24/7 support</li>
            </ul>

            <Button
              onClick={handleBuyNow}
              size="lg"
              disabled={loading}
              className="w-full h-14 text-lg font-bold"
            >
              {loading ? "Redirecting..." : "Buy Now – £99"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Secure Stripe payment • Signup after payment
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Offer;
