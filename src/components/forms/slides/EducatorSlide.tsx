
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import type { FormSlide } from '../types';

interface EducatorSlideProps {
  slide: FormSlide;
  brandColors: { primary: string; secondary: string };
  customDoctors?: any[];
  onNext: () => void;
  onPrevious: () => void;
}

const EducatorSlide = ({ slide, brandColors, customDoctors, onNext, onPrevious }: EducatorSlideProps) => {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">{slide.title}</h2>
        {slide.description && (
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {slide.description}
          </p>
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
          <div className="text-6xl mb-4">👩‍⚕️</div>
          <p className="text-gray-600 font-medium">{slide.image_placeholder}</p>
        </div>
      )}
      
      {(customDoctors || slide.doctors) && (
        <div className="grid md:grid-cols-2 gap-6">
          {(customDoctors || slide.doctors)?.map((doctor: any, index: number) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-4">
                {doctor.image ? (
                  <img 
                    src={doctor.image} 
                    alt={doctor.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`
                    }}
                  >
                    <Users className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{doctor.name}</h3>
                  <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                </div>
              </div>
            </div>
          ))}
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

export default EducatorSlide;
