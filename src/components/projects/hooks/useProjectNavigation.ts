
import { useNavigate } from 'react-router-dom';
import { Project } from '../types';

export const useProjectNavigation = () => {
  const navigate = useNavigate();

  const handleViewProject = (project: Project) => {
    navigate(`/project/${encodeURIComponent(project.project_name)}`);
  };

  return {
    handleViewProject,
  };
};
