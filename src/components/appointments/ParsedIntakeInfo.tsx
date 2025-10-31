import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Heart, Phone, Shield, ExternalLink, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ParsedIntakeInfoProps {
  parsedInsuranceInfo?: any;
  parsedPathologyInfo?: any;
  parsedContactInfo?: any;
  parsedDemographics?: any;
  detectedInsuranceProvider?: string | null;
  detectedInsurancePlan?: string | null;
  detectedInsuranceId?: string | null;
  insuranceIdLink?: string | null;
  className?: string;
}
export const ParsedIntakeInfo: React.FC<ParsedIntakeInfoProps> = ({
  parsedInsuranceInfo,
  parsedPathologyInfo,
  parsedContactInfo,
  parsedDemographics,
  detectedInsuranceProvider,
  detectedInsurancePlan,
  detectedInsuranceId,
  insuranceIdLink,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
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

  return (
    <div className={`space-y-4 mt-4 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Patient Pro Insights
            </h4>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">

      {/* Demographics Section */}
      {parsedDemographics && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-sm text-purple-900">Demographics</span>
            </div>
            {formatValue(parsedDemographics.age) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Age:</span>{' '}
                <span className="font-medium">{parsedDemographics.age}</span>
              </div>
            )}
            {formatValue(parsedDemographics.dob) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Date of Birth:</span>{' '}
                <span className="font-medium">{parsedDemographics.dob}</span>
              </div>
            )}
            {formatValue(parsedDemographics.gender) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Gender:</span>{' '}
                <span className="font-medium">{parsedDemographics.gender}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Information Section */}
      {parsedContactInfo && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-900">Contact Information</span>
            </div>
            {formatValue(parsedContactInfo.dob) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Date of Birth:</span>{' '}
                <span className="font-medium">{parsedContactInfo.dob}</span>
              </div>
            )}
            {formatValue(parsedContactInfo.phone) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Phone:</span>{' '}
                <span className="font-medium">{parsedContactInfo.phone}</span>
              </div>
            )}
            {formatValue(parsedContactInfo.email) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{parsedContactInfo.email}</span>
              </div>
            )}
            {formatValue(parsedContactInfo.address) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Address:</span>{' '}
                <span className="font-medium">{parsedContactInfo.address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insurance Information Section */}
      {(parsedInsuranceInfo || detectedInsuranceProvider || detectedInsurancePlan || detectedInsuranceId) && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm text-green-900">Insurance Information</span>
            </div>
            {(formatValue(parsedInsuranceInfo?.insurance_provider) || detectedInsuranceProvider) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Provider:</span>{' '}
                <span className="font-medium">{formatValue(parsedInsuranceInfo?.insurance_provider) || detectedInsuranceProvider}</span>
              </div>
            )}
            {(formatValue(parsedInsuranceInfo?.insurance_plan) || detectedInsurancePlan) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Plan:</span>{' '}
                <span className="font-medium">{formatValue(parsedInsuranceInfo?.insurance_plan) || detectedInsurancePlan}</span>
              </div>
            )}
            {(formatValue(parsedInsuranceInfo?.insurance_id_number) || detectedInsuranceId) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Member ID:</span>{' '}
                <span className="font-medium">{formatValue(parsedInsuranceInfo?.insurance_id_number) || detectedInsuranceId}</span>
              </div>
            )}
            {formatValue(parsedInsuranceInfo?.insurance_group_number) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Group Number:</span>{' '}
                <span className="font-medium">{parsedInsuranceInfo.insurance_group_number}</span>
              </div>
            )}
            {insuranceIdLink && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => window.open(insuranceIdLink, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                View Insurance Card
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pathology Information Section */}
      {parsedPathologyInfo && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-sm text-amber-900">Medical Information</span>
            </div>
            {formatValue(parsedPathologyInfo.primary_complaint) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Primary Complaint:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.primary_complaint}</span>
              </div>
            )}
            {formatValue(parsedPathologyInfo.symptoms) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Symptoms:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.symptoms}</span>
              </div>
            )}
            {formatValue(parsedPathologyInfo.affected_area) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Affected Area:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.affected_area}</span>
              </div>
            )}
            {formatValue(parsedPathologyInfo.pain_level) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Pain Level:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.pain_level}</span>
              </div>
            )}
            {formatValue(parsedPathologyInfo.duration) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Duration:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.duration}</span>
              </div>
            )}
            {formatValue(parsedPathologyInfo.previous_treatments) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Previous Treatments:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.previous_treatments}</span>
              </div>
            )}
            {formatValue(parsedPathologyInfo.diagnosis) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Diagnosis:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.diagnosis}</span>
              </div>
            )}
            {formatValue(parsedPathologyInfo.treatment) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Treatment:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.treatment}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};