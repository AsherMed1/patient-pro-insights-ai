import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle, Shield, Eye, Clock, Users, Database, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ComplianceMetric {
  category: string;
  score: number;
  status: 'compliant' | 'warning' | 'critical';
  items: ComplianceItem[];
}

interface ComplianceItem {
  name: string;
  status: 'complete' | 'partial' | 'missing';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface AuditEntry {
  id: string;
  event_type: string;
  patient_identifier: string;
  action: string;
  created_at: string;
  user_id: string;
  phi_accessed: boolean;
}

export const HipaaComplianceDashboard = () => {
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetric[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditEntry[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadComplianceData();
    loadAuditData();
  }, []);

  const loadComplianceData = () => {
    const metrics: ComplianceMetric[] = [
      {
        category: 'Access Controls',
        score: 85,
        status: 'warning',
        items: [
          { name: 'Role-Based Access Control', status: 'complete', description: 'Admin, Agent, Project User roles implemented', priority: 'high' },
          { name: 'Multi-Factor Authentication', status: 'missing', description: 'MFA not yet implemented', priority: 'high' },
          { name: 'Session Management', status: 'complete', description: 'Session tracking and timeouts active', priority: 'medium' },
          { name: 'Password Policies', status: 'partial', description: 'Basic password requirements in place', priority: 'medium' }
        ]
      },
      {
        category: 'Audit & Monitoring',
        score: 90,
        status: 'compliant',
        items: [
          { name: 'HIPAA Audit Logging', status: 'complete', description: 'Comprehensive PHI access logging', priority: 'high' },
          { name: 'Patient Data Access Tracking', status: 'complete', description: 'All patient data access monitored', priority: 'high' },
          { name: 'Failed Login Monitoring', status: 'partial', description: 'Basic login attempt tracking', priority: 'medium' },
          { name: 'Automated Alerts', status: 'missing', description: 'Real-time security alerts needed', priority: 'medium' }
        ]
      },
      {
        category: 'Data Protection',
        score: 80,
        status: 'warning',
        items: [
          { name: 'Encryption at Rest', status: 'complete', description: 'Database encryption enabled', priority: 'high' },
          { name: 'Encryption in Transit', status: 'complete', description: 'HTTPS/TLS implemented', priority: 'high' },
          { name: 'Field-Level Encryption', status: 'missing', description: 'SSN/Insurance ID encryption needed', priority: 'high' },
          { name: 'Data Retention Policies', status: 'complete', description: '7-year retention policy active', priority: 'medium' }
        ]
      },
      {
        category: 'Administrative Safeguards',
        score: 60,
        status: 'critical',
        items: [
          { name: 'HIPAA Training', status: 'missing', description: 'Staff training documentation needed', priority: 'high' },
          { name: 'Business Associate Agreements', status: 'partial', description: 'Some BAAs in place', priority: 'high' },
          { name: 'Incident Response Plan', status: 'missing', description: 'Formal incident response procedures needed', priority: 'medium' },
          { name: 'Risk Assessment', status: 'missing', description: 'Annual risk assessment required', priority: 'medium' }
        ]
      }
    ];

    setComplianceMetrics(metrics);
    const avgScore = metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length;
    setOverallScore(avgScore);
  };

  const loadAuditData = async () => {
    try {
      const { data, error } = await supabase
        .from('hipaa_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecentAudits(data || []);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'partial':
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'missing':
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
      case 'compliant':
        return 'bg-success/10 text-success';
      case 'partial':
      case 'warning':
        return 'bg-warning/10 text-warning';
      case 'missing':
      case 'critical':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const runSecurityScan = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-scan');
      if (error) throw error;
      
      toast({
        title: 'Security Scan Complete',
        description: 'HIPAA compliance scan completed successfully',
      });
      
      loadComplianceData();
    } catch (error) {
      toast({
        title: 'Security Scan Failed',
        description: 'Failed to run security scan',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading compliance data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HIPAA Compliance Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage healthcare data protection compliance</p>
        </div>
        <Button onClick={runSecurityScan} className="gap-2">
          <Shield className="h-4 w-4" />
          Run Security Scan
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{overallScore.toFixed(0)}%</span>
              <Badge className={getStatusColor(overallScore >= 90 ? 'compliant' : overallScore >= 70 ? 'warning' : 'critical')}>
                {overallScore >= 90 ? 'Compliant' : overallScore >= 70 ? 'Needs Attention' : 'Critical Issues'}
              </Badge>
            </div>
            <Progress value={overallScore} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {overallScore >= 90 
                ? 'Your system meets HIPAA compliance standards'
                : overallScore >= 70
                ? 'Address remaining issues to achieve full compliance'
                : 'Critical security issues must be resolved immediately'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="data">Data Protection</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {complianceMetrics.map((metric) => (
              <Card key={metric.category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {metric.category === 'Access Controls' && <Users className="h-5 w-5" />}
                      {metric.category === 'Audit & Monitoring' && <Eye className="h-5 w-5" />}
                      {metric.category === 'Data Protection' && <Database className="h-5 w-5" />}
                      {metric.category === 'Administrative Safeguards' && <FileText className="h-5 w-5" />}
                      {metric.category}
                    </CardTitle>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.score}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={metric.score} className="h-2" />
                    <div className="space-y-2">
                      {metric.items.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <span>{item.name}</span>
                          </div>
                          <Badge variant="outline" className={
                            item.priority === 'high' ? 'border-destructive text-destructive' :
                            item.priority === 'medium' ? 'border-warning text-warning' :
                            'border-muted text-muted-foreground'
                          }>
                            {item.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Recent HIPAA Audit Events</CardTitle>
              <CardDescription>Track all PHI access and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAudits.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No audit events found</p>
                ) : (
                  recentAudits.slice(0, 10).map((audit) => (
                    <div key={audit.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {audit.phi_accessed ? <Eye className="h-4 w-4 text-warning" /> : <Database className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-medium">{audit.event_type}</p>
                          <p className="text-sm text-muted-foreground">
                            {audit.action} - {audit.patient_identifier}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{new Date(audit.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(audit.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Next Priority: Implement Multi-Factor Authentication (MFA) for enhanced security.
                Visit Authentication settings in Supabase to configure MFA providers.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Access Control Implementation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceMetrics.find(m => m.category === 'Access Controls')?.items.map((item) => (
                    <div key={item.name} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="space-y-6">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Remaining OTP security warning: Configure shorter OTP expiry time (15 minutes recommended) in Supabase Auth settings.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Data Protection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceMetrics.find(m => m.category === 'Data Protection')?.items.map((item) => (
                    <div key={item.name} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};