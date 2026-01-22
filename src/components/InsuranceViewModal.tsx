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
          <div className="space-y-3">
            {/* Insurance Provider */}
            <div className="flex items-start justify-between p-3 bg-blue-50 rounded-lg">
              <div className="space-y-1">
                <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Insurance Provider</div>
                <div className={`text-sm font-medium ${insuranceInfo.insurance_provider ? 'text-blue-900' : 'text-gray-400 italic'}`}>
                  {insuranceInfo.insurance_provider || 'Not provided'}
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">Primary</Badge>
            </div>

            {/* Insurance Plan */}
            <div className="flex items-start justify-between p-3 bg-green-50 rounded-lg">
              <div className="space-y-1">
                <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Insurance Plan</div>
                <div className={`text-sm font-medium ${insuranceInfo.insurance_plan ? 'text-green-900' : 'text-gray-400 italic'}`}>
                  {insuranceInfo.insurance_plan || 'Not provided'}
                </div>
              </div>
              <FileText className="h-4 w-4 text-green-600" />
            </div>

            {/* Insurance ID */}
            <div className="flex items-start justify-between p-3 bg-purple-50 rounded-lg">
              <div className="space-y-1 flex-1">
                <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Insurance ID</div>
                <div className={`text-sm font-medium font-mono ${insuranceInfo.insurance_id ? 'text-purple-900' : 'text-gray-400 italic'}`}>
                  {insuranceInfo.insurance_id || 'Not provided'}
                </div>
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

            {/* Group Number */}
            <div className="flex items-start justify-between p-3 bg-orange-50 rounded-lg">
              <div className="space-y-1">
                <div className="text-xs font-medium text-orange-700 uppercase tracking-wide">Group Number</div>
                <div className={`text-sm font-medium font-mono ${insuranceInfo.group_number ? 'text-orange-900' : 'text-gray-400 italic'}`}>
                  {insuranceInfo.group_number || 'Not provided'}
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">Group</Badge>
            </div>
          </div>

          {/* Insurance Card Photos */}
          {(insuranceInfo.insurance_id_link || insuranceInfo.insurance_back_link) && (
            <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-4 w-4 text-gray-600" />
                <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Insurance Card Photos
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Front of Card */}
                {insuranceInfo.insurance_id_link && (
                  <div className="space-y-2">
                    <div className="text-xs text-center text-muted-foreground font-medium">Front</div>
                    <img 
                      src={insuranceInfo.insurance_id_link} 
                      alt="Insurance Card Front"
                      className="w-full rounded-lg border border-gray-300 shadow-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => window.open(insuranceInfo.insurance_id_link, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Full Size
                    </Button>
                  </div>
                )}
                {/* Back of Card */}
                {insuranceInfo.insurance_back_link && (
                  <div className="space-y-2">
                    <div className="text-xs text-center text-muted-foreground font-medium">Back</div>
                    <img 
                      src={insuranceInfo.insurance_back_link} 
                      alt="Insurance Card Back"
                      className="w-full rounded-lg border border-gray-300 shadow-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => window.open(insuranceInfo.insurance_back_link, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Full Size
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InsuranceViewModal;