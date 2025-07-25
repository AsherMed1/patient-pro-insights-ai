
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { AuthGuard } from "./components/auth/AuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminSignup from "./pages/AdminSignup";
import AgentClaim from "./pages/AgentClaim";
import ApiDocs from "./pages/ApiDocs";
import ProjectPortal from "./pages/ProjectPortal";
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-signup" element={<AdminSignup />} />
            <Route path="/" element={
              <AuthGuard>
                <Index />
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
            <Route path="/project/:projectName" element={<ProjectPortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
