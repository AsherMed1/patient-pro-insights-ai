
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Project, ProjectFormData } from './types';

interface ProjectFormProps {
  initialData?: Project;
  onSave: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
}

export const ProjectForm = ({ initialData, onSave, onCancel }: ProjectFormProps) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    project_name: initialData?.project_name || '',
    active: initialData?.active ?? true,
    portal_password: '',
    ghl_api_key: initialData?.ghl_api_key || '',
    custom_logo_url: initialData?.custom_logo_url || '',
    brand_primary_color: initialData?.brand_primary_color || '#3B82F6',
    brand_secondary_color: initialData?.brand_secondary_color || '#8B5CF6',
    custom_insurance_list: initialData?.custom_insurance_list || [],
    custom_doctors: initialData?.custom_doctors || [],
    custom_facility_info: initialData?.custom_facility_info || {},
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Configure the basic project settings and status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => handleInputChange('project_name', e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="active">Active Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => handleInputChange('active', checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security & Access</CardTitle>
          <CardDescription>
            Configure portal access and API integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="portal_password">Portal Password</Label>
              <Input
                id="portal_password"
                type="password"
                value={formData.portal_password}
                onChange={(e) => handleInputChange('portal_password', e.target.value)}
                placeholder={initialData ? "Leave blank to keep current password" : "Set portal password"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ghl_api_key">GoHighLevel API Key</Label>
              <Input
                id="ghl_api_key"
                type="password"
                value={formData.ghl_api_key}
                onChange={(e) => handleInputChange('ghl_api_key', e.target.value)}
                placeholder="Enter GHL API key"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize the visual appearance of your project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom_logo_url">Custom Logo URL</Label>
            <Input
              id="custom_logo_url"
              value={formData.custom_logo_url}
              onChange={(e) => handleInputChange('custom_logo_url', e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand_primary_color">Primary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="brand_primary_color"
                  type="color"
                  value={formData.brand_primary_color}
                  onChange={(e) => handleInputChange('brand_primary_color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.brand_primary_color}
                  onChange={(e) => handleInputChange('brand_primary_color', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_secondary_color">Secondary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="brand_secondary_color"
                  type="color"
                  value={formData.brand_secondary_color}
                  onChange={(e) => handleInputChange('brand_secondary_color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.brand_secondary_color}
                  onChange={(e) => handleInputChange('brand_secondary_color', e.target.value)}
                  placeholder="#8B5CF6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (initialData ? 'Update Project' : 'Create Project')}
        </Button>
      </div>
    </form>
  );
};
