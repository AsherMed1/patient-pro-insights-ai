
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import type { FormSlide } from '../types';

interface AiSummarySlideProps {
  slide: FormSlide;
  brandColors: { primary: string; secondary: string };
  facilityInfo: any;
  onNext: () => void;
  onPrevious: () => void;
}

const AiSummarySlide = ({ slide, brandColors, facilityInfo, onNext, onPrevious }: AiSummarySlideProps) => {
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

export default AiSummarySlide;
