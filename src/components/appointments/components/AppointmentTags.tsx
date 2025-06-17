
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, Plus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectTag } from '@/components/projects/types/tagTypes';

interface AppointmentTagsProps {
  appointmentId: string;
  projectName: string;
}

interface AppointmentTagWithDetails {
  id: string;
  appointment_id: string;
  project_tag_id: string;
  project_tags: ProjectTag;
}

const AppointmentTags = ({ appointmentId, projectName }: AppointmentTagsProps) => {
  const [appointmentTags, setAppointmentTags] = useState<AppointmentTagWithDetails[]>([]);
  const [availableTags, setAvailableTags] = useState<ProjectTag[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [appointmentId, projectName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get project ID first
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('project_name', projectName)
        .single();

      if (!project) return;

      // Fetch appointment tags with tag details
      const { data: appointmentTagsData, error: appointmentTagsError } = await supabase
        .from('appointment_tags')
        .select(`
          id,
          appointment_id,
          project_tag_id,
          project_tags (*)
        `)
        .eq('appointment_id', appointmentId);

      if (appointmentTagsError) throw appointmentTagsError;

      // Fetch all available tags for this project
      const { data: availableTagsData, error: availableTagsError } = await supabase
        .from('project_tags')
        .select('*')
        .eq('project_id', project.id)
        .order('tag_name');

      if (availableTagsError) throw availableTagsError;

      setAppointmentTags(appointmentTagsData as AppointmentTagWithDetails[] || []);
      setAvailableTags(availableTagsData || []);
    } catch (error) {
      console.error('Error fetching tag data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('appointment_tags')
        .insert({
          appointment_id: appointmentId,
          project_tag_id: tagId,
        });

      if (error) throw error;

      fetchData();
      toast({
        title: "Success",
        description: "Tag added to appointment",
      });
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive",
      });
    }
  };

  const removeTag = async (appointmentTagId: string) => {
    try {
      const { error } = await supabase
        .from('appointment_tags')
        .delete()
        .eq('id', appointmentTagId);

      if (error) throw error;

      fetchData();
      toast({
        title: "Success",
        description: "Tag removed from appointment",
      });
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: "Error",
        description: "Failed to remove tag",
        variant: "destructive",
      });
    }
  };

  const getAvailableTagsForDropdown = () => {
    const assignedTagIds = appointmentTags.map(at => at.project_tag_id);
    return availableTags.filter(tag => !assignedTagIds.includes(tag.id));
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        Loading tags...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Display assigned tags */}
      {appointmentTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {appointmentTags.map((appointmentTag) => (
            <Badge
              key={appointmentTag.id}
              variant="secondary"
              style={{ 
                backgroundColor: appointmentTag.project_tags.tag_color, 
                color: 'white' 
              }}
              className="text-xs font-medium flex items-center gap-1"
            >
              {appointmentTag.project_tags.tag_name}
              <button
                onClick={() => removeTag(appointmentTag.id)}
                className="ml-1 hover:bg-black/20 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add tag dropdown */}
      {getAvailableTagsForDropdown().length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {getAvailableTagsForDropdown().map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onClick={() => addTag(tag.id)}
                className="flex items-center space-x-2"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.tag_color }}
                />
                <span>{tag.tag_name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {appointmentTags.length === 0 && getAvailableTagsForDropdown().length === 0 && (
        <div className="text-xs text-gray-500 italic">
          No tags available. Create tags in the Tag Manager first.
        </div>
      )}
    </div>
  );
};

export default AppointmentTags;
