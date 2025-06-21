
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SecurityProvider } from "@/components/SecurityProvider";
import { SecurityHeaders } from "@/components/security/SecurityHeaders";
import { SessionTimeoutWarning } from "@/components/security/SessionTimeoutWarning";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import CsvImportHistory from "./pages/CsvImportHistory";
import UndoImport from "./pages/UndoImport";
import AgentClaim from "./pages/AgentClaim";
import ProjectPortal from "./pages/ProjectPortal";
import PublicForm from "./pages/PublicForm";
import SecurityCenter from "./pages/SecurityCenter";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SecurityProvider>
            <SecurityHeaders />
            <SessionTimeoutWarning />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/csv-import-history" element={<CsvImportHistory />} />
              <Route path="/undo-import" element={<UndoImport />} />
              <Route path="/agent-claim" element={<AgentClaim />} />
              <Route path="/project/:projectName" element={<ProjectPortal />} />
              <Route path="/form/:slug" element={<PublicForm />} />
              <Route path="/security" element={<SecurityCenter />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SecurityProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
