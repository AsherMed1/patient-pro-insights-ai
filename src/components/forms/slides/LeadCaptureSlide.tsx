
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import type { FormSlide } from '../types';

interface LeadCaptureSlideProps {
  slide: FormSlide;
  brandColors: { primary: string; secondary: string };
  formData: Record<string, any>;
  insuranceOptions: any[];
  onInputChange: (fieldName: string, value: any) => void;
  onSubmit: () => void;
}

const LeadCaptureSlide = ({ 
  slide, 
  brandColors, 
  formData, 
  insuranceOptions,
  onInputChange, 
  onSubmit 
}: LeadCaptureSlideProps) => {
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
                  onValueChange={(value) => onInputChange(field.field_name, value)}
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
                      insuranceOptions.map((option: any) => (
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
                  onChange={(e) => onInputChange(field.field_name, e.target.value)}
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
            onClick={onSubmit} 
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
};

export default LeadCaptureSlide;
