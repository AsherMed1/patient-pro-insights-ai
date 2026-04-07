import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatInCentralTime } from './dateTimeUtils';

interface AppointmentRow {
  lead_name: string;
  lead_phone_number?: string | null;
  lead_email?: string | null;
  dob?: string | null;
  project_name: string;
  date_of_appointment?: string | null;
  requested_time?: string | null;
  calendar_name?: string | null;
  status?: string | null;
  procedure_status?: string | null;
  agent?: string | null;
  detected_insurance_provider?: string | null;
  detected_insurance_plan?: string | null;
  detected_insurance_id?: string | null;
  date_appointment_created: string;
}

export const exportAppointmentsToExcel = (appointments: AppointmentRow[]) => {
  const data = appointments.map(a => ({
    'Patient Name': a.lead_name || '',
    'Phone': a.lead_phone_number || '',
    'Email': a.lead_email || '',
    'DOB': a.dob || '',
    'Project': a.project_name || '',
    'Appointment Date': a.date_of_appointment ? formatInCentralTime(a.date_of_appointment, 'MM/dd/yyyy') : '',
    'Requested Time': a.requested_time || '',
    'Location': a.calendar_name || '',
    'Status': a.status || 'New',
    'Procedure Status': a.procedure_status || '',
    'Agent': a.agent || '',
    'Insurance Provider': a.detected_insurance_provider || '',
    'Insurance Plan': a.detected_insurance_plan || '',
    'Insurance ID': a.detected_insurance_id || '',
    'Date Created': a.date_appointment_created ? formatInCentralTime(a.date_appointment_created, 'MM/dd/yyyy') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String((row as any)[key] || '').length)).valueOf() + 2
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Appointments');

  const filename = `appointments_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
};
