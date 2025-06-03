
import React from 'react';
import StatCard from './StatCard';
import { Phone, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';

interface AgentStats {
  answeredCallsVM: number;
  pickups40Plus: number;
  conversations2Plus: number;
  bookedAppointments: number;
  avgDurationPerCall: number;
  shows: number;
  noShows: number;
  totalDialsMade: number;
  timeOnPhoneMinutes: number;
}

interface AgentStatsDisplayProps {
  stats: AgentStats;
}

const AgentStatsDisplay = ({ stats }: AgentStatsDisplayProps) => {
  return (
    <div className="space-y-6">
      {/* Call Performance */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
          <Phone className="h-5 w-5" />
          <span>Call Performance</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Answered Calls + VM" value={stats.answeredCallsVM} icon={Phone} color="blue" />
          <StatCard title="Pickups (40+ Seconds)" value={stats.pickups40Plus} icon={CheckCircle} color="green" />
          <StatCard title="Conversations (2+ Minutes)" value={stats.conversations2Plus} icon={Clock} color="purple" />
          <StatCard title="Avg Duration Per Call" value={stats.avgDurationPerCall} icon={TrendingUp} color="orange" isMinutes />
        </div>
      </div>

      {/* Appointment Performance */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Appointment Performance</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Booked Appointments" value={stats.bookedAppointments} icon={Users} color="blue" />
          <StatCard title="Shows" value={stats.shows} icon={CheckCircle} color="green" />
          <StatCard title="No Shows" value={stats.noShows} icon={Phone} color="red" />
        </div>
      </div>

      {/* Activity Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Activity Metrics</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard title="Total Dials Made" value={stats.totalDialsMade} icon={Phone} color="blue" />
          <StatCard title="Time on Phone" value={stats.timeOnPhoneMinutes} icon={Clock} color="purple" isMinutes />
        </div>
      </div>
    </div>
  );
};

export default AgentStatsDisplay;
