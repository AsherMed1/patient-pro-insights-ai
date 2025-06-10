
import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, Star } from "lucide-react";
import type { FormSlide } from '../types';

interface WelcomeSlideProps {
  slide: FormSlide;
  brandColors: { primary: string; secondary: string };
  customLogo?: string;
  facilityInfo: any;
  onNext: () => void;
}

const WelcomeSlide = ({ slide, brandColors, customLogo, facilityInfo, onNext }: WelcomeSlideProps) => {
  return (
    <div className="text-center space-y-8 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
          }}
        >
          {customLogo ? (
            <img src={customLogo} alt="Logo" className="w-10 h-10 object-contain" />
          ) : (
            <CheckCircle className="w-8 h-8 text-white" />
          )}
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            {slide.title}
          </h1>
          {slide.description && (
            <p className="text-xl text-muted-foreground leading-relaxed">
              {slide.description}
            </p>
          )}
          {facilityInfo.name && (
            <p className="text-lg font-semibold" style={{ color: brandColors.primary }}>
              {facilityInfo.name}
            </p>
          )}
        </div>
      </div>
      
      {slide.image_placeholder && (
        <div 
          className="rounded-2xl p-12 border"
          style={{
            background: `linear-gradient(135deg, ${brandColors.primary}15, ${brandColors.secondary}15)`,
            borderColor: `${brandColors.primary}30`
          }}
        >
          <div className="text-6xl mb-4">🏥</div>
          <p className="text-gray-600 font-medium">{slide.image_placeholder}</p>
        </div>
      )}
      
      <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>HIPAA Compliant</span>
        </div>
        <div className="flex items-center space-x-2">
          <Star className="w-4 h-4" />
          <span>Trusted by patients</span>
        </div>
      </div>
      
      <Button 
        onClick={onNext} 
        size="lg" 
        className="w-full max-w-md h-14 text-lg font-semibold shadow-lg text-white"
        style={{
          background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
        }}
      >
        {slide.cta || 'Start Assessment'} →
      </Button>
    </div>
  );
};

export default WelcomeSlide;
