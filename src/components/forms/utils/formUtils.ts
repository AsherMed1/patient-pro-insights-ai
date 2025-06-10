
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

export const getBrandColors = (project: any) => ({
  primary: project?.brand_primary_color || '#3B82F6',
  secondary: project?.brand_secondary_color || '#8B5CF6'
});

export const getDoctors = (project: any) => {
  if (project?.custom_doctors && (project.custom_doctors as any[]).length > 0) {
    return project.custom_doctors;
  }
  return null;
};

export const getInsuranceOptions = (project: any) => {
  if (project?.custom_insurance_list && (project.custom_insurance_list as any[]).length > 0) {
    return project.custom_insurance_list;
  }
  return getDefaultInsuranceOptions();
};

export const getFacilityInfo = (project: any) => {
  return project?.custom_facility_info as any || {};
};

export const getCustomLogo = (project: any) => {
  return project?.custom_logo_url;
};
