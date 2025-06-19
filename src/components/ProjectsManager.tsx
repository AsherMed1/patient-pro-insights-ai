
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen } from 'lucide-react';
import { AddProjectDialog } from './projects/AddProjectDialog';
import { EditProjectDialog } from './projects/EditProjectDialog';
import { ProjectsList } from './projects/ProjectsList';
import { useProjectsManager } from './projects/hooks/useProjectsManager';

const ProjectsManager = () => {
  const {
    projects,
    projectStats,
    loading,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingProject,
    activeTab,
    setActiveTab,
    handleAddProject,
    handleEditProject,
    handleToggleProjectStatus,
    handleDeleteProject,
    handleViewProject,
    openEditDialog,
  } = useProjectsManager();

  const activeProjects = projects.filter(p => p.active);
  const inactiveProjects = projects.filter(p => !p.active);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <span>Loading projects...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5" />
              <span>Projects Management</span>
            </CardTitle>
            <CardDescription>
              Manage your active and inactive projects
            </CardDescription>
          </div>
          <AddProjectDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onProjectAdded={handleAddProject}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active Projects ({activeProjects.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive Projects ({inactiveProjects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <ProjectsList
              projects={activeProjects}
              projectStats={projectStats}
              onEdit={openEditDialog}
              onDelete={handleDeleteProject}
              onToggleStatus={handleToggleProjectStatus}
              onView={handleViewProject}
            />
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            <ProjectsList
              projects={inactiveProjects}
              projectStats={projectStats}
              onEdit={openEditDialog}
              onDelete={handleDeleteProject}
              onToggleStatus={handleToggleProjectStatus}
              onView={handleViewProject}
            />
          </TabsContent>
        </Tabs>

        {editingProject && (
          <EditProjectDialog
            project={editingProject}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onProjectUpdated={handleEditProject}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectsManager;
