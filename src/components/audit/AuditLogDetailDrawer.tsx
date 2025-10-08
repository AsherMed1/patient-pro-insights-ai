import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { User, Clock, Server, Code, Database, Globe } from 'lucide-react';

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

interface AuditLogDetailDrawerProps {
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}

export const AuditLogDetailDrawer = ({ log, open, onClose }: AuditLogDetailDrawerProps) => {
  if (!log) return null;

  const hasBeforeAfter = log.metadata?.before || log.metadata?.after;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audit Log Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Timestamp</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(log.timestamp), 'PPpp')}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">User</div>
                  <div className="text-sm text-muted-foreground">
                    {log.user_name || 'System'}
                    {log.user_id && (
                      <div className="font-mono text-xs">{log.user_id}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Database className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Entity</div>
                  <Badge variant="outline">{log.entity}</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Code className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Action</div>
                  <Badge>{log.action}</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Server className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Source</div>
                  <Badge>{log.source}</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium mb-3">Description</h3>
            <p className="text-sm text-muted-foreground">{log.description}</p>
          </div>

          {/* Before/After Changes */}
          {hasBeforeAfter && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Changes</h3>
                <div className="grid grid-cols-2 gap-4">
                  {log.metadata.before && (
                    <div>
                      <div className="text-xs font-medium mb-2 text-muted-foreground">Before</div>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(log.metadata.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.metadata.after && (
                    <div>
                      <div className="text-xs font-medium mb-2 text-muted-foreground">After</div>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(log.metadata.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Full Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Full Metadata</h3>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </>
          )}

          {/* Technical Details */}
          {(log.ip_address || log.user_agent) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Technical Details</h3>
                <div className="space-y-3">
                  {log.ip_address && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">IP Address</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {String(log.ip_address)}
                        </div>
                      </div>
                    </div>
                  )}
                  {log.user_agent && (
                    <div className="flex items-start gap-3">
                      <Server className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">User Agent</div>
                        <div className="text-sm text-muted-foreground break-all">
                          {log.user_agent}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
