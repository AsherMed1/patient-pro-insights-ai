import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Heart, Phone, Shield } from 'lucide-react';
interface ParsedIntakeInfoProps {
  parsedInsuranceInfo?: any;
  parsedPathologyInfo?: any;
  parsedContactInfo?: any;
  parsedDemographics?: any;
  className?: string;
}
export const ParsedIntakeInfo: React.FC<ParsedIntakeInfoProps> = ({
  parsedInsuranceInfo,
  parsedPathologyInfo,
  parsedContactInfo,
  parsedDemographics,
  className = ""
}) => {
  // Debug logging
  console.log('ParsedIntakeInfo - parsedInsuranceInfo:', parsedInsuranceInfo);
  console.log('ParsedIntakeInfo - parsedPathologyInfo:', parsedPathologyInfo);
  console.log('ParsedIntakeInfo - parsedContactInfo:', parsedContactInfo);
  console.log('ParsedIntakeInfo - parsedDemographics:', parsedDemographics);
  const hasAnyData = parsedInsuranceInfo || parsedPathologyInfo || parsedContactInfo || parsedDemographics;
  if (!hasAnyData) {
    return null;
  }
  const formatValue = (value: any) => {
    if (!value || value === 'null' || value === '') return null;
    return String(value);
  };
  return;
};