
import React, { useState } from 'react';
import { Project, ProjectFormData } from '../types';
import { useProjectData } from './useProjectData';
import { useProjectOperations } from './useProjectOperations';
import { useProjectDialogs } from './useProjectDialogs';
import { useProjectNavigation } from './useProjectNavigation';

export const useProjectsManager = () => {
  const [activeTab, setActiveTab] = useState('active');

  const {
    projects,
    projectStats,
    loading,
    fetchProjectsAndStats
  } = useProjectData();

  const {
    addProject,
    editProject,
    toggleProjectStatus,
    deleteProject
  } = useProjectOperations();

  const {
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingProject,
    openEditDialog,
    closeEditDialog,
  } = useProjectDialogs();

  const { handleViewProject } = useProjectNavigation();

  // Initialize data fetch
  React.useEffect(() => {
    fetchProjectsAndStats();
  }, []);

  const handleAddProject = async (data: ProjectFormData) => {
    const success = await addProject(data);
    if (success) {
      setIsAddDialogOpen(false);
      await fetchProjectsAndStats();
    }
  };

  const handleEditProject = async (data: ProjectFormData) => {
    if (!editingProject) return;

    const success = await editProject(editingProject, data);
    if (success) {
      closeEditDialog();
      await fetchProjectsAndStats();
    }
  };

  const handleToggleProjectStatus = async (project: Project) => {
    const success = await toggleProjectStatus(project);
    if (success) {
      await fetchProjectsAndStats();
    }
  };

  const handleDeleteProject = async (project: Project) => {
    const success = await deleteProject(project);
    if (success) {
      await fetchProjectsAndStats();
    }
  };

  return {
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
  };
};
