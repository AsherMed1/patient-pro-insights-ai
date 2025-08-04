
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { AuthGuard } from "./components/auth/AuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminSignup from "./pages/AdminSignup";
import AgentClaim from "./pages/AgentClaim";
import ApiDocs from "./pages/ApiDocs";
import ProjectPortal from "./pages/ProjectPortal";
import UserSettings from "./pages/UserSettings";
import NotFound from "./pages/NotFound";

// Wrapper component for project portal with auth guard
const ProjectPortalWithAuth = () => {
  const { projectName } = useParams<{ projectName: string }>();
  return (
    <AuthGuard projectName={projectName}>
      <ProjectPortal />
    </AuthGuard>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-signup" element={<AdminSignup />} />
            <Route path="/" element={
              <AuthGuard>
                <Index />
              </AuthGuard>
            } />
            <Route path="/settings" element={
              <AuthGuard>
                <UserSettings />
              </AuthGuard>
            } />
            <Route path="/agent-claim" element={<AgentClaim />} />
            <Route path="/api-docs" element={
              <AuthGuard requiredRole={['admin', 'agent']}>
                <ApiDocs />
              </AuthGuard>
            } />
            <Route path="/project/:projectName" element={<ProjectPortalWithAuth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
