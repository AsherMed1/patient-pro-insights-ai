
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";
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
import MasterDatabaseStats from "@/components/MasterDatabaseStats";
import CallTeamTab from "@/components/callteam/CallTeamTab";
import UserManagement from "@/components/UserManagement";
import TeamMessagesManager from "@/components/TeamMessagesManager";
import ReschedulesManager from "@/components/ReschedulesManager";
import InsuranceQueueTrigger from "@/components/InsuranceQueueTrigger";
import { useAutoIntakeParsing } from "@/hooks/useAutoIntakeParsing";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReschedulesCount, setPendingReschedulesCount] = useState(0);
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

  // Fetch pending reschedules count
  useEffect(() => {
    const fetchPendingReschedulesCount = async () => {
      const { count } = await supabase
        .from('appointment_reschedules')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false);
      
      setPendingReschedulesCount(count || 0);
    };

    fetchPendingReschedulesCount();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('pending-reschedules-count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointment_reschedules',
      }, fetchPendingReschedulesCount)
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
              <h1 className="text-4xl font-bold text-foreground">Your Projects</h1>
              <p className="text-xl text-muted-foreground">
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">Call Center Analytics Dashboard</h1>
            <p className="text-xl text-gray-600">Comprehensive tracking and management system</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm text-gray-600">{user?.email} ({role})</span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/settings')}
                  className="text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Settings
                </Button>
                {(role === 'admin') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveTab('users')}
                    className="text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Admin Control
                  </Button>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${hasManagementAccess() ? 'grid-cols-5 lg:grid-cols-11' : 'grid-cols-5 lg:grid-cols-10'}`}>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="call-team">Call Team</TabsTrigger>
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
            <TabsTrigger value="reschedules">
              Reschedules
              {pendingReschedulesCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingReschedulesCount}
                </Badge>
              )}
            </TabsTrigger>
            {hasManagementAccess() && (
              <TabsTrigger value="users">Users</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <MasterDatabaseStats />
            <CallCenterDashboard projectId="ALL" />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <InsuranceQueueTrigger />
            <AllAppointmentsManager />
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            <AllCallsManager />
          </TabsContent>

          <TabsContent value="call-team" className="space-y-6">
            <CallTeamTab />
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

          <TabsContent value="reschedules" className="space-y-6">
            <ReschedulesManager />
          </TabsContent>

          {hasManagementAccess() && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
