
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectTag, TagWithAppointmentCount } from '../types/tagTypes';

export const useProjectTags = (projectId: string) => {
  const [tags, setTags] = useState<TagWithAppointmentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTags = async () => {
    try {
      setLoading(true);
      const { data: tagsData, error: tagsError } = await supabase
        .from('project_tags')
        .select('*')
        .eq('project_id', projectId)
        .order('tag_name');

      if (tagsError) throw tagsError;

      // Get appointment counts for each tag
      const tagsWithCounts = await Promise.all(
        (tagsData || []).map(async (tag) => {
          const { count } = await supabase
            .from('appointment_tags')
            .select('*', { count: 'exact', head: true })
            .eq('project_tag_id', tag.id);

          return {
            ...tag,
            appointment_count: count || 0
          };
        })
      );

      setTags(tagsWithCounts);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTag = async (tagData: Omit<ProjectTag, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('project_tags')
        .insert(tagData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag created successfully",
      });

      fetchTags();
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive",
      });
    }
  };

  const updateTag = async (tagId: string, updates: Partial<ProjectTag>) => {
    try {
      const { error } = await supabase
        .from('project_tags')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', tagId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag updated successfully",
      });

      fetchTags();
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({
        title: "Error",
        description: "Failed to update tag",
        variant: "destructive",
      });
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('project_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });

      fetchTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTags();
    }
  }, [projectId]);

  return {
    tags,
    loading,
    createTag,
    updateTag,
    deleteTag,
    refetch: fetchTags
  };
};
