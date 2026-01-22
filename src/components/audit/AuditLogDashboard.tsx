import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, RefreshCw, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import PaginationControls from '@/components/shared/PaginationControls';
import { AuditLogDetailDrawer } from './AuditLogDetailDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_name: string | null;
  entity: string;
  action: string;
  description: string;
  source: string;
  metadata: any;
  ip_address: unknown;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 50;

export const AuditLogDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role, accessibleProjects } = useRole();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const fetchLogs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      // For non-admin users, only fetch their own logs
      if (role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let logsData = data || [];
      
      // Additional client-side filtering for project access
      // Filter logs to only show those from accessible projects or user's own actions
      if (role !== 'admin' && accessibleProjects.length > 0) {
        logsData = logsData.filter(log => {
          // Always show user's own logs
          if (log.user_id === user.id) return true;
          
          // Check if log metadata contains a project they have access to
          const metadata = log.metadata as Record<string, unknown> | null;
          const logProject = metadata?.project_name;
          if (typeof logProject === 'string' && accessibleProjects.includes(logProject)) return true;
          
          return false;
        });
      }
      
      setLogs(logsData);
    } catch (error: any) {
      toast({
        title: 'Error fetching audit logs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, role, accessibleProjects]);

  // Real-time subscriptions
  useEffect(() => {
    if (!realtimeEnabled || !user) return;

    const channel = supabase
      .channel('audit-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          const newLog = payload.new as AuditLog;
          
          // For non-admins, only add if it's their own log or related to their projects
          if (role !== 'admin') {
            const isOwnLog = newLog.user_id === user.id;
            const metadata = newLog.metadata as Record<string, unknown> | null;
            const logProject = metadata?.project_name;
            const hasProjectAccess = typeof logProject === 'string' && accessibleProjects.includes(logProject);
            
            if (!isOwnLog && !hasProjectAccess) return;
          }
          
          setLogs(prev => [newLog, ...prev]);
          toast({
            title: 'New audit log',
            description: `${payload.new.action} on ${payload.new.entity}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeEnabled, user, role, accessibleProjects]);

  // Extract unique projects from metadata for filter dropdown
  const uniqueProjects = Array.from(
    new Set(
      logs
        .map(log => {
          const metadata = log.metadata as Record<string, unknown> | null;
          return metadata?.project_name;
        })
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
    )
  ).sort();

  // Apply filters
  useEffect(() => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(query) ||
        log.entity.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.user_name?.toLowerCase().includes(query)
      );
    }

    // Entity filter
    if (entityFilter !== 'all') {
      filtered = filtered.filter(log => log.entity === entityFilter);
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(log => log.source === sourceFilter);
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(log => {
        const metadata = log.metadata as Record<string, unknown> | null;
        return metadata?.project_name === projectFilter;
      });
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [logs, searchQuery, entityFilter, actionFilter, sourceFilter, projectFilter]);

  const uniqueEntities = Array.from(new Set(logs.map(log => log.entity))).sort();
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();
  const uniqueSources = Array.from(new Set(logs.map(log => log.source))).sort();

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Entity', 'Action', 'Description', 'Source', 'Project'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => {
        const metadata = log.metadata as Record<string, unknown> | null;
        return [
          format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          log.user_name || 'System',
          log.entity,
          log.action,
          `"${log.description.replace(/"/g, '""')}"`,
          log.source,
          (metadata?.project_name as string) || ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-500';
      case 'update': return 'bg-blue-500';
      case 'delete': return 'bg-red-500';
      case 'trigger': return 'bg-purple-500';
      case 'portal_update': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'manual': return 'bg-blue-500';
      case 'automation': return 'bg-purple-500';
      case 'api': return 'bg-orange-500';
      case 'portal': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {role === 'admin' ? 'Audit Logs' : 'My Activity Logs'}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRealtimeEnabled(!realtimeEnabled)}
              >
                {realtimeEnabled ? 'Disable' : 'Enable'} Real-time
              </Button>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToJSON}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {uniqueProjects.map(project => (
                  <SelectItem key={project} value={project}>{project}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground mb-4">
            Showing {paginatedLogs.length} of {filteredLogs.length} logs
            {filteredLogs.length !== logs.length && ` (filtered from ${logs.length} total)`}
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>{log.user_name || 'System'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.entity}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionBadgeColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {log.description}
                        </TableCell>
                        <TableCell>
                          <Badge className={getSourceBadgeColor(log.source)}>
                            {log.source}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={filteredLogs.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <AuditLogDetailDrawer
        log={selectedLog}
        open={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
};
