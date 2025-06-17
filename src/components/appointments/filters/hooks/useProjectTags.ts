
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProjectTag } from '@/components/projects/types/tagTypes';

export const useProjectTags = (projectName?: string) => {
  const [availableTags, setAvailableTags] = useState<ProjectTag[]>([]);

  useEffect(() => {
    if (projectName) {
      fetchProjectTags();
    }
  }, [projectName]);

  const fetchProjectTags = async () => {
    if (!projectName) return;

    try {
      // Get project ID first
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('project_name', projectName)
        .single();

      if (!project) return;

      // Fetch tags for this project
      const { data: tags, error } = await supabase
        .from('project_tags')
        .select('*')
        .eq('project_id', project.id)
        .order('tag_name');

      if (error) throw error;

      setAvailableTags(tags || []);
    } catch (error) {
      console.error('Error fetching project tags:', error);
    }
  };

  return { availableTags };
};
