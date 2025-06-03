
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMasterDatabase } from '@/hooks/useMasterDatabase';
import { Database, FolderOpen, Calendar, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DataModal from './dashboard/DataModal';

const MasterDatabaseStats = () => {
  const { stats, loading } = useMasterDatabase();
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    title: string;
    data: any[];
    type: 'appointments' | 'calls' | 'leads' | 'agents' | 'projects' | 'adspend';
  }>({
    isOpen: false,
    title: '',
    data: [],
    type: 'appointments'
  });
  const { toast } = useToast();

  const handleCardClick = async (type: string) => {
    try {
      let data = [];
      let title = '';

      switch (type) {
        case 'projects':
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .order('project_name');
          if (projectsError) throw projectsError;
          data = projectsData || [];
          title = 'All Projects';
          break;

        case 'appointments':
          const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('all_appointments')
            .select('*')
            .order('date_appointment_created', { ascending: false })
            .limit(50);
          if (appointmentsError) throw appointmentsError;
          data = appointmentsData || [];
          title = 'Recent Appointments (Last 50)';
          break;

        case 'agents':
          const { data: agentsData, error: agentsError } = await supabase
            .from('agents')
            .select('*')
            .order('agent_name');
          if (agentsError) throw agentsError;
          data = agentsData || [];
          title = 'All Agents';
          break;

        case 'adspend':
          const { data: adSpendData, error: adSpendError } = await supabase
            .from('facebook_ad_spend')
            .select('*')
            .order('date', { ascending: false })
            .limit(50);
          if (adSpendError) throw adSpendError;
          data = adSpendData || [];
          title = 'Recent Ad Spend (Last 50)';
          break;

        default:
          return;
      }

      setModalData({
        isOpen: true,
        title,
        data,
        type: type as any
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    }
  };

  const closeModal = () => {
    setModalData({
      isOpen: false,
      title: '',
      data: [],
      type: 'appointments'
    });
  };

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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-colors"
          onClick={() => handleCardClick('projects')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs opacity-90 mt-1">Click to view projects</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer hover:from-green-600 hover:to-green-700 transition-colors"
          onClick={() => handleCardClick('appointments')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments.toLocaleString()}</div>
            <p className="text-xs opacity-90 mt-1">Click to view recent appointments</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-colors"
          onClick={() => handleCardClick('agents')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Active Agents</CardTitle>
            <UserCheck className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents.toLocaleString()}</div>
            <p className="text-xs opacity-90 mt-1">Click to view agents</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-colors"
          onClick={() => handleCardClick('adspend')}
        >
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
            <p className="text-xs opacity-90 mt-1">Click to view ad spend</p>
          </CardContent>
        </Card>
      </div>

      <DataModal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        title={modalData.title}
        data={modalData.data}
        type={modalData.type}
      />
    </>
  );
};

export default MasterDatabaseStats;
