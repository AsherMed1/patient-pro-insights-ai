
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProjectPortal from "./pages/ProjectPortal";
import ApiDocs from "./pages/ApiDocs";
import AgentClaim from "./pages/AgentClaim";
import UndoImport from "./pages/UndoImport";
import CsvImportHistory from "./pages/CsvImportHistory";
import AgentStatsPage from "./components/AgentStatsPage";
import PublicForm from "./pages/PublicForm";
import ProjectDetailedDashboard from "./components/projects/ProjectDetailedDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/project/:projectName" element={<ProjectPortal />} />
            <Route path="/project/:projectName/dashboard" element={<ProjectDetailedDashboard />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/agent-claim" element={<AgentClaim />} />
            <Route path="/undo-import" element={<UndoImport />} />
            <Route path="/csv-import-history" element={<CsvImportHistory />} />
            <Route path="/agent-stats" element={<AgentStatsPage onBack={() => window.history.back()} />} />
            <Route path="/form/:slug" element={<PublicForm />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
