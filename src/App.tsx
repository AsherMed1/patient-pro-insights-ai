import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <RadixToaster />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            {/* Keep all other existing routes wrapped in ProtectedRoute */}
            <Route 
              path="/csv-import-history" 
              element={
                <ProtectedRoute>
                  <CsvImportHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/undo-import" 
              element={
                <ProtectedRoute>
                  <UndoImport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/api-docs" 
              element={
                <ProtectedRoute>
                  <ApiDocs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agent-claim" 
              element={
                <ProtectedRoute>
                  <AgentClaim />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/forms" 
              element={
                <ProtectedRoute>
                  <FormManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/form/:slug" 
              element={<PublicForm />} 
            />
            <Route 
              path="/project-portal/:projectName" 
              element={<ProjectPortal />} 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
