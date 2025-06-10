
export const getDefaultInsuranceOptions = () => [
  { value: "aetna", label: "Aetna" },
  { value: "anthem", label: "Anthem Blue Cross Blue Shield" },
  { value: "cigna", label: "Cigna" },
  { value: "humana", label: "Humana" },
  { value: "kaiser", label: "Kaiser Permanente" },
  { value: "medicare", label: "Medicare" },
  { value: "medicaid", label: "Medicaid" },
  { value: "united", label: "UnitedHealthcare" },
  { value: "bcbs", label: "Blue Cross Blue Shield" },
  { value: "other", label: "Other" }
];

export const getBrandColors = (projectForm: any) => ({
  primary: projectForm?.brand_primary_color || '#3B82F6',
  secondary: projectForm?.brand_secondary_color || '#8B5CF6'
});

export const getDoctors = (projectForm: any) => {
  if (projectForm?.custom_doctors && (projectForm.custom_doctors as any[]).length > 0) {
    return projectForm.custom_doctors;
  }
  return null;
};

export const getInsuranceOptions = (projectForm: any) => {
  if (projectForm?.custom_insurance_list && (projectForm.custom_insurance_list as any[]).length > 0) {
    return projectForm.custom_insurance_list;
  }
  return getDefaultInsuranceOptions();
};

export const getFacilityInfo = (projectForm: any) => {
  return projectForm?.custom_facility_info as any || {};
};
