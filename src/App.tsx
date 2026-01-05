
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Offer from "./pages/Offer";
import Auth from "./pages/Auth";
import Play from "./pages/Play";
import TournamentSuccess from "./pages/TournamentSuccess";
import WebsiteSuccess from "./pages/WebsiteSuccess";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/offer" element={<Offer />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/play" element={<Play />} />
          <Route path="/tournament-success" element={<TournamentSuccess />} />
          <Route path="/website-success" element={<WebsiteSuccess />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
