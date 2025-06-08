
import type { SpeedToLeadStat, SpeedRangeData } from '../types';

export const filterValidStats = (stats: SpeedToLeadStat[]) => {
  return stats.filter(s => 
    s.date_time_of_first_call && 
    s.speed_to_lead_time_min !== null && 
    s.speed_to_lead_time_min >= 0 &&
    s.speed_to_lead_time_min <= 300 // 5 hours
  );
};

export const filterOutlierStats = (stats: SpeedToLeadStat[]) => {
  return stats.filter(s => 
    s.date_time_of_first_call && 
    s.speed_to_lead_time_min !== null && 
    s.speed_to_lead_time_min > 300 // > 5 hours
  );
};

export const generateSpeedRangeData = (validStats: SpeedToLeadStat[]): SpeedRangeData[] => {
  return [
    {
      range: '≤ 5 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min <= 5).length,
      color: '#22c55e'
    },
    {
      range: '5-15 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 5 && s.speed_to_lead_time_min <= 15).length,
      color: '#eab308'
    },
    {
      range: '15-60 min',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 15 && s.speed_to_lead_time_min <= 60).length,
      color: '#f97316'
    },
    {
      range: '1-5 hours',
      count: validStats.filter(s => s.speed_to_lead_time_min !== null && s.speed_to_lead_time_min > 60 && s.speed_to_lead_time_min <= 300).length,
      color: '#ef4444'
    }
  ];
};
