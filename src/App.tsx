
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProjectAuthProvider } from "./hooks/useProjectAuth";
import { AuthGuard } from "./components/auth/AuthGuard";
import { ProjectAuthGuard } from "./components/auth/ProjectAuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminSignup from "./pages/AdminSignup";
import AgentClaim from "./pages/AgentClaim";
import ApiDocs from "./pages/ApiDocs";
import ProjectPortal from "./pages/ProjectPortal";
import ProjectLogin from "./pages/ProjectLogin";
import UserSettings from "./pages/UserSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProjectAuthProvider>
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
              <Route path="/agent-claim" element={
                <AuthGuard>
                  <AgentClaim />
                </AuthGuard>
              } />
              <Route path="/api-docs" element={
                <AuthGuard requiredRole={['admin', 'agent']}>
                  <ApiDocs />
                </AuthGuard>
              } />
              <Route path="/project/:projectName/login" element={<ProjectLogin />} />
              <Route path="/project/:projectName" element={
                <ProjectAuthGuard>
                  <ProjectPortal />
                </ProjectAuthGuard>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ProjectAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
