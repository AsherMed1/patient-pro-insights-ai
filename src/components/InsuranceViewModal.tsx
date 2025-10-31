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
  group_number?: string;
}

interface InsuranceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  insuranceInfo: InsuranceInfo;
  patientName?: string;
  patientDob?: string | null;
}

const InsuranceViewModal = ({ 
  isOpen, 
  onClose, 
  insuranceInfo, 
  patientName, 
  patientDob 
}: InsuranceViewModalProps) => {
  const hasInsuranceInfo = insuranceInfo.insurance_provider || 
                          insuranceInfo.insurance_plan || 
                          insuranceInfo.insurance_id || 
                          insuranceInfo.group_number;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Insurance Information</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Patient Info */}
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

          {/* Insurance Details */}
          {hasInsuranceInfo ? (
            <div className="space-y-3">
              {insuranceInfo.insurance_provider && (
                <div className="flex items-start justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Insurance Provider</div>
                    <div className="text-sm font-medium text-blue-900">{insuranceInfo.insurance_provider}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                </div>
              )}

              {insuranceInfo.insurance_plan && (
                <div className="flex items-start justify-between p-3 bg-green-50 rounded-lg">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Insurance Plan</div>
                    <div className="text-sm font-medium text-green-900">{insuranceInfo.insurance_plan}</div>
                  </div>
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
              )}

              {insuranceInfo.insurance_id && (
                <div className="flex items-start justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Insurance ID</div>
                    <div className="text-sm font-medium text-purple-900 font-mono">{insuranceInfo.insurance_id}</div>
                    {insuranceInfo.insurance_id_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 px-2 text-xs"
                        onClick={() => window.open(insuranceInfo.insurance_id_link, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Insurance Details
                      </Button>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">ID</Badge>
                </div>
              )}

              {insuranceInfo.group_number && (
                <div className="flex items-start justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-orange-700 uppercase tracking-wide">Group Number</div>
                    <div className="text-sm font-medium text-orange-900 font-mono">{insuranceInfo.group_number}</div>
                  </div>
                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">Group</Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm text-gray-500">No insurance information available</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InsuranceViewModal;