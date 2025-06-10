
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ProjectForm } from '../types';

interface Project {
  id: string;
  project_name: string;
  custom_logo_url?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  custom_insurance_list?: any[];
  custom_doctors?: any[];
  custom_facility_info?: any;
}

export const useFormManagement = (projectId?: string) => {
  const [projectForms, setProjectForms] = useState<ProjectForm[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProjectForms = async () => {
    try {
      let query = supabase
        .from('project_forms')
        .select(`
          *,
          form_templates (*),
          projects (
            id,
            project_name,
            custom_logo_url,
            brand_primary_color,
            brand_secondary_color,
            custom_insurance_list,
            custom_doctors,
            custom_facility_info
          )
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our types
      const transformedData = (data || []).map(item => ({
        ...item,
        form_templates: {
          ...item.form_templates,
          form_data: item.form_templates?.form_data as unknown as { slides: any[] }
        }
      })) as ProjectForm[];

      setProjectForms(transformedData);
    } catch (error) {
      console.error('Error fetching project forms:', error);
      toast({
        title: "Error",
        description: "Failed to fetch forms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('project_name');

      if (projectId) {
        query = query.eq('id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our types
      const transformedData = (data || []).map(project => ({
        ...project,
        custom_insurance_list: Array.isArray(project.custom_insurance_list) 
          ? project.custom_insurance_list 
          : [],
        custom_doctors: Array.isArray(project.custom_doctors) 
          ? project.custom_doctors 
          : [],
        custom_facility_info: typeof project.custom_facility_info === 'object' 
          ? project.custom_facility_info 
          : {}
      })) as Project[];

      setProjects(transformedData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  const refreshData = () => {
    fetchProjectForms();
    fetchProjects();
  };

  useEffect(() => {
    fetchProjectForms();
    fetchProjects();
  }, [projectId]);

  return {
    projectForms,
    projects,
    loading,
    copyToClipboard,
    refreshData
  };
};
