import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FormTemplate, FormSlide } from './types';

interface FormRendererProps {
  slug: string;
}

const FormRenderer = ({ slug }: FormRendererProps) => {
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
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
      const { data: projectForm, error } = await supabase
        .from('project_forms')
        .select(`
          *,
          form_templates (*)
        `)
        .eq('public_url_slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (!projectForm?.form_templates) throw new Error('Form template not found');

      // Type cast the form_data to our expected structure
      const typedTemplate = {
        ...projectForm.form_templates,
        form_data: projectForm.form_templates.form_data as unknown as { slides: FormSlide[] }
      } as FormTemplate;

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

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Check for conditional follow-ups
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
      const { data: projectForm } = await supabase
        .from('project_forms')
        .select('id')
        .eq('public_url_slug', slug)
        .single();

      if (!projectForm) throw new Error('Project form not found');

      // Extract contact info and tags from form data
      const contactInfo = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        zip_code: formData.zip_code
      };

      // Extract tags based on responses
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

      // Reset form or redirect
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
    switch (slide.type) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-primary">{slide.title}</h1>
              {slide.description && (
                <p className="text-lg text-muted-foreground">{slide.description}</p>
              )}
            </div>
            {slide.image_placeholder && (
              <div className="bg-gray-100 rounded-lg p-8 text-gray-500">
                📷 {slide.image_placeholder}
              </div>
            )}
            <Button onClick={handleNext} size="lg" className="w-full">
              {slide.cta || 'Continue'}
            </Button>
          </div>
        );

      case 'educator':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{slide.title}</h2>
              {slide.description && (
                <p className="text-lg text-muted-foreground">{slide.description}</p>
              )}
            </div>
            {slide.image_placeholder && (
              <div className="bg-gray-100 rounded-lg p-8 text-gray-500 text-center">
                📷 {slide.image_placeholder}
              </div>
            )}
            {slide.doctors && (
              <div className="space-y-2">
                {slide.doctors.map((doctor, index) => (
                  <div key={index} className="text-center">
                    <p className="font-semibold">{doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'question':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">{slide.title}</h2>
            
            {slide.image_placeholder && (
              <div className="bg-gray-100 rounded-lg p-8 text-gray-500 text-center">
                📷 {slide.image_placeholder}
              </div>
            )}

            {slide.field_type === 'radio' && slide.options && (
              <div className="space-y-3">
                {slide.options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${slide.field_name}-${option.value}`}
                      name={slide.field_name}
                      value={option.value}
                      checked={formData[slide.field_name!] === option.value}
                      onChange={(e) => handleInputChange(slide.field_name!, e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`${slide.field_name}-${option.value}`} className="flex-1 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {slide.field_type === 'checkbox' && slide.options && (
              <div className="space-y-3">
                {slide.options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
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
                    />
                    <Label htmlFor={`${slide.field_name}-${option.value}`} className="flex-1 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {slide.field_type === 'range' && (
              <div className="space-y-4">
                <input
                  type="range"
                  min={slide.min || 1}
                  max={slide.max || 10}
                  value={formData[slide.field_name!] || slide.min || 1}
                  onChange={(e) => handleInputChange(slide.field_name!, Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-2xl font-bold">
                  {formData[slide.field_name!] || slide.min || 1}
                </div>
              </div>
            )}

            {/* Conditional follow-up */}
            {showFollowUp[currentSlide] && slide.conditional_follow_up && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <h3 className="font-semibold">{slide.conditional_follow_up.question.title}</h3>
                <div className="space-y-2">
                  {slide.conditional_follow_up.question.options.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${slide.conditional_follow_up!.question.field_name}-${option.value}`}
                        name={slide.conditional_follow_up!.question.field_name}
                        value={option.value}
                        checked={formData[slide.conditional_follow_up!.question.field_name] === option.value}
                        onChange={(e) => handleInputChange(slide.conditional_follow_up!.question.field_name, e.target.value)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`${slide.conditional_follow_up!.question.field_name}-${option.value}`} className="flex-1 cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'lead_capture':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{slide.title}</h2>
              {slide.description && (
                <p className="text-muted-foreground">{slide.description}</p>
              )}
            </div>

            {slide.image_placeholder && (
              <div className="bg-gray-100 rounded-lg p-8 text-gray-500 text-center">
                📷 {slide.image_placeholder}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slide.fields?.map((field) => (
                <div key={field.field_name} className="space-y-2">
                  <Label htmlFor={field.field_name}>{field.label}</Label>
                  {field.field_type === 'select' ? (
                    <Select
                      value={formData[field.field_name] || ''}
                      onValueChange={(value) => handleInputChange(field.field_name, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.field_name}
                      type={field.field_type}
                      value={formData[field.field_name] || ''}
                      onChange={(e) => handleInputChange(field.field_name, e.target.value)}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {slide.cta_options?.map((cta) => (
                <Button 
                  key={cta.value} 
                  onClick={handleSubmit} 
                  className="w-full" 
                  size="lg"
                >
                  {cta.label}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'ai_summary':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{slide.title}</h2>
              {slide.description && (
                <p className="text-muted-foreground">{slide.description}</p>
              )}
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-lg">
                Based on your responses, our care team will review your assessment and provide personalized recommendations for your knee pain treatment options.
              </p>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handlePrevious} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext} className="flex-1">
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!formTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Step {currentSlide + 1} of {formTemplate.total_steps}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Form content */}
          <Card>
            <CardContent className="p-8">
              {renderSlide(currentSlideData)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FormRenderer;
