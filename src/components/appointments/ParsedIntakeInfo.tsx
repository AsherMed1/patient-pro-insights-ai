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
  const hasAnyData = parsedInsuranceInfo || parsedPathologyInfo || parsedContactInfo || parsedDemographics;

  if (!hasAnyData) {
    return null;
  }

  const formatValue = (value: any) => {
    if (!value || value === 'null' || value === '') return null;
    return String(value);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {/* Insurance Information */}
      {parsedInsuranceInfo && (
        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-sm">Insurance</h4>
            </div>
            <div className="space-y-1 text-xs">
              {formatValue(parsedInsuranceInfo.provider) && (
                <div>
                  <span className="text-muted-foreground">Provider:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedInsuranceInfo.provider)}</span>
                </div>
              )}
              {formatValue(parsedInsuranceInfo.plan) && (
                <div>
                  <span className="text-muted-foreground">Plan:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedInsuranceInfo.plan)}</span>
                </div>
              )}
              {formatValue(parsedInsuranceInfo.id) && (
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedInsuranceInfo.id)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pathology Information */}
      {parsedPathologyInfo && (
        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-red-600" />
              <h4 className="font-medium text-sm">Medical</h4>
            </div>
            <div className="space-y-1 text-xs">
              {formatValue(parsedPathologyInfo.primary_complaint) && (
                <div>
                  <span className="text-muted-foreground">Chief Complaint:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedPathologyInfo.primary_complaint)}</span>
                </div>
              )}
              {formatValue(parsedPathologyInfo.affected_area) && (
                <div>
                  <span className="text-muted-foreground">Area:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedPathologyInfo.affected_area)}</span>
                </div>
              )}
              {formatValue(parsedPathologyInfo.pain_level) && (
                <div>
                  <span className="text-muted-foreground">Pain Level:</span>
                  <br />
                  <Badge variant="outline" className="text-xs">
                    {formatValue(parsedPathologyInfo.pain_level)}
                  </Badge>
                </div>
              )}
              {formatValue(parsedPathologyInfo.duration) && (
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedPathologyInfo.duration)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      {parsedContactInfo && (
        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-sm">Contact</h4>
            </div>
            <div className="space-y-1 text-xs">
              {formatValue(parsedContactInfo.phone) && (
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedContactInfo.phone)}</span>
                </div>
              )}
              {formatValue(parsedContactInfo.email) && (
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedContactInfo.email)}</span>
                </div>
              )}
              {formatValue(parsedContactInfo.dob) && (
                <div>
                  <span className="text-muted-foreground">DOB:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedContactInfo.dob)}</span>
                </div>
              )}
              {parsedContactInfo.medical_info?.pcp && (
                <div>
                  <span className="text-muted-foreground">PCP:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedContactInfo.medical_info.pcp)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demographics */}
      {parsedDemographics && (formatValue(parsedDemographics.age) || formatValue(parsedDemographics.gender)) && (
        <Card className="h-fit">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-sm">Demographics</h4>
            </div>
            <div className="space-y-1 text-xs">
              {formatValue(parsedDemographics.age) && (
                <div>
                  <span className="text-muted-foreground">Age:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedDemographics.age)}</span>
                </div>
              )}
              {formatValue(parsedDemographics.gender) && (
                <div>
                  <span className="text-muted-foreground">Gender:</span>
                  <br />
                  <span className="font-medium">{formatValue(parsedDemographics.gender)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};