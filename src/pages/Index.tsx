
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AccountHealthDashboard from "@/components/AccountHealthDashboard";
import AIAssistant from "@/components/AIAssistant";
import ProjectsManager from "@/components/ProjectsManager";
import MasterDatabaseStats from "@/components/MasterDatabaseStats";
import NewLeadsManager from "@/components/NewLeadsManager";
import AllCallsManager from "@/components/AllCallsManager";
import SpeedToLeadManager from "@/components/SpeedToLeadManager";
import AllAppointmentsManager from "@/components/AllAppointmentsManager";
import AgentManager from "@/components/AgentManager";
import AgentPerformanceDashboard from "@/components/AgentPerformanceDashboard";

const Index = () => {
  // Default clientId for components that require it
  const defaultClientId = "default-client";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Patient Pro Marketing Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive analytics and management for your medical marketing campaigns
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="callcenterstats">Call Center Stats</TabsTrigger>
            <TabsTrigger value="agentperformance">Agent Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MasterDatabaseStats />
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Use the tabs above to navigate between different sections:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Health:</strong> Account health monitoring</li>
                      <li>• <strong>Projects:</strong> View and manage active projects</li>
                      <li>• <strong>Call Center Stats:</strong> View leads, calls, appointments, and agent data</li>
                      <li>• <strong>Agent Performance:</strong> Real-time agent performance dashboard</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
            <AIAssistant clientId={defaultClientId} />
          </TabsContent>

          <TabsContent value="health">
            <AccountHealthDashboard clientId={defaultClientId} />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsManager />
          </TabsContent>

          <TabsContent value="callcenterstats" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Call Center Statistics</h2>
              <p className="text-gray-600">View and analyze call center performance data</p>
            </div>
            
            <Tabs defaultValue="newleads" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="newleads">New Leads</TabsTrigger>
                <TabsTrigger value="allcalls">All Calls</TabsTrigger>
                <TabsTrigger value="speedtolead">Speed to Lead</TabsTrigger>
                <TabsTrigger value="appointments">All Appointments</TabsTrigger>
                <TabsTrigger value="agents">Agents</TabsTrigger>
              </TabsList>

              <TabsContent value="newleads">
                <NewLeadsManager viewOnly={true} />
              </TabsContent>

              <TabsContent value="allcalls">
                <AllCallsManager viewOnly={true} />
              </TabsContent>

              <TabsContent value="speedtolead">
                <SpeedToLeadManager viewOnly={false} />
              </TabsContent>

              <TabsContent value="appointments">
                <AllAppointmentsManager viewOnly={true} />
              </TabsContent>

              <TabsContent value="agents">
                <AgentManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="agentperformance">
            <AgentPerformanceDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
