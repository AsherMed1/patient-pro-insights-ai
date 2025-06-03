
export const validateAndTransformAppointmentRow = (row: any): any => {
  // Required fields validation
  if (!row.date_appointment_created || !row.project_name || !row.lead_name) {
    throw new Error('Missing required fields: date_appointment_created, project_name, or lead_name');
  }

  // Transform and validate data types
  const transformedRow: any = {
    date_appointment_created: row.date_appointment_created,
    date_of_appointment: row.date_of_appointment || null,
    project_name: row.project_name,
    lead_name: row.lead_name,
    lead_email: row.lead_email || null,
    lead_phone_number: row.lead_phone_number || null,
    calendar_name: row.calendar_name || null,
    requested_time: row.requested_time || null,
    stage_booked: row.stage_booked || null,
    showed: row.showed === 'true' || row.showed === '1' ? true : row.showed === 'false' || row.showed === '0' ? false : null,
    confirmed: row.confirmed === 'true' || row.confirmed === '1' ? true : row.confirmed === 'false' || row.confirmed === '0' ? false : null,
    agent: row.agent || null,
    agent_number: row.agent_number || null,
    ghl_id: row.ghl_id || null,
    confirmed_number: row.confirmed_number || null,
    status: row.status || null,
    procedure_ordered: row.procedure_ordered === 'true' || row.procedure_ordered === '1' ? true : row.procedure_ordered === 'false' || row.procedure_ordered === '0' ? false : null
  };

  return transformedRow;
};
