
import type { FormSlide } from '../types';

export const generateAISummary = (
  formData: Record<string, any>, 
  slides: FormSlide[], 
  formType: string
): string => {
  switch (formType) {
    case 'ufe_screening':
      return generateUFESummary(formData, slides);
    default:
      return generateGenericSummary(formData, slides);
  }
};

const generateUFESummary = (formData: Record<string, any>, slides: FormSlide[]): string => {
  const symptoms: string[] = [];
  const treatments: string[] = [];
  const impacts: string[] = [];
  const motivators: string[] = [];

  // Extract symptoms
  if (formData.period_duration === '8_plus_days') {
    symptoms.push('8+ day periods');
  }
  if (formData.period_flow === 'heavy' || formData.period_flow === 'very_heavy') {
    symptoms.push('heavy bleeding');
  }
  if (formData.pelvic_pain === 'frequently' || formData.pelvic_pain === 'constantly') {
    symptoms.push('pelvic pain');
  }
  if (formData.abdominal_pressure === 'frequently' || formData.abdominal_pressure === 'constantly') {
    symptoms.push('abdominal pressure');
  }

  // Extract treatments tried
  if (formData.treatments_tried) {
    const treatmentMap: Record<string, string> = {
      'pain_relievers': 'pain medication',
      'birth_control': 'hormonal birth control',
      'heating_pads': 'heating pads',
      'diet_exercise': 'lifestyle changes'
    };
    
    formData.treatments_tried.forEach((treatment: string) => {
      if (treatmentMap[treatment]) {
        treatments.push(treatmentMap[treatment]);
      }
    });
  }

  // Extract life impacts
  if (formData.impact_areas) {
    const impactMap: Record<string, string> = {
      'motherhood': 'parenting',
      'work': 'work performance',
      'social': 'social activities',
      'intimacy': 'relationships',
      'sleep': 'sleep quality'
    };
    
    formData.impact_areas.forEach((impact: string) => {
      if (impactMap[impact]) {
        impacts.push(impactMap[impact]);
      }
    });
  }

  // Extract motivators
  if (formData.emotional_motivators) {
    const motivatorMap: Record<string, string> = {
      'work_focus': 'better work focus',
      'active_with_kids': 'being active with children',
      'enjoy_intimacy': 'enjoying intimacy',
      'travel_plan': 'confident travel planning',
      'sleep_better': 'uninterrupted sleep'
    };
    
    formData.emotional_motivators.forEach((motivator: string) => {
      if (motivatorMap[motivator]) {
        motivators.push(motivatorMap[motivator]);
      }
    });
  }

  // Build summary
  let summary = "Based on your assessment, ";
  
  if (symptoms.length > 0) {
    summary += `you experience ${symptoms.join(', ')}`;
  }
  
  if (treatments.length > 0) {
    summary += ` and have tried ${treatments.join(', ')}`;
  }
  
  if (impacts.length > 0) {
    summary += `. These symptoms impact your ${impacts.join(', ')}`;
  }
  
  if (motivators.length > 0) {
    summary += `. Relief could help you achieve ${motivators.join(', ')}`;
  }
  
  summary += ". UFE may be a minimally invasive solution to help you regain your quality of life.";
  
  return summary;
};

const generateGenericSummary = (formData: Record<string, any>, slides: FormSlide[]): string => {
  const responses: string[] = [];
  
  slides.forEach(slide => {
    if (slide.field_name && formData[slide.field_name]) {
      const value = formData[slide.field_name];
      if (typeof value === 'string') {
        responses.push(value);
      } else if (Array.isArray(value)) {
        responses.push(...value);
      }
    }
  });
  
  return `Thank you for completing the assessment. Based on your responses, our team will review your information and provide personalized recommendations.`;
};
