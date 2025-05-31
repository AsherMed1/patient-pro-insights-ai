
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import CampaignDashboard from '../components/CampaignDashboard';
import CallCenterDashboard from '../components/CallCenterDashboard';
import AccountHealthDashboard from '../components/AccountHealthDashboard';
import AIAssistant from '../components/AIAssistant';
import { Shield, BarChart3, Phone, Users, MessageSquare } from 'lucide-react';
import { clientDisplayNames } from '@/config/googleSheets';

const Index = () => {
  const [selectedClient, setSelectedClient] = useState('texas-vascular-institute');
  
  const clients = [
    { id: 'texas-vascular-institute', name: 'Texas Vascular Institute', status: 'active' },
    { id: 'advanced-dermatology-center', name: 'Advanced Dermatology Center', status: 'active' },
    { id: 'call-center-analytics', name: 'Call Center Analytics', status: 'active' },
  ];

  const currentClient = clients.find(c => c.id === selectedClient);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Patient Pro Marketing</h1>
                <p className="text-sm text-gray-600">Multi-Client Analytics Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">Secure Access</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Client Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Client Selection</span>
            </CardTitle>
            <CardDescription>
              Select a client to view their performance data and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center space-x-2">
                        <span>{client.name}</span>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {currentClient && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Selected:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {currentClient.name}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="campaign" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
            <TabsTrigger value="campaign" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Campaign Performance</span>
            </TabsTrigger>
            <TabsTrigger value="calls" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Call Center</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Account Health</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Ask the Data</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaign">
            <CampaignDashboard clientId={selectedClient} />
          </TabsContent>

          <TabsContent value="calls">
            <CallCenterDashboard clientId={selectedClient} />
          </TabsContent>

          <TabsContent value="health">
            <AccountHealthDashboard clientId={selectedClient} />
          </TabsContent>

          <TabsContent value="ai">
            <AIAssistant clientId={selectedClient} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
