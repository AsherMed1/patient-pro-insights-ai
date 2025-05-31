
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConnectionTester from "@/components/ConnectionTester";
import GoHighLevelDashboard from "@/components/GoHighLevelDashboard";
import CallCenterDashboard from "@/components/CallCenterDashboard";
import CampaignDashboard from "@/components/CampaignDashboard";
import AccountHealthDashboard from "@/components/AccountHealthDashboard";
import AIAssistant from "@/components/AIAssistant";

const queryClient = new QueryClient();

const Index = () => {
  // Default client ID for Texas Vascular Institute
  const defaultClientId = "client-1";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Healthcare Marketing Dashboard
              </h1>
              <p className="text-gray-600">
                Monitor your campaigns, track performance, and optimize results
              </p>
            </div>
            
            <Tabs defaultValue="crm" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="crm">GoHighLevel CRM</TabsTrigger>
                <TabsTrigger value="call-center">Call Center</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="account-health">Account Health</TabsTrigger>
                <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
                <TabsTrigger value="connection-test">Connection Test</TabsTrigger>
              </TabsList>
              
              <TabsContent value="crm" className="space-y-6">
                <GoHighLevelDashboard />
              </TabsContent>
              
              <TabsContent value="call-center" className="space-y-6">
                <CallCenterDashboard clientId={defaultClientId} />
              </TabsContent>
              
              <TabsContent value="campaigns" className="space-y-6">
                <CampaignDashboard clientId={defaultClientId} />
              </TabsContent>
              
              <TabsContent value="account-health" className="space-y-6">
                <AccountHealthDashboard clientId={defaultClientId} />
              </TabsContent>
              
              <TabsContent value="ai-assistant" className="space-y-6">
                <AIAssistant clientId={defaultClientId} />
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
