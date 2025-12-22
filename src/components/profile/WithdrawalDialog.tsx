import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  profile 
}: WithdrawalDialogProps) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [bankInfo, setBankInfo] = useState({
    routingNumber: "",
    accountNumber: "",
    accountHolderName: "",
    confirmAccountNumber: ""
  });

  const hasStripeAccount = profile?.stripe_account_id && profile?.stripe_account_verified;

  const handleBankSetup = async () => {
    try {
      setSetupLoading(true);

      if (!bankInfo.routingNumber || !bankInfo.accountNumber || !bankInfo.accountHolderName) {
        toast({
          title: "Missing information",
          description: "Please fill in all bank account details",
          variant: "destructive",
        });
        return;
      }

      if (bankInfo.accountNumber !== bankInfo.confirmAccountNumber) {
        toast({
          title: "Account numbers don't match",
          description: "Please ensure both account numbers are identical",
          variant: "destructive",
        });
        return;
      }

      if (bankInfo.routingNumber.length !== 9) {
        toast({
          title: "Invalid routing number",
          description: "Routing number must be 9 digits",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('setup-stripe-account', {
        body: {
          routing_number: bankInfo.routingNumber,
          account_number: bankInfo.accountNumber,
          account_holder_name: bankInfo.accountHolderName
        }
      });

      if (error) {
        throw error;
      }

      // Redirect to Stripe onboarding
      window.open(data.onboarding_url, '_blank');

      toast({
        title: "Bank account setup initiated",
        description: "Please complete verification in the new tab, then refresh this page",
      });

      // Reset form
      setBankInfo({
        routingNumber: "",
        accountNumber: "",
        accountHolderName: "",
        confirmAccountNumber: ""
      });

    } catch (error) {
      console.error("Bank setup error:", error);
      toast({
        title: "Setup failed",
        description: error.message || "Failed to setup bank account",
        variant: "destructive",
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      
      const withdrawAmount = parseFloat(amount);
      
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid amount",
          variant: "destructive",
        });
        return;
      }

      if (withdrawAmount > totalWinnings) {
        toast({
          title: "Insufficient balance",
          description: "You don't have enough winnings to withdraw this amount",
          variant: "destructive",
        });
        return;
      }

      if (withdrawAmount < 10) {
        toast({
          title: "Minimum withdrawal",
          description: "Minimum withdrawal amount is $10",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: { amount: withdrawAmount }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Withdrawal processed!",
        description: `$${withdrawAmount.toFixed(2)} will arrive in your account ending in ${profile?.bank_account_last4} by ${data.expected_arrival}`,
      });

      onWithdrawalSuccess();
      onOpenChange(false);
      setAmount("");
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setBankInfo(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Withdraw Earnings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={hasStripeAccount ? "withdraw" : "setup"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Bank Setup
            </TabsTrigger>
            <TabsTrigger value="withdraw" disabled={!hasStripeAccount}>
              <DollarSign className="h-4 w-4" />
              Withdraw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Bank Account</CardTitle>
                <CardDescription>
                  Securely add your bank account to receive withdrawals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasStripeAccount && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Bank account ending in {profile?.bank_account_last4} is set up
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    placeholder="Full name on account"
                    value={bankInfo.accountHolderName}
                    onChange={(e) => handleInputChange("accountHolderName", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number</Label>
                  <Input
                    id="routingNumber"
                    placeholder="9-digit routing number"
                    value={bankInfo.routingNumber}
                    onChange={(e) => handleInputChange("routingNumber", e.target.value.replace(/\D/g, '').slice(0, 9))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    type="password"
                    placeholder="Bank account number"
                    value={bankInfo.accountNumber}
                    onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmAccountNumber">Confirm Account Number</Label>
                  <Input
                    id="confirmAccountNumber"
                    type="password"
                    placeholder="Re-enter account number"
                    value={bankInfo.confirmAccountNumber}
                    onChange={(e) => handleInputChange("confirmAccountNumber", e.target.value)}
                  />
                </div>

                <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Secure & Encrypted</p>
                    <p>Your bank information is encrypted and processed securely through Stripe.</p>
                  </div>
                </div>

                <Button 
                  onClick={handleBankSetup} 
                  disabled={setupLoading}
                  className="w-full"
                >
                  {setupLoading ? "Setting up..." : "Setup Bank Account"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Withdraw Funds</CardTitle>
                <CardDescription>
                  Transfer your earnings to your bank account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasStripeAccount && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Withdrawals will be sent to account ending in {profile?.bank_account_last4}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to withdraw</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="10"
                    max={totalWinnings}
                    step="0.01"
                  />
                  <p className="text-sm text-muted-foreground">
                    Available balance: ${totalWinnings.toFixed(2)} • Minimum: $10.00
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Processing time:</strong> Withdrawals typically arrive in 1-2 business days
                  </p>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={loading || !hasStripeAccount}
                  className="w-full"
                >
                  {loading ? "Processing..." : `Withdraw $${amount || "0.00"}`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};