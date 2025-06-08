
export interface SpeedToLeadStat {
  id: string;
  date: string;
  project_name: string;
  lead_name: string;
  lead_phone_number: string;
  date_time_in: string;
  date_time_of_first_call: string | null;
  speed_to_lead_time_min: number | null;
  created_at: string;
  updated_at: string;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface SpeedRangeData {
  range: string;
  count: number;
  color: string;
}
