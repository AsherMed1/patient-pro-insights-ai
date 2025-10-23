import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, Clock, Phone, Mail, Check, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatTime } from '@/components/appointments/utils';

interface RescheduleRecord {
  id: string;
  appointment_id: string;
  original_date: string | null;
  original_time: string | null;
  new_date: string;
  new_time: string | null;
  requested_at: string;
  processed: boolean;
  processed_at: string | null;
  notes: string | null;
  project_name: string;
  lead_name: string;
  lead_phone: string | null;
  lead_email: string | null;
}

const ReschedulesManager = () => {
  const [reschedules, setReschedules] = useState<RescheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProcessed, setShowProcessed] = useState(false);
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<string[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch available projects
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('project_name')
        .eq('active', true)
        .order('project_name');
      
      if (!error && data) {
        setProjects(data.map(p => p.project_name));
      }
    };
    fetchProjects();
  }, []);

  // Fetch reschedules
  const fetchReschedules = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointment_reschedules')
        .select('*')
        .order('requested_at', { ascending: false });

      // Filter by processed status
      if (!showProcessed) {
        query = query.eq('processed', false);
      }

      // Filter by project
      if (projectFilter !== 'ALL') {
        query = query.eq('project_name', projectFilter);
      }

      // Search by patient name
      if (searchTerm.trim()) {
        query = query.ilike('lead_name', `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReschedules(data || []);
    } catch (error) {
      console.error('Error fetching reschedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reschedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark as processed
  const handleMarkAsProcessed = async (rescheduleId: string) => {
    setProcessingIds(prev => new Set(prev).add(rescheduleId));
    
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('appointment_reschedules')
        .update({
          processed: true,
          processed_by: userData?.user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', rescheduleId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reschedule marked as processed',
      });
      
      fetchReschedules();
    } catch (error) {
      console.error('Error marking as processed:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark as processed',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(rescheduleId);
        return newSet;
      });
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchReschedules();

    const channel = supabase
      .channel('reschedules-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointment_reschedules',
      }, () => {
        fetchReschedules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showProcessed, projectFilter, searchTerm]);

  const pendingCount = reschedules.filter(r => !r.processed).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reschedule Queue</CardTitle>
            <CardDescription>
              Manage appointment reschedule requests from project portals
            </CardDescription>
          </div>
          {!showProcessed && pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {pendingCount} Pending
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Input
              placeholder="Search by patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-processed"
              checked={showProcessed}
              onCheckedChange={(checked) => setShowProcessed(!!checked)}
            />
            <Label htmlFor="show-processed" className="cursor-pointer">
              Show Processed
            </Label>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Reschedule Cards */}
        {!loading && (
          <div className="space-y-4">
            {reschedules.map((reschedule) => (
              <Card
                key={reschedule.id}
                className={reschedule.processed ? 'bg-green-50 border-green-200' : 'bg-white'}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{reschedule.lead_name}</CardTitle>
                      <CardDescription>{reschedule.project_name}</CardDescription>
                    </div>
                    {reschedule.processed ? (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Processed
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Pending</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Original Appointment */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        Original Appointment
                      </h4>
                      <div className="bg-muted p-3 rounded-lg space-y-1">
                        {reschedule.original_date ? (
                          <p className="text-sm flex items-center">
                            <CalendarIcon className="inline h-4 w-4 mr-2" />
                            {formatDate(reschedule.original_date)}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">No date recorded</p>
                        )}
                        {reschedule.original_time && (
                          <p className="text-sm flex items-center">
                            <Clock className="inline h-4 w-4 mr-2" />
                            {formatTime(reschedule.original_time)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* New Requested Time */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">
                        New Requested Time
                      </h4>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-1">
                        <p className="text-sm font-medium flex items-center">
                          <CalendarIcon className="inline h-4 w-4 mr-2 text-blue-600" />
                          {formatDate(reschedule.new_date)}
                        </p>
                        {reschedule.new_time && (
                          <p className="text-sm font-medium flex items-center">
                            <Clock className="inline h-4 w-4 mr-2 text-blue-600" />
                            {formatTime(reschedule.new_time)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reschedule.lead_phone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{reschedule.lead_phone}</span>
                      </div>
                    )}
                    {reschedule.lead_email && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{reschedule.lead_email}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {reschedule.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">{reschedule.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!reschedule.processed && (
                      <Button
                        onClick={() => handleMarkAsProcessed(reschedule.id)}
                        disabled={processingIds.has(reschedule.id)}
                      >
                        {processingIds.has(reschedule.id) ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Mark as Processed
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `/project/${encodeURIComponent(reschedule.project_name)}`,
                          '_blank'
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View in Portal
                    </Button>
                  </div>

                  {/* Processed Info */}
                  {reschedule.processed && reschedule.processed_at && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      Processed on {formatDate(reschedule.processed_at)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && reschedules.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">
              No {showProcessed ? 'processed' : 'pending'} reschedules found
            </p>
            <p className="text-sm">
              {showProcessed
                ? 'Reschedule requests will appear here once processed'
                : 'Reschedule requests from project portals will appear here'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReschedulesManager;
