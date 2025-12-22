import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, CreditCard, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  email: string;
  total_spent: number;
  platform_access?: boolean;
  premium_purchased_at?: string;
}

interface PremiumAccessBannerProps {
  profile: Profile | null;
}

export const PremiumAccessBanner = ({ profile }: PremiumAccessBannerProps) => {
  const navigate = useNavigate();

  // Check if user has paid
  const hasAccess = profile && profile.total_spent >= 99;

  if (hasAccess) {
    return (
      <Card className="bg-card border-2 border-border shadow-lg mb-6">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Crown className="h-7 w-7" />
            <span className="font-black text-2xl">PREMIUM MEMBER</span>
          </div>
          <p className="font-semibold">✓ Platform access active</p>
          <p className="text-sm text-muted-foreground mt-2">
            Pay £2 monthly to join tournaments and compete for prizes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-2 border-border shadow-lg mb-6">
      <CardHeader className="border-b-2 border-border">
        <CardTitle className="flex items-center gap-3 text-2xl font-black">
          <Crown className="h-6 w-6" />
          Get Premium Access
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div className="border-2 border-border rounded-lg p-6 text-center">
          <p className="text-5xl font-black mb-2">£99</p>
          <p className="text-muted-foreground font-semibold">
            One-time payment • Lifetime access
          </p>
        </div>

        <div className="space-y-3 border border-border rounded-lg p-5">
          <h3 className="font-black mb-3">What You Get:</h3>

          <div className="flex gap-3">
            <Check className="h-5 w-5 text-primary" />
            <span>Access to all platform features</span>
          </div>

          <div className="flex gap-3">
            <Check className="h-5 w-5 text-primary" />
            <span>Join monthly tournaments</span>
          </div>

          <div className="flex gap-3">
            <Check className="h-5 w-5 text-primary" />
            <span>Compete for real money prizes</span>
          </div>

          <div className="flex gap-3">
            <Check className="h-5 w-5 text-primary" />
            <span>Priority customer support</span>
          </div>
        </div>

        <Button
          onClick={() => navigate("/offer")}
          className="w-full bg-primary text-primary-foreground font-black py-3"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Get Premium Access – £99
        </Button>

        {!profile && (
          <p className="text-sm text-center text-red-600 font-semibold">
            ⚠ Please sign in to continue
          </p>
        )}
      </CardContent>
    </Card>
  );
};
