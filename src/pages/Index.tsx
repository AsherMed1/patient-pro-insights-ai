
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import ConnectionTester from "@/components/ConnectionTester";
import GoHighLevelDashboard from "@/components/GoHighLevelDashboard";
import CallCenterDashboard from "@/components/CallCenterDashboard";
import CampaignDashboard from "@/components/CampaignDashboard";
import AccountHealthDashboard from "@/components/AccountHealthDashboard";
import AIAssistant from "@/components/AIAssistant";
import { getClientDisplayName } from "@/config/googleSheets";

const queryClient = new QueryClient();

const Index = () => {
  // Default to account management sheet since it has all the campaign data
  const [selectedClient, setSelectedClient] = useState("account-management");

  const clientOptions = [
    { id: "account-management", name: "Account Management" },
    { id: "texas-vascular-institute", name: "Texas Vascular Institute" },
    { id: "naadi-healthcare", name: "Naadi Healthcare" },
    { id: "houston-vascular-care", name: "Houston Vascular Care" },
    { id: "ally-vascular-pain-centers", name: "Ally Vascular & Pain Centers" },
    { id: "call-center-analytics", name: "Call Center Analytics" },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Healthcare Marketing Dashboard
              </h1>
              <p className="text-gray-600 mb-4">
                Monitor your campaigns, track performance, and optimize results
              </p>
              
              {/* Client Selector */}
              <div className="flex items-center space-x-2">
                <label htmlFor="client-select" className="text-sm font-medium text-gray-700">
                  Client:
                </label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Tabs defaultValue="campaigns" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="call-center">Call Center</TabsTrigger>
                <TabsTrigger value="account-health">Account Health</TabsTrigger>
                <TabsTrigger value="crm">GoHighLevel CRM</TabsTrigger>
                <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
                <TabsTrigger value="connection-test">Connection Test</TabsTrigger>
              </TabsList>
              
              <TabsContent value="campaigns" className="space-y-6">
                <CampaignDashboard clientId={selectedClient} />
              </TabsContent>
              
              <TabsContent value="call-center" className="space-y-6">
                <CallCenterDashboard clientId={selectedClient} />
              </TabsContent>
              
              <TabsContent value="account-health" className="space-y-6">
                <AccountHealthDashboard clientId={selectedClient} />
              </TabsContent>
              
              <TabsContent value="crm" className="space-y-6">
                <GoHighLevelDashboard />
              </TabsContent>
              
              <TabsContent value="ai-assistant" className="space-y-6">
                <AIAssistant clientId={selectedClient} />
              </TabsContent>
              
              <TabsContent value="connection-test" className="space-y-6">
                <ConnectionTester />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default Index;
