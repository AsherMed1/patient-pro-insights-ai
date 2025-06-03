
export const downloadAppointmentTemplate = () => {
  const headers = [
    'date_appointment_created',
    'date_of_appointment',
    'project_name',
    'lead_name',
    'lead_email',
    'lead_phone_number',
    'calendar_name',
    'requested_time',
    'stage_booked',
    'showed',
    'confirmed',
    'agent',
    'agent_number',
    'ghl_id',
    'confirmed_number',
    'status',
    'procedure_ordered'
  ];

  const csvContent = headers.join(',') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'appointments_import_template.csv';
  link.click();
  window.URL.revokeObjectURL(url);
};
