
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

import UserManagement from "@/components/UserManagement";
import { useAutoIntakeParsing } from "@/hooks/useAutoIntakeParsing";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
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

  if (roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Project users with multiple projects see a project selection dashboard
  if (isProjectUser()) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Your Projects</h1>
              <p className="text-xl text-gray-600">Select a project to view its dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm text-gray-600">{user?.email}</span>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accessibleProjects.map((projectName) => (
              <Button
                key={projectName}
                variant="outline"
                className="h-24 text-left justify-start"
                onClick={() => navigate(`/project/${encodeURIComponent(projectName)}`)}
              >
                <div>
                  <h3 className="font-semibold">{projectName}</h3>
                  <p className="text-sm text-gray-600">View project dashboard</p>
                </div>
              </Button>
            ))}
          </div>
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
          <TabsList className={`grid w-full ${hasManagementAccess() ? 'grid-cols-4 lg:grid-cols-8' : 'grid-cols-4 lg:grid-cols-7'}`}>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="leads">New Leads</TabsTrigger>
            <TabsTrigger value="speed">Speed to Lead</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            {hasManagementAccess() && (
              <TabsTrigger value="users">Users</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <MasterDatabaseStats />
            <CallCenterDashboard projectId="ALL" />
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
