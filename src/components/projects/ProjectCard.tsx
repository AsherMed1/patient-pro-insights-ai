import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Activity, Edit, Trash2, TrendingUp, ExternalLink, Power, PowerOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { ProjectDetailedDashboard } from './ProjectDetailedDashboard';

interface Project {
  id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
  active: boolean;
}

interface ProjectStats {
  project_name: string;
  leads_count: number;
  calls_count: number;
  appointments_count: number;
  last_activity: string | null;
}

interface ProjectCardProps {
  project: Project;
  stats?: ProjectStats;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onToggleActive: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  stats,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return { status: 'No Activity', color: 'bg-gray-100 text-gray-600' };
    
    const daysSinceActivity = Math.floor(
      (new Date().getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceActivity === 0) return { status: 'Active Today', color: 'bg-green-100 text-green-600' };
    if (daysSinceActivity <= 7) return { status: 'Active This Week', color: 'bg-blue-100 text-blue-600' };
    if (daysSinceActivity <= 30) return { status: 'Active This Month', color: 'bg-yellow-100 text-yellow-600' };
    return { status: 'Inactive', color: 'bg-red-100 text-red-600' };
  };

  const activityStatus = getActivityStatus(stats?.last_activity || null);

  return (
    <Card className={`border-l-4 ${project.active ? 'border-l-blue-500' : 'border-l-gray-300 opacity-60'} ${!project.active ? 'bg-gray-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className={`text-lg font-medium ${!project.active ? 'text-gray-500' : ''}`}>
              {project.project_name}
            </CardTitle>
            {!project.active && (
              <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                Disabled
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs ${activityStatus.color}`}>
              {activityStatus.status}
            </Badge>
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onToggleActive(project)}
                title={project.active ? 'Disable Project' : 'Enable Project'}
              >
                {project.active ? (
                  <PowerOff className="h-3 w-3 text-orange-600" />
                ) : (
                  <Power className="h-3 w-3 text-green-600" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(project)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <DeleteProjectDialog
                project={project}
                onDelete={onDelete}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-lg font-semibold text-blue-600">
              {stats?.leads_count || 0}
            </div>
            <div className="text-xs text-blue-600">Leads</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="text-lg font-semibold text-green-600">
              {stats?.calls_count || 0}
            </div>
            <div className="text-xs text-green-600">Calls</div>
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <div className="text-lg font-semibold text-purple-600">
              {stats?.appointments_count || 0}
            </div>
            <div className="text-xs text-purple-600">Appointments</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Created: {formatDate(project.created_at)}</span>
          </div>
        </div>
        
        {stats?.last_activity && (
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Activity className="h-3 w-3" />
            <span>Last activity: {formatDate(stats.last_activity)}</span>
          </div>
        )}

        {/* Project Portal and Detailed Stats Buttons */}
        <div className="pt-2 space-y-2">
          <Link to={`/project/${encodeURIComponent(project.project_name)}`}>
            <Button 
              variant="default" 
              size="sm" 
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Project Portal
            </Button>
          </Link>
          
          <ProjectDetailedDashboard project={project}>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Detailed Stats
            </Button>
          </ProjectDetailedDashboard>
        </div>
      </CardContent>
    </Card>
  );
};
