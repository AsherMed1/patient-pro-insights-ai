
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CallCenterDashboard from "@/components/CallCenterDashboard";
import AllAppointmentsManager from "@/components/AllAppointmentsManager";
import AllCallsManager from "@/components/AllCallsManager";
import NewLeadsManager from "@/components/NewLeadsManager";
import SpeedToLeadManager from "@/components/SpeedToLeadManager";
import AgentManager from "@/components/AgentManager";
import ProjectsManager from "@/components/ProjectsManager";
import ClientManager from "@/components/ClientManager";
import MasterDatabaseStats from "@/components/MasterDatabaseStats";
import AllAppointmentsApiDocs from "@/components/AllAppointmentsApiDocs";
import AllCallsApiDocs from "@/components/AllCallsApiDocs";
import NewLeadApiDocs from "@/components/NewLeadApiDocs";
import AgentAppointmentClaimForm from "@/components/AgentAppointmentClaimForm";

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
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="claim">Claim Appt</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="leads">New Leads</TabsTrigger>
            <TabsTrigger value="speed">Speed to Lead</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="api">API Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <MasterDatabaseStats />
            <CallCenterDashboard projectId="project-1" />
          </TabsContent>

          <TabsContent value="claim" className="space-y-6">
            <AgentAppointmentClaimForm />
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

          <TabsContent value="clients" className="space-y-6">
            <ClientManager />
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Tabs defaultValue="appointments-api" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="appointments-api">Appointments API</TabsTrigger>
                <TabsTrigger value="calls-api">Calls API</TabsTrigger>
                <TabsTrigger value="leads-api">New Leads API</TabsTrigger>
              </TabsList>
              <TabsContent value="appointments-api">
                <AllAppointmentsApiDocs />
              </TabsContent>
              <TabsContent value="calls-api">
                <AllCallsApiDocs />
              </TabsContent>
              <TabsContent value="leads-api">
                <NewLeadApiDocs />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
