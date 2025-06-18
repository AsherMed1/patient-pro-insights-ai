
import React, { useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Lazy load the dashboard tabs component
const DashboardTabs = lazy(() => import('./dashboard/DashboardTabs'));

interface CallCenterDashboardProps {
  projectId?: string;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
    <span className="ml-2">Loading dashboard...</span>
  </div>
);

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
          <Suspense fallback={<LoadingSpinner />}>
            <DashboardTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallCenterDashboard;
