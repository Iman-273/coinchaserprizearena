import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, AlertCircle } from "lucide-react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalWinnings: number;
  onWithdrawalSuccess: () => void;
  profile?: any;
}

export const WithdrawalDialog = ({
  open,
  onOpenChange,
  totalWinnings,
  onWithdrawalSuccess,
  profile,
}: WithdrawalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  const hasStripeAccount =
    profile?.stripe_account_id && profile?.stripe_account_verified;

  // -----------------------------
  // STRIPE ONBOARDING
  // -----------------------------
  const handleStripeSetup = async () => {
    try {
      setSetupLoading(true);

      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;

      const { data, error } = await supabase.functions.invoke(
        "setup-stripe-account",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) throw error;

      window.open(data.onboarding_url, "_blank");

      toast({
        title: "Stripe setup started",
        description:
          "Complete verification on Stripe, then refresh this page.",
      });
    } catch (error: any) {
      toast({
        title: "Setup failed",
        description: error.message || "Unable to start Stripe onboarding",
        variant: "destructive",
      });
    } finally {
      setSetupLoading(false);
    }
  };

  // -----------------------------
  // WITHDRAW (NO AMOUNT FROM UI)
  // -----------------------------
  const handleWithdraw = async () => {
    try {
      setLoading(true);

      if (!totalWinnings || totalWinnings <= 0) {
        toast({
          title: "No balance",
          description: "You have no withdrawable earnings",
          variant: "destructive",
        });
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.access_token;

      const { error } = await supabase.functions.invoke(
        "process-withdrawal",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Withdrawal successful",
        description:
          "Your earnings are being transferred to your bank account.",
      });

      onWithdrawalSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Withdrawal failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Withdraw Earnings
          </DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue={hasStripeAccount ? "withdraw" : "setup"}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">
              <CreditCard className="h-4 w-4 mr-2" />
              Stripe Setup
            </TabsTrigger>
            <TabsTrigger value="withdraw" disabled={!hasStripeAccount}>
              <DollarSign className="h-4 w-4 mr-2" />
              Withdraw
            </TabsTrigger>
          </TabsList>

          {/* STRIPE SETUP */}
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle>Connect Stripe</CardTitle>
                <CardDescription>
                  Securely connect your bank account via Stripe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 p-3 bg-blue-50 border rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    Bank details are entered securely on Stripe — not stored
                    on our servers.
                  </p>
                </div>

                <Button
                  onClick={handleStripeSetup}
                  disabled={setupLoading}
                  className="w-full"
                >
                  {setupLoading
                    ? "Redirecting..."
                    : "Connect with Stripe"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WITHDRAW */}
          <TabsContent value="withdraw">
            <Card>
              <CardHeader>
                <CardTitle>Withdraw Funds</CardTitle>
                <CardDescription>
                  Available to withdraw
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg font-semibold">
                  ${totalWinnings.toFixed(2)}
                </p>

                <Button
                  onClick={handleWithdraw}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Processing..." : "Withdraw"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
