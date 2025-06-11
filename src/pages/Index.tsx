
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import ProjectsManager from '@/components/ProjectsManager';
import NewLeadsManager from '@/components/NewLeadsManager';
import AllCallsManager from '@/components/AllCallsManager';
import AllAppointmentsManager from '@/components/AllAppointmentsManager';
import AgentManager from '@/components/AgentManager';
import AdSpendManager from '@/components/AdSpendManager';
import AgentPerformanceDashboard from '@/components/AgentPerformanceDashboard';
import CallCenterDashboard from '@/components/CallCenterDashboard';
import AccountHealthDashboard from '@/components/AccountHealthDashboard';
import SpeedToLeadManager from '@/components/SpeedToLeadManager';
import FormManagement from '@/components/forms/FormManagement';
import AIAssistant from '@/components/AIAssistant';
import MasterDatabaseStats from '@/components/MasterDatabaseStats';
import { Badge } from '@/components/ui/badge';

const Index = () => {
  const { user, userRole } = useAuth();

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canManageData = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header with user info */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Patient Pro Marketing Dashboard
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <p className="text-gray-600">Welcome, {user?.email}</p>
              <Badge className={getRoleBadgeColor(userRole)}>
                {userRole || 'Loading...'}
              </Badge>
            </div>
          </div>
          <UserMenu />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid gap-6">
              <MasterDatabaseStats />
              <AccountHealthDashboard />
              <CallCenterDashboard />
              <AgentPerformanceDashboard />
              <SpeedToLeadManager />
            </div>
          </TabsContent>

          <TabsContent value="projects">
            {canManageData ? (
              <ProjectsManager />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">You need manager or admin permissions to manage projects.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads">
            <NewLeadsManager />
          </TabsContent>

          <TabsContent value="calls">
            <AllCallsManager />
          </TabsContent>

          <TabsContent value="appointments">
            <AllAppointmentsManager />
          </TabsContent>

          <TabsContent value="agents">
            <div className="space-y-6">
              <AgentManager />
              {canManageData && <AdSpendManager />}
            </div>
          </TabsContent>

          <TabsContent value="forms">
            {canManageData ? (
              <FormManagement />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">You need manager or admin permissions to manage forms.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-assistant">
            <AIAssistant />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
