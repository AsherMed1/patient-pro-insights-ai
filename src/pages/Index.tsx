
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Phone, UserCheck, DollarSign, Clock, Users, TrendingUp, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Index = () => {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Projects query
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('project_name');
      
      if (error) {
        console.error('Projects fetch error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // Leads query
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', selectedProject, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from('new_leads').select('*');
      
      if (selectedProject !== "ALL") {
        query = query.eq('project_name', selectedProject);
      }
      
      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('date', dateTo);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) {
        console.error('Leads fetch error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // Appointments query
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', selectedProject, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from('all_appointments').select('*');
      
      if (selectedProject !== "ALL") {
        query = query.eq('project_name', selectedProject);
      }
      
      if (dateFrom) {
        query = query.gte('date_appointment_created', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('date_appointment_created', dateTo);
      }
      
      const { data, error } = await query.order('date_appointment_created', { ascending: false });
      
      if (error) {
        console.error('Appointments fetch error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // Calls query
  const { data: calls = [], isLoading: callsLoading } = useQuery({
    queryKey: ['calls', selectedProject, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from('all_calls').select('*');
      
      if (selectedProject !== "ALL") {
        query = query.eq('project_name', selectedProject);
      }
      
      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('date', dateTo);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) {
        console.error('Calls fetch error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // Ad spend query
  const { data: adSpend = [], isLoading: adSpendLoading } = useQuery({
    queryKey: ['adSpend', selectedProject, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase.from('facebook_ad_spend').select('*');
      
      if (selectedProject !== "ALL") {
        query = query.eq('project_name', selectedProject);
      }
      
      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('date', dateTo);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) {
        console.error('Ad spend fetch error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  const totalAdSpend = adSpend.reduce((sum, spend) => sum + (parseFloat(spend.spend) || 0), 0);
  const confirmedAppointments = appointments.filter(apt => apt.confirmed);

  // Show error message if projects fail to load
  useEffect(() => {
    if (projectsError) {
      toast.error("Failed to load projects. Please try refreshing the page.");
    }
  }, [projectsError]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please sign in to access the dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isLoading = projectsLoading || leadsLoading || appointmentsLoading || callsLoading || adSpendLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.email}! Here's an overview of your performance metrics.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.project_name}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="dateFrom">From Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>
          
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProject("ALL");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : leads.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : appointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {confirmedAppointments.length} confirmed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : calls.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ad Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `$${totalAdSpend.toFixed(2)}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Recent Leads</TabsTrigger>
          <TabsTrigger value="appointments">Recent Appointments</TabsTrigger>
          <TabsTrigger value="calls">Recent Calls</TabsTrigger>
        </TabsList>
        
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>Latest leads from all projects</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading leads...</div>
              ) : leads.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No leads found</div>
              ) : (
                <div className="space-y-2">
                  {leads.slice(0, 10).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{lead.lead_name}</p>
                        <p className="text-sm text-muted-foreground">{lead.project_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{lead.date}</p>
                        <Badge variant="outline">{lead.status || 'New'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
              <CardDescription>Latest appointments from all projects</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading appointments...</div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No appointments found</div>
              ) : (
                <div className="space-y-2">
                  {appointments.slice(0, 10).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{appointment.lead_name}</p>
                        <p className="text-sm text-muted-foreground">{appointment.project_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{appointment.date_of_appointment}</p>
                        <Badge variant={appointment.confirmed ? "default" : "secondary"}>
                          {appointment.confirmed ? "Confirmed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>Latest calls from all projects</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading calls...</div>
              ) : calls.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No calls found</div>
              ) : (
                <div className="space-y-2">
                  {calls.slice(0, 10).map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{call.lead_name}</p>
                        <p className="text-sm text-muted-foreground">{call.project_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{call.date}</p>
                        <Badge variant="outline">{call.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
