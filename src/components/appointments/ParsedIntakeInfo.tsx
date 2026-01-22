import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Heart, Phone, Shield, ExternalLink, ChevronDown, Pencil, X, Check, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, parse } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserAttribution } from "@/hooks/useUserAttribution";
import { InsuranceCardUpload } from "./InsuranceCardUpload";

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
  insuranceBackLink?: string | null;
  dob?: string | null;
  className?: string;
  appointmentId?: string;
  onUpdate?: () => void;
  projectName?: string;
  patientName?: string;
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
  insuranceBackLink,
  dob,
  className = "",
  appointmentId,
  onUpdate,
  projectName,
  patientName,
}) => {
  const { toast } = useToast();
  const { userId, userName } = useUserAttribution();
  
  // Auto-expand when insurance data exists
  const hasInsuranceData = !!(
    parsedInsuranceInfo?.insurance_provider || 
    parsedInsuranceInfo?.plan_name ||
    detectedInsuranceProvider || 
    detectedInsurancePlan || 
    detectedInsuranceId ||
    insuranceIdLink
  );
  const [isOpen, setIsOpen] = useState(hasInsuranceData);
  
  // Insurance upload collapsible state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Insurance edit state
  const [isEditingInsurance, setIsEditingInsurance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editProvider, setEditProvider] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editMemberId, setEditMemberId] = useState("");
  const [editGroupNumber, setEditGroupNumber] = useState("");

  // PCP edit state
  const [isEditingPCP, setIsEditingPCP] = useState(false);
  const [isSavingPCP, setIsSavingPCP] = useState(false);
  const [editPCPName, setEditPCPName] = useState("");
  const [editPCPPhone, setEditPCPPhone] = useState("");
  const [editPCPAddress, setEditPCPAddress] = useState("");
  const [editUrologistName, setEditUrologistName] = useState("");
  const [editUrologistPhone, setEditUrologistPhone] = useState("");

  const isArterialInterventional = projectName === "Arterial Interventional Centers";

  const hasAnyData =
    parsedInsuranceInfo || parsedPathologyInfo || parsedContactInfo || parsedDemographics || parsedMedicalInfo || dob;
  if (!hasAnyData) {
    return null;
  }
  
  const calculateAge = (dobString: string) => {
    try {
      const today = new Date();
      const birthDate = new Date(dobString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  const formatValue = (value: any) => {
    if (!value || value === "null" || value === "") return null;
    return String(value);
  };

  const formatDOB = (dob: any) => {
    if (!dob || dob === "null" || dob === "") return null;
    try {
      // Parse YYYY-MM-DD format and convert to MM/DD/YYYY
      const date = parse(String(dob), "yyyy-MM-dd", new Date());
      return format(date, "MM/dd/yyyy");
    } catch {
      return String(dob);
    }
  };

  const handleStartEditInsurance = () => {
    // Initialize edit fields with current values
    setEditProvider(formatValue(parsedInsuranceInfo?.insurance_provider) || detectedInsuranceProvider || "");
    setEditPlan(formatValue(parsedInsuranceInfo?.insurance_plan) || detectedInsurancePlan || "");
    setEditMemberId(formatValue(parsedInsuranceInfo?.insurance_id_number) || detectedInsuranceId || "");
    setEditGroupNumber(formatValue(parsedInsuranceInfo?.insurance_group_number) || "");
    setIsEditingInsurance(true);
  };

  const handleCancelEdit = () => {
    setIsEditingInsurance(false);
  };

  const handleSaveInsurance = async () => {
    if (!appointmentId) {
      toast({
        title: "Error",
        description: "Cannot save: appointment ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Prepare updated parsed_insurance_info
      const updatedInsuranceInfo = {
        ...(parsedInsuranceInfo || {}),
        insurance_provider: editProvider || null,
        insurance_plan: editPlan || null,
        plan_name: editPlan || null, // Keep compatibility
        insurance_id_number: editMemberId || null,
        insurance_group_number: editGroupNumber || null,
      };

      const { data, error } = await supabase.functions.invoke('update-appointment-fields', {
        body: {
          appointmentId,
          updates: {
            parsed_insurance_info: updatedInsuranceInfo,
            detected_insurance_provider: editProvider || null,
            detected_insurance_plan: editPlan || null,
            detected_insurance_id: editMemberId || null,
          },
          userId,
          userName,
          changeSource: 'portal'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Insurance information updated",
      });

      setIsEditingInsurance(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving insurance:', error);
      toast({
        title: "Error",
        description: "Failed to save insurance information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // PCP edit handlers
  const handleStartEditPCP = () => {
    setEditPCPName(formatValue(parsedMedicalInfo?.pcp_name) || "");
    setEditPCPPhone(formatValue(parsedMedicalInfo?.pcp_phone) || "");
    setEditPCPAddress(formatValue(parsedMedicalInfo?.pcp_address) || "");
    setEditUrologistName(formatValue(parsedMedicalInfo?.urologist_name) || "");
    setEditUrologistPhone(formatValue(parsedMedicalInfo?.urologist_phone) || "");
    setIsEditingPCP(true);
  };

  const handleCancelEditPCP = () => {
    setIsEditingPCP(false);
  };

  const handleSavePCP = async () => {
    if (!appointmentId) {
      toast({
        title: "Error",
        description: "Cannot save: appointment ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPCP(true);
    try {
      const updatedMedicalInfo = {
        ...(parsedMedicalInfo || {}),
        pcp_name: editPCPName || null,
        pcp_phone: editPCPPhone || null,
        pcp_address: editPCPAddress || null,
        urologist_name: editUrologistName || null,
        urologist_phone: editUrologistPhone || null,
      };

      const { error } = await supabase.functions.invoke('update-appointment-fields', {
        body: {
          appointmentId,
          updates: { parsed_medical_info: updatedMedicalInfo },
          userId,
          userName,
          changeSource: 'portal'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "PCP information updated",
      });

      setIsEditingPCP(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving PCP:', error);
      toast({
        title: "Error",
        description: "Failed to save PCP information",
        variant: "destructive",
      });
    } finally {
      setIsSavingPCP(false);
    }
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
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Demographics Section */}
          {(parsedDemographics || dob) && (() => {
            const displayDOB = parsedDemographics?.dob || dob;
            const displayAge = parsedDemographics?.age || (displayDOB ? calculateAge(displayDOB)?.toString() : null);
            const displayGender = parsedDemographics?.gender;
            
            return (
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm text-purple-900">Demographics</span>
                  </div>
                  {formatValue(displayAge) && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Age:</span>{" "}
                      <span className="font-medium">{displayAge}</span>
                    </div>
                  )}
                  {formatDOB(displayDOB) && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Date of Birth:</span>{" "}
                      <span className="font-medium">{formatDOB(displayDOB)}</span>
                    </div>
                  )}
                  {formatValue(displayGender) && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Gender:</span>{" "}
                      <span className="font-medium">{displayGender}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

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
                    <span className="text-muted-foreground">Date of Birth:</span>{" "}
                    <span className="font-medium">{parsedContactInfo.dob}</span>
                  </div>
                )}
                {formatValue(parsedContactInfo.email) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium">{parsedContactInfo.email}</span>
                  </div>
                )}
                {formatValue(parsedContactInfo.address) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Address:</span>{" "}
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm text-green-900">Insurance Information</span>
                  </div>
                  {appointmentId && !isEditingInsurance && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditInsurance();
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isEditingInsurance && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={handleSaveInsurance}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingInsurance ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Provider</label>
                      <Input
                        value={editProvider}
                        onChange={(e) => setEditProvider(e.target.value)}
                        placeholder="Insurance provider"
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Plan</label>
                      <Input
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        placeholder="Insurance plan"
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Member ID</label>
                      <Input
                        value={editMemberId}
                        onChange={(e) => setEditMemberId(e.target.value)}
                        placeholder="Member ID"
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Group Number</label>
                      <Input
                        value={editGroupNumber}
                        onChange={(e) => setEditGroupNumber(e.target.value)}
                        placeholder="Group number"
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {(formatValue(parsedInsuranceInfo?.insurance_provider) || detectedInsuranceProvider) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Provider:</span>{" "}
                        <span className="font-medium">
                          {formatValue(parsedInsuranceInfo?.insurance_provider) || detectedInsuranceProvider}
                        </span>
                      </div>
                    )}
                    {(formatValue(parsedInsuranceInfo?.insurance_plan) || detectedInsurancePlan) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Plan:</span>{" "}
                        <span className="font-medium">
                          {formatValue(parsedInsuranceInfo?.insurance_plan) || detectedInsurancePlan}
                        </span>
                      </div>
                    )}
                    {(formatValue(parsedInsuranceInfo?.insurance_id_number) || detectedInsuranceId) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Member ID:</span>{" "}
                        <span className="font-medium">
                          {formatValue(parsedInsuranceInfo?.insurance_id_number) || detectedInsuranceId}
                        </span>
                      </div>
                    )}
                    {formatValue(parsedInsuranceInfo?.insurance_group_number) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Group Number:</span>{" "}
                        <span className="font-medium">{parsedInsuranceInfo.insurance_group_number}</span>
                      </div>
                    )}
                    {formatValue(parsedInsuranceInfo?.insurance_notes) && (
                      <div className="text-sm pt-2 border-t border-blue-200 mt-2">
                        <span className="text-muted-foreground">Insurance Notes:</span>{" "}
                        <span className="font-medium text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                          {parsedInsuranceInfo.insurance_notes}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {(insuranceIdLink || insuranceBackLink) && !isEditingInsurance && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => window.open(insuranceIdLink || insuranceBackLink || "", "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View Insurance Card
                  </Button>
                )}
                
                {/* Insurance Card Upload - Collapsible */}
                {appointmentId && !isEditingInsurance && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <Collapsible open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-green-100/50 transition-colors -mx-3">
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm text-green-800">
                              Upload Insurance Card
                            </span>
                          </div>
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 text-green-600 transition-transform",
                              isUploadOpen && "rotate-180"
                            )} 
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3">
                        <InsuranceCardUpload
                          appointmentId={appointmentId}
                          currentFrontUrl={insuranceIdLink}
                          currentBackUrl={insuranceBackLink}
                          onUploadComplete={() => onUpdate?.()}
                          patientName={patientName || "Patient"}
                          projectName={projectName}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
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

                {formatValue(parsedPathologyInfo.procedure_type) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Pathology:</span>{" "}
                    <Badge variant="outline" className="ml-2">
                      {parsedPathologyInfo.procedure_type}
                    </Badge>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.duration) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Duration:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.duration}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.oa_tkr_diagnosed) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">OA or TKR Diagnosed:</span>{" "}
                    <Badge variant={parsedPathologyInfo.oa_tkr_diagnosed === "YES" ? "default" : "secondary"}>
                      {parsedPathologyInfo.oa_tkr_diagnosed}
                    </Badge>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.age_range) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Age Range:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.age_range}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.trauma_related_onset) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Trauma-related Onset:</span>{" "}
                    <Badge variant={parsedPathologyInfo.trauma_related_onset === "YES" ? "destructive" : "secondary"}>
                      {parsedPathologyInfo.trauma_related_onset}
                    </Badge>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.pain_level) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Pain Level:</span>{" "}
                    <Badge variant={parseInt(parsedPathologyInfo.pain_level) >= 7 ? "destructive" : "secondary"}>
                      {parsedPathologyInfo.pain_level}/10
                    </Badge>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.symptoms) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Symptoms:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.symptoms}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.previous_treatments) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Treatments Tried:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.previous_treatments}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.imaging_done) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Imaging Done:</span>{" "}
                    <Badge variant={parsedPathologyInfo.imaging_done === "YES" ? "default" : "secondary"}>
                      {parsedPathologyInfo.imaging_done}
                    </Badge>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.imaging_type) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Imaging Type:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.imaging_type}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.other_notes) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Other:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.other_notes}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.primary_complaint) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Primary Complaint:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.primary_complaint}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.affected_area) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Affected Area:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.affected_area}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.affected_knee) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Affected Knee:</span>{" "}
                    <Badge 
                      variant="outline" 
                      className="ml-2 bg-amber-100 text-amber-800 border-amber-300"
                    >
                      {parsedPathologyInfo.affected_knee}
                    </Badge>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.diagnosis) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Diagnosis:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.diagnosis}</span>
                  </div>
                )}
                {formatValue(parsedPathologyInfo.treatment) && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Treatment:</span>{" "}
                    <span className="font-medium">{parsedPathologyInfo.treatment}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Medical & PCP Information Section */}
          {(parsedMedicalInfo || appointmentId) && (
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-teal-600" />
                    <span className="font-medium text-sm text-teal-900">Medical & PCP Information</span>
                  </div>
                  {appointmentId && !isEditingPCP && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditPCP();
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isEditingPCP && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-100"
                        onClick={handleSavePCP}
                        disabled={isSavingPCP}
                      >
                        {isSavingPCP ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleCancelEditPCP}
                        disabled={isSavingPCP}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingPCP ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">PCP Name</label>
                      <Input
                        value={editPCPName}
                        onChange={(e) => setEditPCPName(e.target.value)}
                        placeholder="Primary Care Physician name"
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">PCP Phone</label>
                      <Input
                        value={editPCPPhone}
                        onChange={(e) => setEditPCPPhone(e.target.value)}
                        placeholder="Phone number"
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">PCP Address</label>
                      <Input
                        value={editPCPAddress}
                        onChange={(e) => setEditPCPAddress(e.target.value)}
                        placeholder="Address"
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                    {isArterialInterventional && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Urologist Name</label>
                          <Input
                            value={editUrologistName}
                            onChange={(e) => setEditUrologistName(e.target.value)}
                            placeholder="Urologist name"
                            className="h-8 text-sm bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Urologist Phone</label>
                          <Input
                            value={editUrologistPhone}
                            onChange={(e) => setEditUrologistPhone(e.target.value)}
                            placeholder="Phone number"
                            className="h-8 text-sm bg-background"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {formatValue(parsedMedicalInfo?.pcp_name) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">PCP Name:</span>{" "}
                        <span className="font-medium">{parsedMedicalInfo.pcp_name}</span>
                      </div>
                    )}
                    {formatValue(parsedMedicalInfo?.pcp_phone) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">PCP Phone:</span>{" "}
                        <span className="font-medium">{parsedMedicalInfo.pcp_phone}</span>
                      </div>
                    )}
                    {formatValue(parsedMedicalInfo?.pcp_address) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">PCP Address:</span>{" "}
                        <span className="font-medium">{parsedMedicalInfo.pcp_address}</span>
                      </div>
                    )}
                    {isArterialInterventional && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Urologist Name:</span>{" "}
                        <span className="font-medium">{formatValue(parsedMedicalInfo?.urologist_name) || "—"}</span>
                      </div>
                    )}
                    {isArterialInterventional && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Urologist Phone:</span>{" "}
                        <span className="font-medium">{formatValue(parsedMedicalInfo?.urologist_phone) || "—"}</span>
                      </div>
                    )}
                    {formatValue(parsedMedicalInfo?.xray_details) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">X-ray Details:</span>{" "}
                        <span className="font-medium">{parsedMedicalInfo.xray_details}</span>
                      </div>
                    )}
                    {formatValue(parsedMedicalInfo?.imaging_details) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Imaging Details:</span>{" "}
                        <span className="font-medium">{parsedMedicalInfo.imaging_details}</span>
                      </div>
                    )}
                    {formatValue(parsedMedicalInfo?.medications) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Medications:</span>{" "}
                        <span className="font-medium">{parsedMedicalInfo.medications}</span>
                      </div>
                    )}
                    {formatValue(parsedMedicalInfo?.allergies) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Allergies:</span>{" "}
                        <span className="font-medium">{parsedMedicalInfo.allergies}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
