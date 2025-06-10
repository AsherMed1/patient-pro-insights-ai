
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { FormSlide } from '../types';

interface QuestionSlideProps {
  slide: FormSlide;
  brandColors: { primary: string; secondary: string };
  formData: Record<string, any>;
  showFollowUp: boolean;
  currentSlide: number;
  onInputChange: (fieldName: string, value: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const QuestionSlide = ({ 
  slide, 
  brandColors, 
  formData, 
  showFollowUp,
  currentSlide,
  onInputChange, 
  onNext, 
  onPrevious 
}: QuestionSlideProps) => {
  const handleRadioChange = (value: string) => {
    if (slide.field_name) {
      onInputChange(slide.field_name, value);
    }
  };

  const handleCheckboxChange = (value: string, checked: boolean) => {
    if (!slide.field_name) return;
    
    const currentValues = formData[slide.field_name] || [];
    let newValues;
    
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter((v: string) => v !== value);
    }
    
    onInputChange(slide.field_name, newValues);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (slide.field_name) {
      onInputChange(slide.field_name, e.target.value);
    }
  };

  const handleFollowUpChange = (fieldName: string, value: any) => {
    onInputChange(fieldName, value);
  };

  const renderFollowUpQuestion = () => {
    if (!showFollowUp || !slide.conditional_follow_up?.question) return null;

    const followUpQuestion = slide.conditional_follow_up.question;
    const followUpValue = formData[followUpQuestion.field_name] || '';

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border-l-4" style={{ borderLeftColor: brandColors.primary }}>
        <Label className="text-lg font-semibold text-gray-900 mb-4 block">
          {followUpQuestion.title}
        </Label>
        
        {followUpQuestion.field_type === 'radio' && (
          <RadioGroup 
            value={followUpValue} 
            onValueChange={(value) => handleFollowUpChange(followUpQuestion.field_name, value)}
            className="space-y-3"
          >
            {followUpQuestion.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={`followup-${option.value}`} />
                <Label 
                  htmlFor={`followup-${option.value}`} 
                  className="text-base cursor-pointer flex-1"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {followUpQuestion.field_type === 'textarea' && (
          <Textarea
            value={followUpValue}
            onChange={(e) => handleFollowUpChange(followUpQuestion.field_name, e.target.value)}
            placeholder="Please tell us more..."
            className="min-h-[100px]"
          />
        )}
      </div>
    );
  };

  const isValid = () => {
    if (!slide.required) return true;
    if (!slide.field_name) return true;
    
    const value = formData[slide.field_name];
    
    if (slide.field_type === 'checkbox') {
      return Array.isArray(value) && value.length > 0;
    }
    
    return value !== undefined && value !== '' && value !== null;
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">{slide.title}</h2>
        {slide.description && (
          <p className="text-lg text-muted-foreground">{slide.description}</p>
        )}
      </div>

      <div className="space-y-6">
        {slide.field_type === 'radio' && slide.options && (
          <RadioGroup 
            value={formData[slide.field_name || ''] || ''} 
            onValueChange={handleRadioChange}
            className="space-y-4"
          >
            {slide.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label 
                  htmlFor={option.value} 
                  className="text-base cursor-pointer flex-1 font-medium"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {slide.field_type === 'checkbox' && slide.options && (
          <div className="space-y-4">
            {slide.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <Checkbox
                  id={option.value}
                  checked={(formData[slide.field_name || ''] || []).includes(option.value)}
                  onCheckedChange={(checked) => handleCheckboxChange(option.value, checked === true)}
                />
                <Label 
                  htmlFor={option.value} 
                  className="text-base cursor-pointer flex-1 font-medium"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        )}

        {(slide.field_type === 'text' || slide.field_type === 'email' || slide.field_type === 'tel') && (
          <div className="space-y-2">
            <Label className="text-lg font-semibold">{slide.title}</Label>
            <Input
              type={slide.field_type}
              value={formData[slide.field_name || ''] || ''}
              onChange={handleTextChange}
              className="h-12 text-lg"
              placeholder={`Enter your ${slide.title.toLowerCase()}`}
            />
          </div>
        )}

        {slide.field_type === 'textarea' && (
          <div className="space-y-2">
            <Label className="text-lg font-semibold">{slide.title}</Label>
            <Textarea
              value={formData[slide.field_name || ''] || ''}
              onChange={handleTextChange}
              className="min-h-[120px] text-lg"
              placeholder={`Enter your ${slide.title.toLowerCase()}`}
            />
          </div>
        )}

        {slide.field_type === 'range' && (
          <div className="space-y-4">
            <Label className="text-lg font-semibold">{slide.title}</Label>
            <div className="px-4">
              <input
                type="range"
                min={slide.min || 0}
                max={slide.max || 10}
                value={formData[slide.field_name || ''] || slide.min || 0}
                onChange={(e) => onInputChange(slide.field_name || '', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${brandColors.primary} 0%, ${brandColors.primary} ${((formData[slide.field_name || ''] || slide.min || 0) - (slide.min || 0)) / ((slide.max || 10) - (slide.min || 0)) * 100}%, #e5e7eb ${((formData[slide.field_name || ''] || slide.min || 0) - (slide.min || 0)) / ((slide.max || 10) - (slide.min || 0)) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>{slide.min || 0}</span>
                <span className="font-semibold text-lg" style={{ color: brandColors.primary }}>
                  {formData[slide.field_name || ''] || slide.min || 0}
                </span>
                <span>{slide.max || 10}</span>
              </div>
            </div>
          </div>
        )}

        {renderFollowUpQuestion()}
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onPrevious} className="flex-1 h-12">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!isValid()}
          className="flex-1 h-12 text-white"
          style={{
            background: isValid() 
              ? `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
              : '#9CA3AF'
          }}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default QuestionSlide;
