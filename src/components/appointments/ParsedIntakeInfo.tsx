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
  parsedMedicalInfo?: any;
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
  parsedMedicalInfo,
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
  console.log('ParsedIntakeInfo - parsedMedicalInfo:', parsedMedicalInfo);
  const hasAnyData = parsedInsuranceInfo || parsedPathologyInfo || parsedContactInfo || parsedDemographics || parsedMedicalInfo;
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

      {/* Medical Information Section */}
      {parsedPathologyInfo && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-sm text-amber-900">Medical Information</span>
            </div>
            
            {/* Single-line pipe-separated format */}
            <div className="text-sm leading-relaxed">
              {formatValue(parsedPathologyInfo.procedure_type) && (
                <>
                  <span className="text-muted-foreground">Pathology:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.procedure_type}</span>
                  {' - '}
                </>
              )}
              {formatValue(parsedPathologyInfo.duration) && (
                <>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.duration}</span>
                  {' | '}
                </>
              )}
              {formatValue(parsedPathologyInfo.oa_tkr_diagnosed) && (
                <>
                  <span className="text-muted-foreground">OA or TKR Diagnosed:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.oa_tkr_diagnosed}</span>
                  {' | '}
                </>
              )}
              {formatValue(parsedPathologyInfo.age_range) && (
                <>
                  <span className="text-muted-foreground">Age Range:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.age_range}</span>
                  {' | '}
                </>
              )}
              {formatValue(parsedPathologyInfo.trauma_related_onset) && (
                <>
                  <span className="text-muted-foreground">Trauma-related Onset:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.trauma_related_onset}</span>
                  {' | '}
                </>
              )}
              {formatValue(parsedPathologyInfo.pain_level) && (
                <>
                  <span className="text-muted-foreground">Pain Level:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.pain_level}</span>
                  {' | '}
                </>
              )}
              {formatValue(parsedPathologyInfo.symptoms) && (
                <>
                  <span className="text-muted-foreground">Symptoms:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.symptoms}</span>
                  {' | '}
                </>
              )}
              {formatValue(parsedPathologyInfo.previous_treatments) && (
                <>
                  <span className="text-muted-foreground">Treatments Tried:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.previous_treatments}</span>
                  {' | '}
                </>
              )}
              {formatValue(parsedPathologyInfo.imaging_done) && (
                <>
                  <span className="text-muted-foreground">Imaging Done:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.imaging_done}</span>
                  {' | '}
                </>
              )}
              {formatValue(parsedPathologyInfo.other_notes) && (
                <>
                  <span className="text-muted-foreground">Other:</span>{' '}
                  <span className="font-medium">{parsedPathologyInfo.other_notes}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical & PCP Information Section */}
      {parsedMedicalInfo && (
        <Card className="bg-teal-50 border-teal-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-teal-600" />
              <span className="font-medium text-sm text-teal-900">Medical & PCP Information</span>
            </div>
            {formatValue(parsedMedicalInfo.pcp_name) && (
              <div className="text-sm">
                <span className="text-muted-foreground">PCP Name:</span>{' '}
                <span className="font-medium">{parsedMedicalInfo.pcp_name}</span>
              </div>
            )}
            {formatValue(parsedMedicalInfo.pcp_phone) && (
              <div className="text-sm">
                <span className="text-muted-foreground">PCP Phone:</span>{' '}
                <span className="font-medium">{parsedMedicalInfo.pcp_phone}</span>
              </div>
            )}
            {formatValue(parsedMedicalInfo.pcp_address) && (
              <div className="text-sm">
                <span className="text-muted-foreground">PCP Address:</span>{' '}
                <span className="font-medium">{parsedMedicalInfo.pcp_address}</span>
              </div>
            )}
            {formatValue(parsedMedicalInfo.xray_details) && (
              <div className="text-sm">
                <span className="text-muted-foreground">X-ray Details:</span>{' '}
                <span className="font-medium">{parsedMedicalInfo.xray_details}</span>
              </div>
            )}
            {formatValue(parsedMedicalInfo.imaging_details) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Imaging Details:</span>{' '}
                <span className="font-medium">{parsedMedicalInfo.imaging_details}</span>
              </div>
            )}
            {formatValue(parsedMedicalInfo.medications) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Medications:</span>{' '}
                <span className="font-medium">{parsedMedicalInfo.medications}</span>
              </div>
            )}
            {formatValue(parsedMedicalInfo.allergies) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Allergies:</span>{' '}
                <span className="font-medium">{parsedMedicalInfo.allergies}</span>
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