import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Activity, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';

interface ActivityEntry {
  id: string;
  timestamp: string;
  source: 'portal' | 'automation' | 'api' | 'system' | 'note';
  description: string;
  userName: string;
  action: string;
}

interface AdminActivityLogProps {
  appointmentId: string;
  appointmentName: string;
}

const sourceColors: Record<string, string> = {
  portal: 'bg-blue-100 text-blue-800',
  automation: 'bg-purple-100 text-purple-800',
  api: 'bg-green-100 text-green-800',
  system: 'bg-orange-100 text-orange-800',
  note: 'bg-gray-100 text-gray-800',
};

const sourceLabels: Record<string, string> = {
  portal: 'Portal',
  automation: 'Automation',
  api: 'API',
  system: 'System Trigger',
  note: 'Internal Note',
};

const AdminActivityLog = ({ appointmentId, appointmentName }: AdminActivityLogProps) => {
  const { isAdmin, loading: roleLoading } = useRole();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin() || roleLoading) return;
    fetchActivityLog();
  }, [appointmentId, roleLoading]);

  const classifySource = (rawSource: string, eventType?: string): ActivityEntry['source'] => {
    const s = (rawSource || '').toLowerCase();
    if (s === 'manual' || s === 'portal') return 'portal';
    if (s === 'automation' || s === 'database_trigger') return 'automation';
    if (s === 'api' || s === 'webhook') return 'api';
    // For security_audit_log entries
    if (eventType) {
      const e = eventType.toLowerCase();
      if (e.includes('auto_completed') || e.includes('auto_reset')) return 'system';
      if (e.includes('queued') || e.includes('fetch')) return 'automation';
    }
    return 'system';
  };

  const fetchActivityLog = async () => {
    setLoading(true);
    try {
      // Fetch audit_logs for this appointment
      const [auditResult, securityResult, notesResult] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('id, timestamp, source, description, user_name, action, metadata')
          .or(`entity.eq.${appointmentId},metadata->>appointment_id.eq.${appointmentId}`)
          .order('timestamp', { ascending: false })
          .limit(100),
        supabase
          .from('security_audit_log')
          .select('id, created_at, event_type, details')
          .filter('details->>appointment_id', 'eq', appointmentId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('appointment_notes')
          .select('id, created_at, note_text, created_by')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const allEntries: ActivityEntry[] = [];

      // Process audit_logs
      if (auditResult.data) {
        for (const log of auditResult.data) {
          allEntries.push({
            id: `audit-${log.id}`,
            timestamp: log.timestamp,
            source: classifySource(log.source),
            description: log.description,
            userName: log.user_name || 'Unknown User',
            action: log.action,
          });
        }
      }

      // Process security_audit_log
      if (securityResult.data) {
        for (const log of securityResult.data) {
          const details = log.details as Record<string, any> | null;
          const leadName = details?.lead_name || appointmentName;
          let desc = log.event_type?.replace(/_/g, ' ') || 'System event';
          
          if (details?.old_status && details?.new_status) {
            desc = `Status changed from '${details.old_status}' to '${details.new_status}' for ${leadName}`;
          } else if (log.event_type === 'appointment_auto_completed') {
            desc = `Appointment auto-completed: status set to ${details?.new_status || 'terminal'} for ${leadName}`;
          } else if (log.event_type === 'appointment_status_auto_reset') {
            desc = `Status auto-reset after tag removal for ${leadName}`;
          }

          allEntries.push({
            id: `sec-${log.id}`,
            timestamp: log.created_at,
            source: classifySource('', log.event_type || ''),
            description: desc,
            userName: 'System',
            action: log.event_type || 'system_event',
          });
        }
      }

      // Process appointment_notes
      if (notesResult.data) {
        for (const note of notesResult.data) {
          // Resolve user name from created_by (user ID)
          let noteAuthor = 'Unknown User';
          if (note.created_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', note.created_by)
              .single();
            if (profile?.full_name) noteAuthor = profile.full_name;
          }

          allEntries.push({
            id: `note-${note.id}`,
            timestamp: note.created_at,
            source: 'note',
            description: `Internal note: "${note.note_text.substring(0, 120)}${note.note_text.length > 120 ? '...' : ''}"`,
            userName: noteAuthor,
            action: 'note_added',
          });
        }
      }

      // Sort chronologically (newest first)
      allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEntries(allEntries);
    } catch (err) {
      console.error('Error fetching activity log:', err);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || !isAdmin()) return null;

  return (
    <Card className="print-card no-print">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Admin Activity Log</span>
                <Badge variant="secondary" className="text-xs">{entries.length}</Badge>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 text-xs border-l-2 border-muted pl-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                          {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${sourceColors[entry.source]}`} variant="outline">
                          {sourceLabels[entry.source]}
                        </Badge>
                      </div>
                      <p className="text-foreground mt-0.5">{entry.description}</p>
                      <p className="text-muted-foreground">by {entry.userName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AdminActivityLog;
