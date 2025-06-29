
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
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
import AgentPerformanceDashboard from "@/components/AgentPerformanceDashboard";

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

          <TabsContent value="agent-performance" className="space-y-6">
            <AgentPerformanceDashboard />
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
