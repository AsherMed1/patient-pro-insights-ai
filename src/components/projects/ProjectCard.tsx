
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Power, PowerOff, Eye } from "lucide-react";
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { useState } from 'react';

interface Project {
  id: string;
  project_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  project_name: string;
  leads_count: number;
  calls_count: number;
  appointments_count: number;
  confirmed_appointments_count: number;
  ad_spend: number;
  last_activity: string | null;
}

interface ProjectCardProps {
  project: Project;
  stats?: ProjectStats;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onToggleStatus: (project: Project) => void;
  onView?: (project: Project) => void;
}

export const ProjectCard = ({ 
  project, 
  stats, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  onView 
}: ProjectCardProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No activity';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <Card className={`transition-all duration-200 hover:shadow-md ${!project.active ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg line-clamp-1">{project.project_name}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant={project.active ? "default" : "secondary"}>
                  {project.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(project)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleStatus(project)}>
                  {project.active ? (
                    <>
                      <PowerOff className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leads:</span>
                  <span className="font-medium">{stats.leads_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calls:</span>
                  <span className="font-medium">{stats.calls_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Appointments:</span>
                  <span className="font-medium">{stats.appointments_count}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed:</span>
                  <span className="font-medium">{stats.confirmed_appointments_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ad Spend:</span>
                  <span className="font-medium">{formatCurrency(stats.ad_spend)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Activity:</span>
                  <span className="font-medium text-xs">{formatDate(stats.last_activity)}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Created: {new Date(project.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      <DeleteProjectDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        project={project}
        onConfirm={() => {
          onDelete(project);
          setIsDeleteDialogOpen(false);
        }}
      />
    </>
  );
};
