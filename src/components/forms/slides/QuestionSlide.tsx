
import React from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
                onChange={(e) => onInputChange(slide.field_name!, e.target.value)}
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
                  onInputChange(slide.field_name!, updated);
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
              onChange={(e) => onInputChange(slide.field_name!, Number(e.target.value))}
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
      {showFollowUp && slide.conditional_follow_up && (
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
                  onChange={(e) => onInputChange(slide.conditional_follow_up!.question.field_name, e.target.value)}
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
        <Button variant="outline" onClick={onPrevious} className="flex-1 h-12">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button 
          onClick={onNext} 
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
};

export default QuestionSlide;
