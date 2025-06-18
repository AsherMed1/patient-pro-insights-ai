
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy load page components
const Index = lazy(() => import("./pages/Index"));
const ProjectPortal = lazy(() => import("./pages/ProjectPortal"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const AgentClaim = lazy(() => import("./pages/AgentClaim"));
const UndoImport = lazy(() => import("./pages/UndoImport"));
const CsvImportHistory = lazy(() => import("./pages/CsvImportHistory"));
const AgentStatsPage = lazy(() => import("./components/AgentStatsPage"));
const PublicForm = lazy(() => import("./pages/PublicForm"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    <span className="ml-2">Loading...</span>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/project/:projectName" element={<ProjectPortal />} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/agent-claim" element={<AgentClaim />} />
              <Route path="/undo-import" element={<UndoImport />} />
              <Route path="/csv-import-history" element={<CsvImportHistory />} />
              <Route path="/agent-stats" element={<AgentStatsPage onBack={() => window.history.back()} />} />
              <Route path="/form/:slug" element={<PublicForm />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
