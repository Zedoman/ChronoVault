
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import MetaMaskConnector from "./components/MetaMaskConnector";
import LivenessCheck from "./components/LivenessCheck";
import InheritanceDashboard from "./components/InheritanceDashboard";
import ActivityHistory from "./components/ActivityHistory";
import EmergencyAccess from "./components/EmergencyAccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MetaMaskConnector />} />
          <Route path="/liveness-check" element={<Layout><LivenessCheck /></Layout>} />
          <Route path="/inheritance" element={<Layout><InheritanceDashboard /></Layout>} />
          <Route path="/activity" element={<Layout><ActivityHistory /></Layout>} />
          <Route path="/emergency" element={<Layout><EmergencyAccess /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
