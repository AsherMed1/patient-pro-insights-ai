
import React, { useState } from 'react';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardTabs from './dashboard/DashboardTabs';

interface CallCenterDashboardProps {
  projectId: string;
}

const CallCenterDashboard = ({ projectId }: CallCenterDashboardProps) => {
  const [activeTab, setActiveTab] = useState("projects");

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default CallCenterDashboard;
