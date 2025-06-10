
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload, Plus, Trash2, Palette, Building, Users, FileText } from 'lucide-react';
import type { ProjectForm } from './types';

interface FormEditorProps {
  projectForm: ProjectForm;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface InsuranceProvider {
  value: string;
  label: string;
}

interface Doctor {
  name: string;
  specialty: string;
  image?: string;
}

const FormEditor = ({ projectForm, isOpen, onClose, onSave }: FormEditorProps) => {
  const [customizations, setCustomizations] = useState({
    custom_logo_url: projectForm.custom_logo_url || '',
    brand_primary_color: projectForm.brand_primary_color || '#3B82F6',
    brand_secondary_color: projectForm.brand_secondary_color || '#8B5CF6',
    custom_insurance_list: projectForm.custom_insurance_list || [],
    custom_doctors: projectForm.custom_doctors || [],
    custom_facility_info: projectForm.custom_facility_info || {}
  });
  
  const [newInsurance, setNewInsurance] = useState({ value: '', label: '' });
  const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', image: '' });
  const [facilityInfo, setFacilityInfo] = useState({
    name: customizations.custom_facility_info?.name || '',
    address: customizations.custom_facility_info?.address || '',
    phone: customizations.custom_facility_info?.phone || '',
    description: customizations.custom_facility_info?.description || ''
  });
  
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCustomizations({
      custom_logo_url: projectForm.custom_logo_url || '',
      brand_primary_color: projectForm.brand_primary_color || '#3B82F6',
      brand_secondary_color: projectForm.brand_secondary_color || '#8B5CF6',
      custom_insurance_list: projectForm.custom_insurance_list || [],
      custom_doctors: projectForm.custom_doctors || [],
      custom_facility_info: projectForm.custom_facility_info || {}
    });
    
    setFacilityInfo({
      name: projectForm.custom_facility_info?.name || '',
      address: projectForm.custom_facility_info?.address || '',
      phone: projectForm.custom_facility_info?.phone || '',
      description: projectForm.custom_facility_info?.description || ''
    });
  }, [projectForm]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updatedCustomizations = {
        ...customizations,
        custom_facility_info: facilityInfo
      };

      const { error } = await supabase
        .from('project_forms')
        .update(updatedCustomizations)
        .eq('id', projectForm.id);

      if (error) throw error;

      // Track the customization change
      await supabase
        .from('form_customization_history')
        .insert({
          project_form_id: projectForm.id,
          changes_made: updatedCustomizations,
          changed_by: 'User' // In a real app, this would be the authenticated user
        });

      toast({
        title: "Success",
        description: "Form customizations saved successfully!",
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving customizations:', error);
      toast({
        title: "Error",
        description: "Failed to save customizations",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addInsuranceProvider = () => {
    if (newInsurance.value && newInsurance.label) {
      setCustomizations(prev => ({
        ...prev,
        custom_insurance_list: [...(prev.custom_insurance_list as InsuranceProvider[]), newInsurance]
      }));
      setNewInsurance({ value: '', label: '' });
    }
  };

  const removeInsuranceProvider = (index: number) => {
    setCustomizations(prev => ({
      ...prev,
      custom_insurance_list: (prev.custom_insurance_list as InsuranceProvider[]).filter((_, i) => i !== index)
    }));
  };

  const addDoctor = () => {
    if (newDoctor.name && newDoctor.specialty) {
      setCustomizations(prev => ({
        ...prev,
        custom_doctors: [...(prev.custom_doctors as Doctor[]), newDoctor]
      }));
      setNewDoctor({ name: '', specialty: '', image: '' });
    }
  };

  const removeDoctor = (index: number) => {
    setCustomizations(prev => ({
      ...prev,
      custom_doctors: (prev.custom_doctors as Doctor[]).filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Customize Form: {projectForm.form_templates?.title}</span>
          </DialogTitle>
          <DialogDescription>
            Customize branding, insurance providers, doctors, and facility information for this form.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="branding" className="flex items-center space-x-1">
              <Palette className="w-4 h-4" />
              <span>Branding</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>Insurance</span>
            </TabsTrigger>
            <TabsTrigger value="doctors" className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>Doctors</span>
            </TabsTrigger>
            <TabsTrigger value="facility" className="flex items-center space-x-1">
              <Building className="w-4 h-4" />
              <span>Facility</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Brand Colors & Logo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={customizations.custom_logo_url}
                      onChange={(e) => setCustomizations(prev => ({
                        ...prev,
                        custom_logo_url: e.target.value
                      }))}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Primary Brand Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="color"
                        value={customizations.brand_primary_color}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          brand_primary_color: e.target.value
                        }))}
                        className="w-20"
                      />
                      <Input
                        value={customizations.brand_primary_color}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          brand_primary_color: e.target.value
                        }))}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Secondary Brand Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="color"
                        value={customizations.brand_secondary_color}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          brand_secondary_color: e.target.value
                        }))}
                        className="w-20"
                      />
                      <Input
                        value={customizations.brand_secondary_color}
                        onChange={(e) => setCustomizations(prev => ({
                          ...prev,
                          brand_secondary_color: e.target.value
                        }))}
                        placeholder="#8B5CF6"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-semibold mb-2">Preview</h4>
                  <div 
                    className="p-4 rounded-lg text-white"
                    style={{
                      background: `linear-gradient(135deg, ${customizations.brand_primary_color}, ${customizations.brand_secondary_color})`
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {customizations.custom_logo_url && (
                        <img 
                          src={customizations.custom_logo_url} 
                          alt="Logo" 
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="font-semibold">Your Brand Preview</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insurance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Insurance Providers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Insurance value (e.g., aetna)"
                    value={newInsurance.value}
                    onChange={(e) => setNewInsurance(prev => ({ ...prev, value: e.target.value }))}
                  />
                  <Input
                    placeholder="Display name (e.g., Aetna)"
                    value={newInsurance.label}
                    onChange={(e) => setNewInsurance(prev => ({ ...prev, label: e.target.value }))}
                  />
                  <Button onClick={addInsuranceProvider} className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Current Insurance Providers</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(customizations.custom_insurance_list as InsuranceProvider[]).map((insurance, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{insurance.label}</span>
                          <span className="text-sm text-gray-500 ml-2">({insurance.value})</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInsuranceProvider(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="doctors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Doctors & Medical Staff</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Doctor name"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Specialty"
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor(prev => ({ ...prev, specialty: e.target.value }))}
                  />
                  <Input
                    placeholder="Image URL (optional)"
                    value={newDoctor.image}
                    onChange={(e) => setNewDoctor(prev => ({ ...prev, image: e.target.value }))}
                  />
                  <Button onClick={addDoctor} className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Current Doctors</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(customizations.custom_doctors as Doctor[]).map((doctor, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {doctor.image && (
                            <img 
                              src={doctor.image} 
                              alt={doctor.name}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <div className="font-medium">{doctor.name}</div>
                            <div className="text-sm text-gray-500">{doctor.specialty}</div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeDoctor(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Facility Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Facility Name</Label>
                    <Input
                      value={facilityInfo.name}
                      onChange={(e) => setFacilityInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your Medical Center"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={facilityInfo.phone}
                      onChange={(e) => setFacilityInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={facilityInfo.address}
                      onChange={(e) => setFacilityInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Medical Center Dr, City, State 12345"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={facilityInfo.description}
                      onChange={(e) => setFacilityInfo(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of your facility and services..."
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex items-center space-x-2">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormEditor;
