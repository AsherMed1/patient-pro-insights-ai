
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Undo2, UserPlus, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import CallCenterDashboard from "@/components/CallCenterDashboard";
import AllAppointmentsManager from "@/components/AllAppointmentsManager";
import AllCallsManager from "@/components/AllCallsManager";
import NewLeadsManager from "@/components/NewLeadsManager";
import SpeedToLeadManager from "@/components/SpeedToLeadManager";
import AgentManager from "@/components/AgentManager";
import ProjectsManager from "@/components/ProjectsManager";
import AdSpendManager from "@/components/AdSpendManager";
import AIAssistant from "@/components/AIAssistant";
import FormManagement from "@/components/forms/FormManagement";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user } = useAuth();

  // If user is not authenticated, show sign-up prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Call Center Analytics</CardTitle>
            <p className="text-gray-600">Please sign up or log in to access the dashboard</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/auth" className="w-full">
              <Button className="w-full flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Sign Up / Log In
              </Button>
            </Link>
            <p className="text-sm text-gray-500 text-center">
              The first user to sign up will automatically become an admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Call Center Analytics Dashboard</h1>
          <p className="text-xl text-gray-600">Comprehensive tracking and management system</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="leads">New Leads</TabsTrigger>
            <TabsTrigger value="speed">Speed to Lead</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="adspend">Ad Spend</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <CallCenterDashboard projectId="project-1" />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <AllAppointmentsManager />
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            <AllCallsManager />
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <NewLeadsManager />
          </TabsContent>

          <TabsContent value="speed" className="space-y-6">
            <SpeedToLeadManager />
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <AgentManager />
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <ProjectsManager />
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <FormManagement />
          </TabsContent>

          <TabsContent value="adspend" className="space-y-6">
            <AdSpendManager />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AIAssistant clientId="project-1" />
          </TabsContent>
        </Tabs>

        {/* Quick Actions Card - moved to bottom */}
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
