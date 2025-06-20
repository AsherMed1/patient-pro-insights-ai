
import { useState, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Undo2, User } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserProfile } from "@/components/UserProfile";

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
  const [showUserProfile, setShowUserProfile] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with User Info */}
        <div className="flex justify-between items-center">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">Call Center Analytics Dashboard</h1>
            <p className="text-xl text-gray-600">Comprehensive tracking and management system</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="font-medium text-gray-900">
                  {user.user_metadata?.full_name || user.email}
                </p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUserProfile(!showUserProfile)}
              className="flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Button>
          </div>
        </div>

        {/* User Profile Modal */}
        {showUserProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserProfile(false)}
                className="absolute -top-2 -right-2 z-10"
              >
                ×
              </Button>
              <UserProfile />
            </div>
          </div>
        )}

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
