
import React from 'react';
import { ProjectCard } from './ProjectCard';
import { Project, ProjectStats } from './types';

interface ProjectsListProps {
  projects: Project[];
  projectStats: ProjectStats[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onToggleStatus: (project: Project) => void;
  onView: (project: Project) => void;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  projectStats,
  onEdit,
  onDelete,
  onToggleStatus,
  onView,
}) => {
  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No projects found.</p>
        <p className="text-sm">Click "Add Project" to create your first project.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => {
        const stats = projectStats.find(s => s.project_name === project.project_name);
        
        return (
          <ProjectCard
            key={project.id}
            project={project}
            stats={stats}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            onView={onView}
          />
        );
      })}
    </div>
  );
};
