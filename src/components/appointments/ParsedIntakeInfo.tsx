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

  return (
    <div className={`space-y-4 mt-4 ${className}`}>
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Heart className="h-4 w-4" />
        Patient Pro Insights
      </h4>

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
      {parsedInsuranceInfo && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm text-green-900">Insurance Information</span>
            </div>
            {formatValue(parsedInsuranceInfo.provider) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Provider:</span>{' '}
                <span className="font-medium">{parsedInsuranceInfo.provider}</span>
              </div>
            )}
            {formatValue(parsedInsuranceInfo.plan) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Plan:</span>{' '}
                <span className="font-medium">{parsedInsuranceInfo.plan}</span>
              </div>
            )}
            {formatValue(parsedInsuranceInfo.id) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Member ID:</span>{' '}
                <span className="font-medium">{parsedInsuranceInfo.id}</span>
              </div>
            )}
            {formatValue(parsedInsuranceInfo.group_number) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Group Number:</span>{' '}
                <span className="font-medium">{parsedInsuranceInfo.group_number}</span>
              </div>
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
            {formatValue(parsedPathologyInfo.symptoms) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Symptoms:</span>{' '}
                <span className="font-medium">{parsedPathologyInfo.symptoms}</span>
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
    </div>
  );
};