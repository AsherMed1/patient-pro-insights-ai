import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CampaignDashboard from "@/components/CampaignDashboard";
import GoHighLevelDashboard from "@/components/GoHighLevelDashboard";
import CallCenterDashboard from "@/components/CallCenterDashboard";
import AccountHealthDashboard from "@/components/AccountHealthDashboard";
import AIAssistant from "@/components/AIAssistant";
import SheetTabSelector from "@/components/SheetTabSelector";
import ConnectionTester from "@/components/ConnectionTester";
import DataSyncManager from "@/components/DataSyncManager";
import MasterDatabaseStats from "@/components/MasterDatabaseStats";

const clientOptions = [
  { id: 'texas-vascular-institute', name: 'Texas Vascular Institute' },
  { id: 'naadi-healthcare', name: 'Naadi Healthcare' },
  { id: 'houston-vascular-care', name: 'Houston Vascular Care' },
  { id: 'ally-vascular-pain-centers', name: 'Ally Vascular & Pain Centers' },
  { id: 'all-clients-master', name: 'All Clients (Master Sheet)' },
];

const Index = () => {
  const [selectedClient, setSelectedClient] = useState('texas-vascular-institute');

  const selectedClientName = clientOptions.find(c => c.id === selectedClient)?.name || 'Unknown Client';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Healthcare Marketing Analytics
          </h1>
          <p className="text-xl text-gray-600">
            Real-time insights from Google Sheets and integrated platforms
          </p>
        </div>

        <Tabs defaultValue="master-database" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="master-database">Master Database</TabsTrigger>
            <TabsTrigger value="dashboard">Live Dashboard</TabsTrigger>
            <TabsTrigger value="gohighlevel">GoHighLevel</TabsTrigger>
            <TabsTrigger value="call-center">Call Center</TabsTrigger>
            <TabsTrigger value="account-health">Account Health</TabsTrigger>
            <TabsTrigger value="admin">Admin Tools</TabsTrigger>
            <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="master-database" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Master Database</h2>
              <p className="text-gray-600">
                Centralized data storage with advanced search and analytics capabilities
              </p>
            </div>
            
            <MasterDatabaseStats />
            <DataSyncManager />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Performance</h2>
                <p className="text-gray-600">Real-time data from Google Sheets</p>
              </div>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Client:</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <Badge variant="outline">{selectedClientName}</Badge>
              </div>
            </div>
            
            <CampaignDashboard clientId={selectedClient} />
          </TabsContent>

          <TabsContent value="gohighlevel" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">GoHighLevel Integration</h2>
              <p className="text-gray-600">CRM data and lead management insights</p>
            </div>
            <GoHighLevelDashboard />
          </TabsContent>

          <TabsContent value="call-center" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Call Center Performance</h2>
              <p className="text-gray-600">Agent performance and call analytics</p>
            </div>
            <CallCenterDashboard clientId={selectedClient} />
          </TabsContent>

          <TabsContent value="account-health" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Health Monitoring</h2>
              <p className="text-gray-600">Overall account performance and health metrics</p>
            </div>
            <AccountHealthDashboard clientId={selectedClient} />
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Tools</h2>
              <p className="text-gray-600">Configuration and testing utilities</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConnectionTester />
              <SheetTabSelector clientId={selectedClient} />
            </div>
          </TabsContent>

          <TabsContent value="ai-assistant" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Assistant</h2>
              <p className="text-gray-600">Get insights and recommendations powered by AI</p>
            </div>
            <AIAssistant clientId={selectedClient} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
