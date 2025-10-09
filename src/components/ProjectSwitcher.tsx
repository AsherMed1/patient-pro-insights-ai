import { useState, useEffect } from 'react';
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
import { ChevronDown, Building2, ArrowLeft, Pin } from 'lucide-react';

interface ProjectSwitcherProps {
  currentProject?: string;
  showBackToDashboard?: boolean;
}

export const ProjectSwitcher = ({ currentProject, showBackToDashboard = false }: ProjectSwitcherProps) => {
  const { accessibleProjects, isProjectUser } = useRole();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [pinnedProjects, setPinnedProjects] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('pinnedProjects');
    if (stored) {
      setPinnedProjects(JSON.parse(stored));
    }
  }, []);

  const togglePin = (projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = pinnedProjects.includes(projectName)
      ? pinnedProjects.filter(p => p !== projectName)
      : [...pinnedProjects, projectName];
    setPinnedProjects(newPinned);
    localStorage.setItem('pinnedProjects', JSON.stringify(newPinned));
  };

  const sortedProjects = [...accessibleProjects].sort((a, b) => {
    const aIsPinned = pinnedProjects.includes(a);
    const bIsPinned = pinnedProjects.includes(b);
    
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    
    return a.localeCompare(b);
  });

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
        
        {sortedProjects.map((projectName) => (
          <DropdownMenuItem
            key={projectName}
            onClick={() => handleProjectSelect(projectName)}
            className={`cursor-pointer ${
              currentProject === projectName ? 'bg-accent' : ''
            }`}
          >
            <Building2 className="h-4 w-4 mr-2" />
            <span className="truncate flex-1">{projectName}</span>
            <div className="flex items-center gap-1 ml-2">
              {currentProject === projectName && (
                <span className="text-xs text-muted-foreground">Current</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => togglePin(projectName, e)}
              >
                <Pin className={`h-3 w-3 ${pinnedProjects.includes(projectName) ? 'fill-current text-primary' : 'text-muted-foreground'}`} />
              </Button>
            </div>
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