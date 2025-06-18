
import { useState, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy } from "react";

// Only lazy load the most essential components to reduce initial bundle
const CallCenterDashboard = lazy(() => import("@/components/CallCenterDashboard"));
const AllAppointmentsManager = lazy(() => import("@/components/AllAppointmentsManager"));
const ProjectsManager = lazy(() => import("@/components/ProjectsManager"));

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
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

          <TabsContent value="projects" className="space-y-6">
            <Suspense fallback={<LoadingSpinner />}>
              <ProjectsManager />
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
