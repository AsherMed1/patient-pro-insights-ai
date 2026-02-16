
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";

import patientProLogo from "@/assets/patient-pro-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useNavigate } from "react-router-dom";
import CallCenterDashboard from "@/components/CallCenterDashboard";
import AllAppointmentsManager from "@/components/AllAppointmentsManager";
import AllCallsManager from "@/components/AllCallsManager";
import NewLeadsManager from "@/components/NewLeadsManager";
import SpeedToLeadManager from "@/components/SpeedToLeadManager";
import AgentManager from "@/components/AgentManager";
import ProjectsManager from "@/components/ProjectsManager";
import { EmrProcessingQueue } from "@/components/EmrProcessingQueue";
import MasterDatabaseStats from "@/components/MasterDatabaseStats";
import CallTeamTab from "@/components/callteam/CallTeamTab";
import ProjectCallSummaryTable from "@/components/dashboard/ProjectCallSummaryTable";
import UserManagement from "@/components/UserManagement";
import TeamMessagesManager from "@/components/TeamMessagesManager";
import SupportQueueManager from "@/components/SupportQueueManager";
import InsuranceQueueTrigger from "@/components/InsuranceQueueTrigger";
import HelpVideoManager from "@/components/HelpVideoManager";
import { useAutoIntakeParsing } from "@/hooks/useAutoIntakeParsing";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [supportWaitingCount, setSupportWaitingCount] = useState(0);
  const { user, signOut } = useAuth();
  const { role, hasManagementAccess, isProjectUser, accessibleProjects, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  
  // Initialize automatic intake notes parsing
  useAutoIntakeParsing();

  // Redirect project users to their project portal immediately  
  useEffect(() => {
    if (!roleLoading && isProjectUser() && accessibleProjects.length === 1) {
      navigate(`/project/${encodeURIComponent(accessibleProjects[0])}`);
    } else if (!roleLoading && isProjectUser() && accessibleProjects.length === 0) {
      // If project user has no accessible projects, sign them out
      handleSignOut();
    }
  }, [role, accessibleProjects, roleLoading, isProjectUser, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('project_messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .is('read_at', null);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('unread-messages-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_messages',
      }, fetchUnreadCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch support queue waiting count
  useEffect(() => {
    const fetchSupportWaitingCount = async () => {
      const { count } = await supabase
        .from('support_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_agent');
      
      setSupportWaitingCount(count || 0);
    };

    fetchSupportWaitingCount();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('support-queue-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_conversations',
      }, fetchSupportWaitingCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Handle case where user has no role assigned
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">No Access</h2>
          <p className="text-muted-foreground">Your account doesn't have access to any projects yet.</p>
          <p className="text-sm text-muted-foreground">Please contact your administrator for access.</p>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // Project users with multiple projects see a project selection dashboard
  if (isProjectUser()) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="heading-1">Your Projects</h1>
              <p className="body-lg">
                You have access to {accessibleProjects.length} project{accessibleProjects.length !== 1 ? 's' : ''}. 
                Select one to view its dashboard.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accessibleProjects.map((projectName) => (
              <div
                key={projectName}
                className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/project/${encodeURIComponent(projectName)}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                      {projectName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      View appointments, analytics, and team communication
                    </p>
                  </div>
                  <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    Active Project
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {accessibleProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Available</h3>
              <p className="text-muted-foreground">
                You don't have access to any projects yet. Contact your administrator for access.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={patientProLogo} alt="Patient Pro Logo" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold leading-none">Patient Pro Client Portal</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {user?.email} ({role})
            </span>
            <Button variant="ghost" size="icon" className="h-9 w-9 border-none" onClick={() => navigate('/settings')}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 border-none" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6">
            <TabsList className="inline-flex w-auto min-w-full whitespace-nowrap gap-1 h-auto p-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="emr-queue">EMR Queue</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="call-team">Call Team</TabsTrigger>
            <TabsTrigger value="reporting">Reporting</TabsTrigger>
            <TabsTrigger value="leads">New Leads</TabsTrigger>
            <TabsTrigger value="speed">Speed to Lead</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="messages">
              Messages
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            {hasManagementAccess() && (
              <TabsTrigger value="support-queue">
                Support Queue
                {supportWaitingCount > 0 && (
                  <Badge variant="destructive" className="ml-2 animate-pulse">
                    {supportWaitingCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {hasManagementAccess() && (
              <TabsTrigger value="users">Users</TabsTrigger>
            )}
            {hasManagementAccess() && (
              <TabsTrigger value="help-videos">Help Videos</TabsTrigger>
            )}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <MasterDatabaseStats />
            <CallCenterDashboard projectId="ALL" />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <InsuranceQueueTrigger />
            <AllAppointmentsManager />
          </TabsContent>

          <TabsContent value="emr-queue" className="space-y-6">
            <EmrProcessingQueue />
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            <AllCallsManager />
          </TabsContent>

          <TabsContent value="call-team" className="space-y-6">
            <CallTeamTab />
          </TabsContent>

          <TabsContent value="reporting" className="space-y-6">
            <ProjectCallSummaryTable />
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

          <TabsContent value="messages" className="space-y-6">
            <TeamMessagesManager />
          </TabsContent>

          {hasManagementAccess() && (
            <TabsContent value="support-queue" className="space-y-6">
              <SupportQueueManager />
            </TabsContent>
          )}

          {hasManagementAccess() && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>
          )}

          {hasManagementAccess() && (
            <TabsContent value="help-videos" className="space-y-6">
              <HelpVideoManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
