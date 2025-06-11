
import type { FormSlide } from '../types';

export const processFormTags = (formData: Record<string, any>, slides: FormSlide[]): string[] => {
  const tags: string[] = [];

  slides.forEach(slide => {
    if (slide.field_name && formData[slide.field_name] !== undefined) {
      const value = formData[slide.field_name];
      
      // Process main field tags
      if (slide.options) {
        const selectedOptions = Array.isArray(value) ? value : [value];
        selectedOptions.forEach(selectedValue => {
          const option = slide.options?.find(opt => opt.value === selectedValue);
          if (option?.tags) {
            tags.push(...option.tags);
          }
        });
      }

      // Process conditional follow-up tags
      if (slide.conditional_follow_up?.question && formData[slide.conditional_follow_up.question.field_name]) {
        const followUpValue = formData[slide.conditional_follow_up.question.field_name];
        const followUpOptions = Array.isArray(followUpValue) ? followUpValue : [followUpValue];
        
        followUpOptions.forEach(selectedValue => {
          const option = slide.conditional_follow_up?.question.options.find(opt => opt.value === selectedValue);
          if (option?.tags) {
            tags.push(...option.tags);
          }
        });
      }

      // Process additional fields tags
      if (slide.fields) {
        slide.fields.forEach(field => {
          const fieldValue = formData[field.field_name];
          if (fieldValue && field.options) {
            const selectedOptions = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
            selectedOptions.forEach(selectedValue => {
              const option = field.options?.find(opt => opt.value === selectedValue);
              if (option?.tags) {
                tags.push(...option.tags);
              }
            });
          }
        });
      }
    }
  });

  return [...new Set(tags)]; // Remove duplicates
};

export const generateQualificationTags = (tags: string[]): string[] => {
  const qualificationTags: string[] = [];

  // UFE Qualification Logic
  const hasHeavyBleeding = tags.includes('Heavy_Bleeding');
  const hasPelvicPain = tags.includes('Pelvic_Pain');
  const hasPressure = tags.includes('Pelvic_Pressure');
  const hasLifeDisruption = tags.includes('Life_Disruption');
  const hasFailedTreatments = tags.includes('Failed_Conservative_Tx');

  if ((hasHeavyBleeding || hasPelvicPain || hasPressure) && hasLifeDisruption) {
    qualificationTags.push('Likely_UFE_Candidate');
  }

  if (hasHeavyBleeding && hasPelvicPain && hasLifeDisruption && hasFailedTreatments) {
    qualificationTags.push('Strong_UFE_Candidate');
  }

  return qualificationTags;
};
