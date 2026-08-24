import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatInCentralTime } from './dateTimeUtils';

interface AppointmentRow {
  id?: string;
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
  cancellation_reason?: string | null;
  reschedule_eligible?: boolean | null;
  reschedule_block_reason?: string | null;
}

export interface ExportNote {
  note_text: string | null;
  created_at: string | null;
  created_by?: string | null;
  visibility?: string | null;
}

const formatNotes = (notes: ExportNote[] | undefined): string => {
  if (!notes || notes.length === 0) return '';
  return notes
    .map((n) => {
      const when = n.created_at ? formatInCentralTime(n.created_at, 'MM/dd/yyyy hh:mm a') : '';
      const who = n.created_by || 'System';
      const text = (n.note_text || '').replace(/\s*\n\s*/g, ' ').trim();
      return `${when} — ${who}: ${text}`;
    })
    .join('\n');
};

export const exportAppointmentsToExcel = (
  appointments: AppointmentRow[],
  notesByAppointment?: Record<string, ExportNote[]>,
) => {
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
    'Cancellation Reason': a.cancellation_reason || '',
    'Reschedule Eligible': a.reschedule_eligible === null || a.reschedule_eligible === undefined ? '' : (a.reschedule_eligible ? 'Yes' : 'No'),
    'Reschedule Block Reason': a.reschedule_block_reason || '',
    'Notes': a.id ? formatNotes(notesByAppointment?.[a.id]) : '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-size columns with a cap so long notes don't stretch the sheet
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const longest = Math.max(key.length, ...data.map(row => String((row as any)[key] || '').length));
    const cap = key === 'Notes' ? 80 : 40;
    return { wch: Math.min(longest + 2, cap) };
  });
  ws['!cols'] = colWidths;

  // Wrap the Notes column so multi-line note text stays readable
  const notesIndex = Object.keys(data[0] || {}).indexOf('Notes');
  if (notesIndex >= 0) {
    for (let r = 1; r <= data.length; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: notesIndex });
      if (ws[ref]) ws[ref].s = { alignment: { wrapText: true, vertical: 'top' } };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Appointments');

  const filename = `appointments_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
};
