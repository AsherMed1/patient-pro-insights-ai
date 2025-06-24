
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardTabs from './dashboard/DashboardTabs';
import ApiKeysDisplay from './ApiKeysDisplay';

interface CallCenterDashboardProps {
  projectId?: string;
}

const CallCenterDashboard = ({ projectId = "project-1" }: CallCenterDashboardProps) => {
  const [activeTab, setActiveTab] = useState("projects");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Call Center Analytics Dashboard</CardTitle>
          <CardDescription>
            Overview of call center performance and metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardTabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
        </CardContent>
      </Card>

      <ApiKeysDisplay />
    </div>
  );
};

export default CallCenterDashboard;
