
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Trophy } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  end_date: string;
  first_prize: number;
  second_prize: number;
  third_prize: number;
}

interface TournamentInfoProps {
  tournament: Tournament;
  daysLeft: number;
  participantCount: number;
}

export const TournamentInfo = ({ tournament, daysLeft, participantCount }: TournamentInfoProps) => {
  return (
    <>
      {/* Tournament Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card className="rounded-lg shadow-md border-2 border-primary overflow-hidden">
              <CardContent className="p-6 text-center bg-red-600">
                <div className="bg-red-700/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="h-6 w-6 text-black" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">{daysLeft}</p>
                <p className="text-xs sm:text-sm text-white/80">Days Left</p>
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-md border-2 border-primary overflow-hidden">
              <CardContent className="p-6 text-center bg-emerald-600">
                <div className="bg-emerald-700/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <Users className="h-6 w-6 text-black" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">{participantCount}</p>
                <p className="text-xs sm:text-sm text-white/80">Players</p>
              </CardContent>
            </Card>
          </div>

      {/* Prize Pool */}
      <Card className="bg-black border-2 border-primary rounded-lg shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-yellow-400 text-lg sm:text-xl font-bold">
              <div className="bg-yellow-400/20 rounded-full w-8 h-8 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-yellow-400" />
              </div>
              💰 Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <p className="text-lg sm:text-2xl font-bold text-yellow-400">£{tournament.first_prize}</p>
                <p className="text-xs sm:text-sm text-white/70">1st Place</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-yellow-300">£{tournament.second_prize}</p>
                <p className="text-xs sm:text-sm text-white/70">2nd Place</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-yellow-200">£{tournament.third_prize}</p>
                <p className="text-xs sm:text-sm text-white/70">3rd Place</p>
              </div>
            </div>
            <p className="text-center text-white/70 text-xs sm:text-sm mt-4">
              Join Mon-Thu • Compete until Sun • Winners: Top 3 total runs
            </p>
          </CardContent>
        </Card>
    </>
  );
};
