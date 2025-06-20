
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    <span className="ml-2">Loading...</span>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <RadixToaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/form/:slug" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PublicForm />
              </Suspense>
            } />
            <Route path="/project-portal/:projectName" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ProjectPortal />
              </Suspense>
            } />
            <Route path="/" element={
              <AuthGuard>
                <Index />
              </AuthGuard>
            } />
            <Route path="/csv-import-history" element={
              <AuthGuard>
                <Suspense fallback={<LoadingSpinner />}>
                  <CsvImportHistory />
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/undo-import" element={
              <AuthGuard>
                <Suspense fallback={<LoadingSpinner />}>
                  <UndoImport />
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/api-docs" element={
              <AuthGuard>
                <Suspense fallback={<LoadingSpinner />}>
                  <ApiDocs />
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/agent-claim" element={
              <AuthGuard>
                <Suspense fallback={<LoadingSpinner />}>
                  <AgentClaim />
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/forms" element={
              <AuthGuard>
                <Suspense fallback={<LoadingSpinner />}>
                  <FormManagement />
                </Suspense>
              </AuthGuard>
            } />
            <Route path="*" element={
              <Suspense fallback={<LoadingSpinner />}>
                <NotFound />
              </Suspense>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
