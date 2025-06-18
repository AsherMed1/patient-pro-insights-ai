
import { useState, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy } from "react";

// Lazy load all heavy components
const CallCenterDashboard = lazy(() => import("@/components/CallCenterDashboard"));
const AllAppointmentsManager = lazy(() => import("@/components/AllAppointmentsManager"));
const AllCallsManager = lazy(() => import("@/components/AllCallsManager"));
const NewLeadsManager = lazy(() => import("@/components/NewLeadsManager"));
const SpeedToLeadManager = lazy(() => import("@/components/SpeedToLeadManager"));
const AgentManager = lazy(() => import("@/components/AgentManager"));
const ProjectsManager = lazy(() => import("@/components/ProjectsManager"));
const AdSpendManager = lazy(() => import("@/components/AdSpendManager"));
const AIAssistant = lazy(() => import("@/components/AIAssistant"));
const FormManagement = lazy(() => import("@/components/forms/FormManagement"));
const AgentPerformanceDashboard = lazy(() => import("@/components/AgentPerformanceDashboard"));

// Loading component for suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    <span className="ml-2">Loading...</span>
  </div>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Call Center Analytics Dashboard</h1>
          <p className="text-xl text-gray-600">Comprehensive tracking and management system</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-11">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="leads">New Leads</TabsTrigger>
            <TabsTrigger value="speed">Speed to Lead</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="agent-performance">Agent Performance</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="adspend">Ad Spend</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <CallCenterDashboard projectId="project-1" />
            </Suspense>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <AllAppointmentsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <AllCallsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <NewLeadsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="speed" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <SpeedToLeadManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <AgentManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="agent-performance" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <AgentPerformanceDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <ProjectsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <FormManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="adspend" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <AdSpendManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <AIAssistant clientId="project-1" />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Link to="/csv-import-history">
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CSV Import History
                </Button>
              </Link>
              <Link to="/undo-import">
                <Button variant="outline" className="flex items-center gap-2">
                  <Undo2 className="h-4 w-4" />
                  Undo Last Import
                </Button>
              </Link>
              <Link to="/api-docs">
                <Button variant="outline">
                  API Documentation
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
