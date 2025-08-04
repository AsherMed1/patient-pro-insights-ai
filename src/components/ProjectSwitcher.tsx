import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Building2, ArrowLeft } from 'lucide-react';

interface ProjectSwitcherProps {
  currentProject?: string;
  showBackToDashboard?: boolean;
}

export const ProjectSwitcher = ({ currentProject, showBackToDashboard = false }: ProjectSwitcherProps) => {
  const { accessibleProjects, isProjectUser } = useRole();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Only show for project users with multiple projects or when explicitly requested
  if (!isProjectUser() || accessibleProjects.length <= 1) {
    if (showBackToDashboard && currentProject) {
      return (
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      );
    }
    return null;
  }

  const handleProjectSelect = (projectName: string) => {
    navigate(`/project/${encodeURIComponent(projectName)}`);
    setIsOpen(false);
  };

  const handleBackToDashboard = () => {
    navigate('/');
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 min-w-[200px]">
          <Building2 className="h-4 w-4" />
          {currentProject ? (
            <span className="truncate">{currentProject}</span>
          ) : (
            <span>Select Project</span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your Projects</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {accessibleProjects.map((projectName) => (
          <DropdownMenuItem
            key={projectName}
            onClick={() => handleProjectSelect(projectName)}
            className={`cursor-pointer ${
              currentProject === projectName ? 'bg-accent' : ''
            }`}
          >
            <Building2 className="h-4 w-4 mr-2" />
            <span className="truncate">{projectName}</span>
            {currentProject === projectName && (
              <span className="ml-auto text-xs text-muted-foreground">Current</span>
            )}
          </DropdownMenuItem>
        ))}
        
        {showBackToDashboard && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBackToDashboard} className="cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};