import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Star, Shield, Users } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FormTemplate, FormSlide, ProjectForm } from './types';

interface FormRendererProps {
  slug: string;
}

const FormRenderer = ({ slug }: FormRendererProps) => {
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showFollowUp, setShowFollowUp] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFormTemplate();
  }, [slug]);

  const fetchFormTemplate = async () => {
    try {
      const { data: projectFormData, error } = await supabase
        .from('project_forms')
        .select(`
          *,
          form_templates (*)
        `)
        .eq('public_url_slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (!projectFormData?.form_templates) throw new Error('Form template not found');

      const typedProjectForm = {
        ...projectFormData,
        form_templates: {
          ...projectFormData.form_templates,
          form_data: projectFormData.form_templates.form_data as unknown as { slides: FormSlide[] }
        } as FormTemplate
      } as ProjectForm;

      const typedTemplate = typedProjectForm.form_templates;

      setProjectForm(typedProjectForm);
      setFormTemplate(typedTemplate);
    } catch (error) {
      console.error('Error fetching form template:', error);
      toast({
        title: "Error",
        description: "Form not found or unavailable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get custom branding colors
  const brandColors = {
    primary: projectForm?.brand_primary_color || '#3B82F6',
    secondary: projectForm?.brand_secondary_color || '#8B5CF6'
  };

  // Get custom logo
  const customLogo = projectForm?.custom_logo_url;

  // Get custom doctors or use template defaults
  const getDoctors = () => {
    if (projectForm?.custom_doctors && (projectForm.custom_doctors as any[]).length > 0) {
      return projectForm.custom_doctors;
    }
    return null; // Will use template doctors
  };

  // Get custom insurance list
  const getInsuranceOptions = () => {
    if (projectForm?.custom_insurance_list && (projectForm.custom_insurance_list as any[]).length > 0) {
      return projectForm.custom_insurance_list;
    }
    // Return default insurance options
    return [
      { value: "aetna", label: "Aetna" },
      { value: "anthem", label: "Anthem Blue Cross Blue Shield" },
      { value: "cigna", label: "Cigna" },
      { value: "humana", label: "Humana" },
      { value: "kaiser", label: "Kaiser Permanente" },
      { value: "medicare", label: "Medicare" },
      { value: "medicaid", label: "Medicaid" },
      { value: "united", label: "UnitedHealthcare" },
      { value: "bcbs", label: "Blue Cross Blue Shield" },
      { value: "other", label: "Other" }
    ];
  };

  // Get facility info
  const getFacilityInfo = () => {
    return projectForm?.custom_facility_info as any || {};
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    const slide = formTemplate?.form_data.slides[currentSlide];
    if (slide?.conditional_follow_up) {
      const { condition, value: conditionValue, values } = slide.conditional_follow_up;
      let shouldShow = false;

      switch (condition) {
        case 'equals':
          shouldShow = value === conditionValue;
          break;
        case 'value_in':
          shouldShow = values?.includes(value) || false;
          break;
        case 'includes_any':
          shouldShow = Array.isArray(value) && values?.some(v => value.includes(v)) || false;
          break;
        case 'greater_than_equal':
          shouldShow = Number(value) >= Number(conditionValue);
          break;
      }

      setShowFollowUp(prev => ({
        ...prev,
        [currentSlide]: shouldShow
      }));
    }
  };

  const handleNext = () => {
    if (formTemplate && currentSlide < formTemplate.form_data.slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!projectForm) throw new Error('Project form not found');

      const contactInfo = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        zip_code: formData.zip_code
      };

      const tags: string[] = [];
      Object.entries(formData).forEach(([key, value]) => {
        const slide = formTemplate?.form_data.slides.find(s => s.field_name === key);
        if (slide?.options) {
          const selectedOptions = Array.isArray(value) ? value : [value];
          selectedOptions.forEach(selectedValue => {
            const option = slide.options?.find(o => o.value === selectedValue);
            if (option?.tags) {
              tags.push(...option.tags);
            }
          });
        }
      });

      const { error } = await supabase
        .from('form_submissions')
        .insert({
          project_form_id: projectForm.id,
          submission_data: formData,
          tags,
          contact_info: contactInfo
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your assessment has been submitted successfully!",
      });

      setFormData({});
      setCurrentSlide(0);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderSlide = (slide: FormSlide) => {
    const facilityInfo = getFacilityInfo();
    const customDoctors = getDoctors();
    
    switch (slide.type) {
      case 'welcome':
        return (
          <div className="text-center space-y-8 max-w-2xl mx-auto">
            <div className="space-y-6">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                }}
              >
                {customLogo ? (
                  <img src={customLogo} alt="Logo" className="w-10 h-10 object-contain" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {slide.title}
                </h1>
                {slide.description && (
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    {slide.description}
                  </p>
                )}
                {facilityInfo.name && (
                  <p className="text-lg font-semibold" style={{ color: brandColors.primary }}>
                    {facilityInfo.name}
                  </p>
                )}
              </div>
            </div>
            
            {slide.image_placeholder && (
              <div 
                className="rounded-2xl p-12 border"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}15, ${brandColors.secondary}15)`,
                  borderColor: `${brandColors.primary}30`
                }}
              >
                <div className="text-6xl mb-4">🏥</div>
                <p className="text-gray-600 font-medium">{slide.image_placeholder}</p>
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4" />
                <span>Trusted by patients</span>
              </div>
            </div>
            
            <Button 
              onClick={handleNext} 
              size="lg" 
              className="w-full max-w-md h-14 text-lg font-semibold shadow-lg text-white"
              style={{
                background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
              }}
            >
              {slide.cta || 'Start Assessment'} →
            </Button>
          </div>
        );

      case 'educator':
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">{slide.title}</h2>
              {slide.description && (
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  {slide.description}
                </p>
              )}
            </div>
            
            {slide.image_placeholder && (
              <div 
                className="rounded-2xl p-12 border text-center"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}10, ${brandColors.secondary}10)`,
                  borderColor: `${brandColors.primary}30`
                }}
              >
                <div className="text-6xl mb-4">👩‍⚕️</div>
                <p className="text-gray-600 font-medium">{slide.image_placeholder}</p>
              </div>
            )}
            
            {(customDoctors || slide.doctors) && (
              <div className="grid md:grid-cols-2 gap-6">
                {(customDoctors || slide.doctors)?.map((doctor: any, index: number) => (
                  <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-4">
                      {doctor.image ? (
                        <img 
                          src={doctor.image} 
                          alt={doctor.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                          }}
                        >
                          <Users className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{doctor.name}</h3>
                        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious} className="flex-1 h-12">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button 
                onClick={handleNext} 
                className="flex-1 h-12 text-white"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'question':
        return (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">{slide.title}</h2>
            </div>
            
            {slide.image_placeholder && (
              <div 
                className="rounded-2xl p-12 border text-center"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}10, ${brandColors.secondary}10)`,
                  borderColor: `${brandColors.primary}30`
                }}
              >
                <div className="text-6xl mb-4">🩺</div>
                <p className="text-gray-600 font-medium">{slide.image_placeholder}</p>
              </div>
            )}

            {slide.field_type === 'radio' && slide.options && (
              <div className="space-y-3">
                {slide.options.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                      formData[slide.field_name!] === option.value 
                        ? 'bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200'
                    }`}
                    style={{
                      borderColor: formData[slide.field_name!] === option.value ? brandColors.primary : undefined
                    }}
                  >
                    <input
                      type="radio"
                      name={slide.field_name}
                      value={option.value}
                      checked={formData[slide.field_name!] === option.value}
                      onChange={(e) => handleInputChange(slide.field_name!, e.target.value)}
                      className="sr-only"
                    />
                    <div 
                      className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                        formData[slide.field_name!] === option.value 
                          ? 'border-gray-300' 
                          : 'border-gray-300'
                      }`}
                      style={{
                        borderColor: formData[slide.field_name!] === option.value ? brandColors.primary : undefined,
                        backgroundColor: formData[slide.field_name!] === option.value ? brandColors.primary : undefined
                      }}
                    >
                      {formData[slide.field_name!] === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-lg font-medium text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>
            )}

            {slide.field_type === 'checkbox' && slide.options && (
              <div className="space-y-3">
                {slide.options.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                      formData[slide.field_name!]?.includes(option.value) 
                        ? 'bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200'
                    }`}
                    style={{
                      borderColor: formData[slide.field_name!]?.includes(option.value) ? brandColors.primary : undefined
                    }}
                  >
                    <Checkbox
                      id={`${slide.field_name}-${option.value}`}
                      checked={formData[slide.field_name!]?.includes(option.value) || false}
                      onCheckedChange={(checked) => {
                        const current = formData[slide.field_name!] || [];
                        const updated = checked 
                          ? [...current, option.value]
                          : current.filter((v: string) => v !== option.value);
                        handleInputChange(slide.field_name!, updated);
                      }}
                      className="mr-4"
                    />
                    <span className="text-lg font-medium text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>
            )}

            {slide.field_type === 'range' && (
              <div className="space-y-6">
                <div 
                  className="p-8 rounded-2xl border"
                  style={{
                    background: `linear-gradient(135deg, ${brandColors.primary}15, ${brandColors.secondary}15)`,
                    borderColor: `${brandColors.primary}30`
                  }}
                >
                  <input
                    type="range"
                    min={slide.min || 1}
                    max={slide.max || 10}
                    value={formData[slide.field_name!] || slide.min || 1}
                    onChange={(e) => handleInputChange(slide.field_name!, Number(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>{slide.min || 1}</span>
                    <span>{slide.max || 10}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div 
                    className="text-6xl font-bold bg-clip-text text-transparent"
                    style={{
                      background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`,
                      WebkitBackgroundClip: 'text'
                    }}
                  >
                    {formData[slide.field_name!] || slide.min || 1}
                  </div>
                  <p className="text-gray-600 mt-2">Selected Value</p>
                </div>
              </div>
            )}

            {/* Conditional follow-up */}
            {showFollowUp[currentSlide] && slide.conditional_follow_up && (
              <div className="mt-8 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                <h3 className="font-semibold text-lg mb-4 text-gray-900">{slide.conditional_follow_up.question.title}</h3>
                <div className="space-y-3">
                  {slide.conditional_follow_up.question.options.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-white ${
                        formData[slide.conditional_follow_up!.question.field_name] === option.value 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'border-orange-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name={slide.conditional_follow_up.question.field_name}
                        value={option.value}
                        checked={formData[slide.conditional_follow_up.question.field_name] === option.value}
                        onChange={(e) => handleInputChange(slide.conditional_follow_up!.question.field_name, e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                        formData[slide.conditional_follow_up.question.field_name] === option.value 
                          ? 'border-orange-500 bg-orange-500' 
                          : 'border-orange-300'
                      }`}>
                        {formData[slide.conditional_follow_up.question.field_name] === option.value && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious} className="flex-1 h-12">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button 
                onClick={handleNext} 
                className="flex-1 h-12 text-white"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'lead_capture':
        return (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center space-y-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                }}
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{slide.title}</h2>
              {slide.description && (
                <p className="text-lg text-muted-foreground leading-relaxed">{slide.description}</p>
              )}
            </div>

            {slide.image_placeholder && (
              <div 
                className="rounded-2xl p-12 border text-center"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}10, ${brandColors.secondary}10)`,
                  borderColor: `${brandColors.primary}30`
                }}
              >
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-600 font-medium">{slide.image_placeholder}</p>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {slide.fields?.map((field) => (
                  <div key={field.field_name} className="space-y-2">
                    <Label htmlFor={field.field_name} className="text-sm font-semibold text-gray-700">
                      {field.label}
                    </Label>
                    {field.field_type === 'select' ? (
                      <Select
                        value={formData[field.field_name] || ''}
                        onValueChange={(value) => handleInputChange(field.field_name, value)}
                      >
                        <SelectTrigger 
                          className="h-12 border-gray-300"
                          style={{
                            borderColor: formData[field.field_name] ? brandColors.primary : undefined
                          }}
                        >
                          <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Use custom insurance list if this is an insurance field */}
                          {field.field_name === 'insurance_provider' ? (
                            getInsuranceOptions().map((option: any) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))
                          ) : (
                            field.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.field_name}
                        type={field.field_type}
                        value={formData[field.field_name] || ''}
                        onChange={(e) => handleInputChange(field.field_name, e.target.value)}
                        required={field.required}
                        className="h-12 border-gray-300"
                        style={{
                          borderColor: formData[field.field_name] ? brandColors.primary : undefined
                        }}
                        placeholder={`Enter your ${field.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {slide.cta_options?.map((cta) => (
                <Button 
                  key={cta.value} 
                  onClick={handleSubmit} 
                  className="w-full h-14 text-lg font-semibold shadow-lg text-white"
                  style={{
                    background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                  }}
                  size="lg"
                >
                  {cta.label} →
                </Button>
              ))}
            </div>
          </div>
        );

      case 'ai_summary':
        return (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center space-y-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                }}
              >
                <Star className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{slide.title}</h2>
              {slide.description && (
                <p className="text-lg text-muted-foreground leading-relaxed">{slide.description}</p>
              )}
            </div>
            
            <div 
              className="p-8 rounded-2xl border"
              style={{
                background: `linear-gradient(135deg, ${brandColors.primary}10, ${brandColors.secondary}10)`,
                borderColor: `${brandColors.primary}30`
              }}
            >
              <div className="text-center space-y-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                  }}
                >
                  <Star className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg leading-relaxed text-gray-700">
                  Based on your responses, our care team will review your assessment and provide personalized recommendations for your treatment options.
                </p>
                {facilityInfo.name && (
                  <p className="font-semibold" style={{ color: brandColors.primary }}>
                    {facilityInfo.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious} className="flex-1 h-12">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button 
                onClick={handleNext} 
                className="flex-1 h-12 text-white"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      default:
        return <div>Unknown slide type</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div 
            className="w-16 h-16 rounded-full animate-spin flex items-center justify-center mx-auto"
            style={{
              background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
            }}
          >
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Loading Assessment</h2>
            <p className="text-muted-foreground">Preparing your personalized experience...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!formTemplate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Form Not Found</h2>
            <p className="text-muted-foreground">
              The requested form is not available or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSlideData = formTemplate.form_data.slides[currentSlide];
  const progress = ((currentSlide + 1) / formTemplate.total_steps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                Step {currentSlide + 1} of {formTemplate.total_steps}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                }}
              ></div>
            </div>
          </div>

          {/* Form content */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12">
              {renderSlide(currentSlideData)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FormRenderer;
