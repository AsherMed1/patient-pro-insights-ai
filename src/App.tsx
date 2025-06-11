
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProjectPortal from "./pages/ProjectPortal";
import PublicForm from "./pages/PublicForm";
import ApiDocs from "./pages/ApiDocs";
import AgentClaim from "./pages/AgentClaim";
import UndoImport from "./pages/UndoImport";
import CsvImportHistory from "./pages/CsvImportHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/form/:slug" element={<PublicForm />} />
            <Route path="/agent-claim" element={<AgentClaim />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            
            <Route path="/project/:projectName" element={
              <ProtectedRoute>
                <ProjectPortal />
              </ProtectedRoute>
            } />
            
            <Route path="/api-docs" element={
              <ProtectedRoute requiredRole="manager">
                <ApiDocs />
              </ProtectedRoute>
            } />
            
            <Route path="/undo-import" element={
              <ProtectedRoute requiredRole="manager">
                <UndoImport />
              </ProtectedRoute>
            } />
            
            <Route path="/csv-import-history" element={
              <ProtectedRoute requiredRole="manager">
                <CsvImportHistory />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
