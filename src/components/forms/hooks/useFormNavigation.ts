
import { useState } from 'react';
import type { FormSlide } from '../types';

interface UseFormNavigationProps {
  totalSteps: number;
  slides: FormSlide[];
  formData: Record<string, any>;
  updateFollowUpVisibility: (slideIndex: number, visible: boolean) => void;
}

export const useFormNavigation = ({ 
  totalSteps, 
  slides, 
  formData, 
  updateFollowUpVisibility 
}: UseFormNavigationProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const checkConditionalFollowUp = (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide.conditional_follow_up) return;

    const { condition, value, values, question } = slide.conditional_follow_up;
    const fieldValue = formData[slide.field_name!];
    let shouldShow = false;

    switch (condition) {
      case 'equals':
        shouldShow = fieldValue === value;
        break;
      case 'value_in':
        shouldShow = values?.includes(fieldValue) || false;
        break;
      case 'includes_any':
        if (Array.isArray(fieldValue) && values) {
          shouldShow = values.some(v => fieldValue.includes(v));
        }
        break;
      case 'greater_than_equal':
        shouldShow = Number(fieldValue) >= Number(value);
        break;
    }

    updateFollowUpVisibility(slideIndex, shouldShow);
  };

  const handleNext = () => {
    checkConditionalFollowUp(currentSlide);
    if (currentSlide < totalSteps - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return {
    currentSlide,
    handleNext,
    handlePrevious,
    setCurrentSlide
  };
};
