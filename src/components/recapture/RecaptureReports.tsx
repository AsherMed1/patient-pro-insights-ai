import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { useRole } from '@/hooks/useRole';

interface RecaptureCase {
  id: string;
  project_name: string;
  lost_type: 'cancelled' | 'no_show';
  work_status: 'pending' | 'engaging' | 'follow_up_required' | 'completed';
  outcome: string | null;
  recovered: boolean;
  attempt_count: number;
  entered_worklist_at: string;
  completed_at: string | null;
  assigned_user_id: string | null;
  completed_by: string | null;
}

interface UserMap {
  [id: string]: { full_name: string | null; email: string };
}

export default function RecaptureReports() {
  const { isAdmin, hasManagementAccess, isReviewOnly, isRecaptureRole, accessibleProjects } = useRole();
  const [allCases, setAllCases] = useState<RecaptureCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserMap>({});
  const fetchedRef = useRef(false);

  // Fetch once on mount. Role-based filtering happens at render time so that
  // unstable hook identities can never restart this effect (infinite spinner).
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const { data: rows, error } = await supabase.from('recapture_cases' as any).select('*');
        if (error) {
          console.error('Recapture reports fetch error:', error);
          setAllCases([]);
        } else {
          setAllCases(((rows as any) || []) as RecaptureCase[]);
        }
      } catch (e) {
        console.error('Recapture reports fetch error:', e);
        setAllCases([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email');
      if (cancelled) return;
      const map: UserMap = {};
      for (const u of (data as any[]) || []) map[u.id] = { full_name: u.full_name, email: u.email };
      setUsers(map);
    })();
    return () => { cancelled = true; };
  }, []);

  const projectKey = accessibleProjects.join(',');
  const reviewOnly = isReviewOnly() || isRecaptureRole();
  const cases = useMemo(() => {
    if (reviewOnly && accessibleProjects.length > 0) {
      return allCases.filter((c) => accessibleProjects.includes(c.project_name));
    }
    return allCases;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCases, reviewOnly, projectKey]);

  const stats = useMemo(() => {
    const total = cases.length;

    const completed = cases.filter((c) => c.work_status === 'completed').length;
    const recovered = cases.filter((c) => c.recovered).length;
    const pending = cases.filter((c) => c.work_status === 'pending').length;
    const engaging = cases.filter((c) => c.work_status === 'engaging').length;
    const followUp = cases.filter((c) => c.work_status === 'follow_up_required').length;
    const totalAttempts = cases.reduce((sum, c) => sum + (c.attempt_count || 0), 0);
    const avgAttempts = completed > 0 ? totalAttempts / completed : 0;

    const byProject: Record<string, { total: number; recovered: number; completed: number }> = {};
    const bySetter: Record<string, { total: number; recovered: number }> = {};
    const byDay: Record<string, { entered: number; completed: number }> = {};

    for (const c of cases) {
      if (!byProject[c.project_name]) byProject[c.project_name] = { total: 0, recovered: 0, completed: 0 };
      byProject[c.project_name].total++;
      if (c.recovered) byProject[c.project_name].recovered++;
      if (c.work_status === 'completed') byProject[c.project_name].completed++;

      const setterId = c.assigned_user_id || c.completed_by;
      if (setterId) {
        if (!bySetter[setterId]) bySetter[setterId] = { total: 0, recovered: 0 };
        bySetter[setterId].total++;
        if (c.recovered) bySetter[setterId].recovered++;
      }

      const day = format(parseISO(c.entered_worklist_at), 'yyyy-MM-dd');
      if (!byDay[day]) byDay[day] = { entered: 0, completed: 0 };
      byDay[day].entered++;
      if (c.completed_at) byDay[day].completed++;
    }

    return { total, completed, recovered, pending, engaging, followUp, totalAttempts, avgAttempts, byProject, bySetter, byDay };
  }, [cases]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Cases</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recovered</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-600">{stats.recovered}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recovery Rate</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.total > 0 ? Math.round((stats.recovered / stats.total) * 100) : 0}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Attempts / Completed</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.avgAttempts.toFixed(1)}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>By Clinic</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byProject)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([project, s]) => (
                  <div key={project} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
                    <span className="font-medium">{project}</span>
                    <span className="text-muted-foreground">{s.total} total · {s.recovered} recovered · {s.completed} completed</span>
                  </div>
                ))}
              {Object.keys(stats.byProject).length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Setter</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.bySetter)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([id, s]) => (
                  <div key={id} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
                    <span className="font-medium">{users[id]?.full_name || users[id]?.email || id.slice(0, 8)}</span>
                    <span className="text-muted-foreground">{s.total} total · {s.recovered} recovered</span>
                  </div>
                ))}
              {Object.keys(stats.bySetter).length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Volume (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {Object.entries(stats.byDay)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 30)
              .map(([day, s]) => (
                <div key={day} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
                  <span className="font-medium">{format(parseISO(day), 'MMM d, yyyy')}</span>
                  <span className="text-muted-foreground">{s.entered} entered · {s.completed} completed</span>
                </div>
              ))}
            {Object.keys(stats.byDay).length === 0 && <p className="text-sm text-muted-foreground">No daily data yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
