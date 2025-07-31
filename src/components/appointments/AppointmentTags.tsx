import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface ProjectTag {
  id: string;
  tag_name: string;
  tag_color: string;
  tag_description?: string;
}

interface AppointmentTag {
  id: string;
  project_tag_id: string;
  project_tag?: ProjectTag;
}

interface AppointmentTagsProps {
  appointmentId: string;
  projectName: string;
  onTagsChanged?: () => void;
}

const AppointmentTags = ({ appointmentId, projectName, onTagsChanged }: AppointmentTagsProps) => {
  const [appointmentTags, setAppointmentTags] = useState<AppointmentTag[]>([]);
  const [availableTags, setAvailableTags] = useState<ProjectTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAppointmentTags();
    fetchAvailableTags();
  }, [appointmentId, projectName]);

  const fetchAppointmentTags = async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_tags')
        .select(`
          id,
          project_tag_id,
          project_tags:project_tag_id (
            id,
            tag_name,
            tag_color,
            tag_description
          )
        `)
        .eq('appointment_id', appointmentId);

      if (error) throw error;
      
      const formattedTags = (data || []).map(item => ({
        id: item.id,
        project_tag_id: item.project_tag_id,
        project_tag: Array.isArray(item.project_tags) ? item.project_tags[0] : item.project_tags
      }));
      
      setAppointmentTags(formattedTags);
    } catch (error) {
      console.error('Error fetching appointment tags:', error);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      // Get project ID first
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('project_name', projectName)
        .single();

      if (projectError) throw projectError;

      const { data, error } = await supabase
        .from('project_tags')
        .select('id, tag_name, tag_color, tag_description')
        .eq('project_id', project.id)
        .order('tag_name');

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching available tags:', error);
    }
  };

  const addTag = async () => {
    if (!selectedTagId) return;

    try {
      setLoading(true);
      
      // Check if tag already exists
      if (appointmentTags.some(tag => tag.project_tag_id === selectedTagId)) {
        toast({
          title: "Tag Already Applied",
          description: "This tag is already applied to this appointment.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('appointment_tags')
        .insert([{
          appointment_id: appointmentId,
          project_tag_id: selectedTagId
        }]);

      if (error) throw error;

      await fetchAppointmentTags();
      setSelectedTagId('');
      onTagsChanged?.();
      
      toast({
        title: "Tag Added",
        description: "Tag has been added to the appointment.",
      });
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: "Error",
        description: "Failed to add tag to appointment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('appointment_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      await fetchAppointmentTags();
      onTagsChanged?.();
      
      toast({
        title: "Tag Removed",
        description: "Tag has been removed from the appointment.",
      });
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: "Error",
        description: "Failed to remove tag from appointment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTagsForSelection = () => {
    const appliedTagIds = appointmentTags.map(tag => tag.project_tag_id);
    return availableTags.filter(tag => !appliedTagIds.includes(tag.id));
  };

  return (
    <div className="space-y-2">
      {/* Display existing tags */}
      {appointmentTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {appointmentTags.map((tag) => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.project_tag?.tag_color || '#6B7280' }}
              className="text-white text-xs flex items-center gap-1"
            >
              <span>{tag.project_tag?.tag_name || 'Unknown Tag'}</span>
              <button
                onClick={() => removeTag(tag.id)}
                disabled={loading}
                className="ml-1 hover:bg-black/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add new tag */}
      <div className="flex items-center gap-2">
        <Select value={selectedTagId} onValueChange={setSelectedTagId}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Add tag..." />
          </SelectTrigger>
          <SelectContent>
            {getAvailableTagsForSelection().map((tag) => (
              <SelectItem key={tag.id} value={tag.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.tag_color }}
                  />
                  <span>{tag.tag_name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={addTag}
          disabled={!selectedTagId || loading}
          size="sm"
          className="h-8 px-2"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default AppointmentTags;