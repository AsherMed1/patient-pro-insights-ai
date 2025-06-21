
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/form/:slug" element={<PublicForm />} />
      <Route path="/project/:projectName" element={<ProjectPortal />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/api-docs" element={
        <ProtectedRoute>
          <ApiDocs />
        </ProtectedRoute>
      } />
      <Route path="/csv-import-history" element={
        <ProtectedRoute>
          <CsvImportHistory />
        </ProtectedRoute>
      } />
      <Route path="/undo-import" element={
        <ProtectedRoute>
          <UndoImport />
        </ProtectedRoute>
      } />
      <Route path="/agent-claim" element={
        <ProtectedRoute>
          <AgentClaim />
        </ProtectedRoute>
      } />
      <Route path="/security" element={
        <ProtectedRoute>
          <SecurityCenter />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
