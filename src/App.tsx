import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SetupProvider } from "@/contexts/SetupContext";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import UserManagement from "./pages/UserManagement";
import SetupWizard from "./pages/setup/SetupWizard";
import ZoneSetup from "./pages/setup/ZoneSetup";
import CCTVSetup from "./pages/setup/CCTVSetup";
import TeamSetup from "./pages/setup/TeamSetup";
import SetupComplete from "./pages/setup/SetupComplete";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SetupProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/setup/wizard" element={<SetupWizard />} />
              <Route path="/setup/zones" element={<ZoneSetup />} />
              <Route path="/setup/cctv" element={<CCTVSetup />} />
              <Route path="/setup/teams" element={<TeamSetup />} />
              <Route path="/setup/complete" element={<SetupComplete />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SetupProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
