import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, FileText, User, Calendar, ExternalLink } from 'lucide-react';

interface InsuranceInfo {
  insurance_provider?: string;
  insurance_plan?: string;
  insurance_id?: string;
  insurance_id_link?: string;
  insurance_back_link?: string;
  group_number?: string;
  // Secondary insurance
  secondary_provider?: string;
  secondary_plan?: string;
  secondary_id?: string;
  secondary_group_number?: string;
  secondary_front_link?: string;
  secondary_back_link?: string;
}

interface InsuranceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  insuranceInfo: InsuranceInfo;
  patientName?: string;
  patientDob?: string | null;
}

const CardPhotos = ({ frontUrl, backUrl }: { frontUrl?: string; backUrl?: string }) => {
  if (!frontUrl && !backUrl) return null;
  return (
    <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
      <div className="flex items-center space-x-2 mb-3">
        <FileText className="h-4 w-4 text-gray-600" />
        <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          Insurance Card Photos
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {frontUrl && (
          <div className="space-y-2">
            <div className="text-xs text-center text-muted-foreground font-medium">Front</div>
            <img
              src={frontUrl}
              alt="Insurance Card Front"
              className="w-full rounded-lg border border-gray-300 shadow-sm"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => window.open(frontUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Full Size
            </Button>
          </div>
        )}
        {backUrl && (
          <div className="space-y-2">
            <div className="text-xs text-center text-muted-foreground font-medium">Back</div>
            <img
              src={backUrl}
              alt="Insurance Card Back"
              className="w-full rounded-lg border border-gray-300 shadow-sm"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => window.open(backUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Full Size
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const InsuranceSection = ({
  label,
  provider,
  plan,
  id,
  groupNumber,
  idLink,
}: {
  label: 'Primary' | 'Secondary';
  provider?: string;
  plan?: string;
  id?: string;
  groupNumber?: string;
  idLink?: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-start justify-between p-3 bg-blue-50 rounded-lg">
      <div className="space-y-1">
        <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Insurance Provider</div>
        <div className={`text-sm font-medium ${provider ? 'text-blue-900' : 'text-gray-400 italic'}`}>
          {provider || 'Not provided'}
        </div>
      </div>
      <Badge variant="secondary" className="text-xs">{label}</Badge>
    </div>

    <div className="flex items-start justify-between p-3 bg-green-50 rounded-lg">
      <div className="space-y-1">
        <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Insurance Plan</div>
        <div className={`text-sm font-medium ${plan ? 'text-green-900' : 'text-gray-400 italic'}`}>
          {plan || 'Not provided'}
        </div>
      </div>
      <FileText className="h-4 w-4 text-green-600" />
    </div>

    <div className="flex items-start justify-between p-3 bg-purple-50 rounded-lg">
      <div className="space-y-1 flex-1">
        <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Insurance ID</div>
        <div className={`text-sm font-medium font-mono ${id ? 'text-purple-900' : 'text-gray-400 italic'}`}>
          {id || 'Not provided'}
        </div>
        {idLink && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-7 px-2 text-xs"
            onClick={() => window.open(idLink, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Insurance Details
          </Button>
        )}
      </div>
      <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">ID</Badge>
    </div>

    <div className="flex items-start justify-between p-3 bg-orange-50 rounded-lg">
      <div className="space-y-1">
        <div className="text-xs font-medium text-orange-700 uppercase tracking-wide">Group Number</div>
        <div className={`text-sm font-medium font-mono ${groupNumber ? 'text-orange-900' : 'text-gray-400 italic'}`}>
          {groupNumber || 'Not provided'}
        </div>
      </div>
      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">Group</Badge>
    </div>
  </div>
);

const InsuranceViewModal = ({
  isOpen,
  onClose,
  insuranceInfo,
  patientName,
  patientDob,
}: InsuranceViewModalProps) => {
  const hasSecondary = !!(
    insuranceInfo.secondary_provider ||
    insuranceInfo.secondary_plan ||
    insuranceInfo.secondary_id ||
    insuranceInfo.secondary_group_number ||
    insuranceInfo.secondary_front_link ||
    insuranceInfo.secondary_back_link
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Insurance Information</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(patientName || patientDob) && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Patient Information</div>
              {patientName && (
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{patientName}</span>
                </div>
              )}
              {patientDob && (
                <div className="flex items-center space-x-2 text-sm mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{patientDob}</span>
                </div>
              )}
            </div>
          )}

          <InsuranceSection
            label="Primary"
            provider={insuranceInfo.insurance_provider}
            plan={insuranceInfo.insurance_plan}
            id={insuranceInfo.insurance_id}
            groupNumber={insuranceInfo.group_number}
            idLink={insuranceInfo.insurance_id_link}
          />

          <CardPhotos
            frontUrl={insuranceInfo.insurance_id_link}
            backUrl={insuranceInfo.insurance_back_link}
          />

          {hasSecondary && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Secondary Insurance
                </div>
                <InsuranceSection
                  label="Secondary"
                  provider={insuranceInfo.secondary_provider}
                  plan={insuranceInfo.secondary_plan}
                  id={insuranceInfo.secondary_id}
                  groupNumber={insuranceInfo.secondary_group_number}
                  idLink={insuranceInfo.secondary_front_link}
                />
              </div>
              <CardPhotos
                frontUrl={insuranceInfo.secondary_front_link}
                backUrl={insuranceInfo.secondary_back_link}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InsuranceViewModal;
