import React from 'react';
import StatCard from './StatCard';
import { DollarSign, Users, Target, Calendar as CalendarEventIcon, CheckCircle, XCircle, Clock, Phone } from 'lucide-react';
import type { ProjectStats } from './types';

interface ProjectStatsDisplayProps {
  stats: ProjectStats;
}

const ProjectStatsDisplay = ({ stats }: ProjectStatsDisplayProps) => {
  return (
    <div className="space-y-6">
      {/* Marketing Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Marketing Metrics</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Ad Spend" value={stats.adSpend} icon={DollarSign} color="green" isCurrency />
          <StatCard title="New Leads" value={stats.newLeads} icon={Users} color="blue" />
          <StatCard title="Cost Per Lead" value={stats.costPerLead} icon={Target} color="purple" isCurrency />
        </div>
      </div>

      {/* Appointment Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
          <CalendarEventIcon className="h-5 w-5" />
          <span>Appointment Metrics</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Booked Appointments" value={stats.bookedAppointments} icon={CalendarEventIcon} color="blue" />
          <StatCard title="Confirmed Appointments" value={stats.confirmedAppointments} icon={CheckCircle} color="green" />
          <StatCard title="Unconfirmed Appointments" value={stats.unconfirmedAppointments} icon={Clock} color="yellow" />
          <StatCard title="Appointments To Take Place" value={stats.appointmentsToTakePlace} icon={CalendarEventIcon} color="purple" />
        </div>
      </div>

      {/* Show Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Show Metrics</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Shows" value={stats.shows} icon={CheckCircle} color="green" />
          <StatCard title="No Shows" value={stats.noShows} icon={XCircle} color="red" />
          <StatCard title="Confirmed Percentage" value={stats.confirmedPercentage} icon={Target} color="blue" isPercentage />
        </div>
      </div>

      {/* Call Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
          <Phone className="h-5 w-5" />
          <span>Call Metrics</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Outbound Dials" value={stats.outboundDials} icon={Phone} color="blue" />
          <StatCard title="Pickups (40+ Seconds)" value={stats.pickups40Plus} icon={CheckCircle} color="green" />
          <StatCard title="Conversations (2+ Minutes)" value={stats.conversations2Plus} icon={Clock} color="purple" />
          <StatCard title="Booking Percentage" value={stats.bookingPercentage} icon={Target} color="orange" isPercentage />
        </div>
      </div>
    </div>
  );
};

export default ProjectStatsDisplay;
