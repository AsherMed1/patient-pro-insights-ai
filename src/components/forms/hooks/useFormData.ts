
import { useState } from 'react';

export const useFormData = () => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showFollowUp, setShowFollowUp] = useState<Record<number, boolean>>({});

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const resetFormData = () => {
    setFormData({});
    setShowFollowUp({});
  };

  const updateFollowUpVisibility = (slideIndex: number, visible: boolean) => {
    setShowFollowUp(prev => ({ ...prev, [slideIndex]: visible }));
  };

  return {
    formData,
    showFollowUp,
    handleInputChange,
    resetFormData,
    updateFollowUpVisibility
  };
};
