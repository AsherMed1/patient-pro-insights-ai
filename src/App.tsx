
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import "./App.css";
import { lazy, Suspense } from "react";

// Lazy load pages for better performance
const CsvImportHistory = lazy(() => import("./pages/CsvImportHistory"));
const UndoImport = lazy(() => import("./pages/UndoImport"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const AgentClaim = lazy(() => import("./pages/AgentClaim"));
const FormManagement = lazy(() => import("./components/forms/FormManagement"));
const PublicForm = lazy(() => import("./pages/PublicForm"));
const ProjectPortal = lazy(() => import("./pages/ProjectPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <RadixToaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/csv-import-history" element={<CsvImportHistory />} />
          <Route path="/undo-import" element={<UndoImport />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/agent-claim" element={<AgentClaim />} />
          <Route path="/forms" element={<FormManagement />} />
          <Route path="/form/:slug" element={<PublicForm />} />
          <Route path="/project-portal/:projectName" element={<ProjectPortal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
