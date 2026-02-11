
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMasterDatabase } from '@/hooks/useMasterDatabase';
import { Database, FolderOpen, Calendar, UserCheck, Loader2 } from 'lucide-react';

const MasterDatabaseStats = () => {
  const { stats, loading } = useMasterDatabase();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading database statistics...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Total Projects</CardTitle>
          <FolderOpen className="h-4 w-4 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="stat-value">{stats.totalProjects}</div>
          <div className="flex items-center justify-between mt-2 text-xs opacity-90">
            <span>{stats.activeProjects} active</span>
            <span>{stats.disabledProjects} disabled</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Total Appointments</CardTitle>
          <Calendar className="h-4 w-4 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="stat-value">{stats.totalAppointments.toLocaleString()}</div>
          <p className="text-xs opacity-90 mt-1">In master database</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Active Agents</CardTitle>
          <UserCheck className="h-4 w-4 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="stat-value">{stats.totalAgents.toLocaleString()}</div>
          <p className="text-xs opacity-90 mt-1">Call center agents</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-90">Database Status</CardTitle>
          <Database className="h-4 w-4 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-white/20 text-white">
              {stats.totalAppointments > 0 || stats.totalAgents > 0 ? 'Active' : 'Empty'}
            </Badge>
          </div>
          <p className="text-xs opacity-90 mt-1">System operational</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterDatabaseStats;
