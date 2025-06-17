
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectFormData } from '../types';
import { useProjectData } from './useProjectData';
import { useProjectOperations } from './useProjectOperations';

export const useProjectsManager = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const navigate = useNavigate();

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
      setIsEditDialogOpen(false);
      setEditingProject(null);
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

  const handleViewProject = (project: Project) => {
    navigate(`/project/${encodeURIComponent(project.project_name)}`);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
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
