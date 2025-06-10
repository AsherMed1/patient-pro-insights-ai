
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFormRenderer } from './hooks/useFormRenderer';
import { getBrandColors, getDoctors, getInsuranceOptions, getFacilityInfo } from './utils/formUtils';
import WelcomeSlide from './slides/WelcomeSlide';
import EducatorSlide from './slides/EducatorSlide';
import QuestionSlide from './slides/QuestionSlide';
import LeadCaptureSlide from './slides/LeadCaptureSlide';
import AiSummarySlide from './slides/AiSummarySlide';

interface FormRendererProps {
  slug: string;
}

const FormRenderer = ({ slug }: FormRendererProps) => {
  const {
    formTemplate,
    projectForm,
    currentSlide,
    formData,
    showFollowUp,
    loading,
    handleInputChange,
    handleNext,
    handlePrevious,
    handleSubmit
  } = useFormRenderer(slug);

  if (loading) {
    const brandColors = getBrandColors(projectForm);
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
  const brandColors = getBrandColors(projectForm);
  const customLogo = projectForm?.custom_logo_url;
  const customDoctors = getDoctors(projectForm);
  const insuranceOptions = getInsuranceOptions(projectForm);
  const facilityInfo = getFacilityInfo(projectForm);

  const renderSlide = () => {
    switch (currentSlideData.type) {
      case 'welcome':
        return (
          <WelcomeSlide
            slide={currentSlideData}
            brandColors={brandColors}
            customLogo={customLogo}
            facilityInfo={facilityInfo}
            onNext={handleNext}
          />
        );

      case 'educator':
        return (
          <EducatorSlide
            slide={currentSlideData}
            brandColors={brandColors}
            customDoctors={customDoctors}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );

      case 'question':
        return (
          <QuestionSlide
            slide={currentSlideData}
            brandColors={brandColors}
            formData={formData}
            showFollowUp={showFollowUp[currentSlide] || false}
            currentSlide={currentSlide}
            onInputChange={handleInputChange}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );

      case 'lead_capture':
        return (
          <LeadCaptureSlide
            slide={currentSlideData}
            brandColors={brandColors}
            formData={formData}
            insuranceOptions={insuranceOptions}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        );

      case 'ai_summary':
        return (
          <AiSummarySlide
            slide={currentSlideData}
            brandColors={brandColors}
            facilityInfo={facilityInfo}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );

      default:
        return <div>Unknown slide type</div>;
    }
  };

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
              {renderSlide()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FormRenderer;
