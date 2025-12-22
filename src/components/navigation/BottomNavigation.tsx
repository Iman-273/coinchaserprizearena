
import { Gamepad2, Trophy, Crown, User } from "lucide-react";

interface BottomNavigationProps {
  activeTab: 'game' | 'leaderboard' | 'tournament' | 'profile';
  setActiveTab: (tab: 'game' | 'leaderboard' | 'tournament' | 'profile') => void;
}

export const BottomNavigation = ({ activeTab, setActiveTab }: BottomNavigationProps) => {
  const tabs = [
    { id: "game" as const, label: "Play", icon: Gamepad2 },
    { id: "leaderboard" as const, label: "Leaderboard", icon: Trophy },
    { id: "tournament" as const, label: "Tournament", icon: Crown },
    { id: "profile" as const, label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm border-t border-border z-50">
      <div className="flex justify-around items-center py-3 px-4 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center px-4 py-3 rounded-xl transition-all duration-200 w-20 ${
                isActive 
                  ? "bg-[hsl(var(--primary-foreground))] text-black shadow-lg" 
                  : "text-white hover:bg-white/10"
                }`}
            >
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isActive ? "animate-pulse" : ""}`} />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
