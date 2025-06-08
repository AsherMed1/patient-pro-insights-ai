
export interface ProjectStats {
  adSpend: number;
  newLeads: number;
  costPerLead: number;
  bookedAppointments: number;
  confirmedAppointments: number;
  unconfirmedAppointments: number;
  appointmentsToTakePlace: number;
  shows: number;
  noShows: number;
  confirmedPercentage: number;
  outboundDials: number;
  pickups40Plus: number;
  conversations2Plus: number;
  bookingPercentage: number;
}

export interface Project {
  id: string;
  project_name: string;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}
