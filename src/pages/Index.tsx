
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CampaignDashboard from "@/components/CampaignDashboard";
import GoHighLevelDashboard from "@/components/GoHighLevelDashboard";
import CallCenterDashboard from "@/components/CallCenterDashboard";
import AccountHealthDashboard from "@/components/AccountHealthDashboard";
import AIAssistant from "@/components/AIAssistant";
import ClientManager from "@/components/ClientManager";
import DataSyncManager from "@/components/DataSyncManager";
import MasterDatabaseStats from "@/components/MasterDatabaseStats";
import NewLeadsManager from "@/components/NewLeadsManager";
import AllCallsManager from "@/components/AllCallsManager";
import SpeedToLeadManager from "@/components/SpeedToLeadManager";

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
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="gohighlevel">GoHighLevel</TabsTrigger>
            <TabsTrigger value="callcenter">Call Center</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="sync">Data Sync</TabsTrigger>
            <TabsTrigger value="leads">New Leads</TabsTrigger>
            <TabsTrigger value="calls">All Calls</TabsTrigger>
            <TabsTrigger value="speed">Speed to Lead</TabsTrigger>
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
                      <li>• <strong>Campaigns:</strong> View campaign performance metrics</li>
                      <li>• <strong>GoHighLevel:</strong> CRM integration and lead tracking</li>
                      <li>• <strong>Call Center:</strong> Call analytics and performance</li>
                      <li>• <strong>Health:</strong> Account health monitoring</li>
                      <li>• <strong>Clients:</strong> Manage client information</li>
                      <li>• <strong>Data Sync:</strong> Synchronize data from Google Sheets</li>
                      <li>• <strong>New Leads:</strong> Track and manage new leads</li>
                      <li>• <strong>All Calls:</strong> Record and manage call data</li>
                      <li>• <strong>Speed to Lead:</strong> Track lead response time statistics</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
            <AIAssistant clientId={defaultClientId} />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignDashboard clientId={defaultClientId} />
          </TabsContent>

          <TabsContent value="gohighlevel">
            <GoHighLevelDashboard />
          </TabsContent>

          <TabsContent value="callcenter">
            <CallCenterDashboard clientId={defaultClientId} />
          </TabsContent>

          <TabsContent value="health">
            <AccountHealthDashboard clientId={defaultClientId} />
          </TabsContent>

          <TabsContent value="clients">
            <ClientManager />
          </TabsContent>

          <TabsContent value="sync">
            <DataSyncManager />
          </TabsContent>

          <TabsContent value="leads">
            <NewLeadsManager />
          </TabsContent>

          <TabsContent value="calls">
            <AllCallsManager />
          </TabsContent>

          <TabsContent value="speed">
            <SpeedToLeadManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
