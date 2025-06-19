
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Project, ProjectFormData } from './types';

interface ProjectFormProps {
  onSave: (data: ProjectFormData) => void;
  onCancel: () => void;
  initialData?: Project;
}

export const ProjectForm = ({ onSave, onCancel, initialData }: ProjectFormProps) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    project_name: '',
    active: true,
    portal_password: '',
    brand_primary_color: '#3B82F6',
    brand_secondary_color: '#8B5CF6',
    custom_logo_url: '',
    ghl_api_key: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        project_name: initialData.project_name,
        active: initialData.active,
        portal_password: initialData.portal_password || '',
        brand_primary_color: initialData.brand_primary_color || '#3B82F6',
        brand_secondary_color: initialData.brand_secondary_color || '#8B5CF6',
        custom_logo_url: initialData.custom_logo_url || '',
        ghl_api_key: initialData.ghl_api_key || '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">Project Name *</Label>
        <Input
          id="project-name"
          value={formData.project_name}
          onChange={(e) => handleInputChange('project_name', e.target.value)}
          placeholder="Enter project name"
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="project-active"
          checked={formData.active}
          onCheckedChange={(checked) => handleInputChange('active', checked)}
        />
        <Label htmlFor="project-active">Active Project</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="portal-password">Portal Password</Label>
        <Input
          id="portal-password"
          type="password"
          value={formData.portal_password || ''}
          onChange={(e) => handleInputChange('portal_password', e.target.value)}
          placeholder="Optional password for project portal"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary-color">Primary Color</Label>
          <Input
            id="primary-color"
            type="color"
            value={formData.brand_primary_color}
            onChange={(e) => handleInputChange('brand_primary_color', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondary-color">Secondary Color</Label>
          <Input
            id="secondary-color"
            type="color"
            value={formData.brand_secondary_color}
            onChange={(e) => handleInputChange('brand_secondary_color', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo-url">Logo URL</Label>
        <Input
          id="logo-url"
          value={formData.custom_logo_url || ''}
          onChange={(e) => handleInputChange('custom_logo_url', e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ghl-api-key">GoHighLevel API Key</Label>
        <Input
          id="ghl-api-key"
          type="password"
          value={formData.ghl_api_key || ''}
          onChange={(e) => handleInputChange('ghl_api_key', e.target.value)}
          placeholder="Optional API key for GoHighLevel integration"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.project_name.trim()}>
          {initialData ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
};
