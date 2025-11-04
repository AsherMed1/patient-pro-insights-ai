import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, Clock, Copy, Download, ExternalLink, FileText, Loader2, Search } from 'lucide-react';
import { useEmrQueue, EmrQueueItem } from '@/hooks/useEmrQueue';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface EmrProcessingQueueProps {
  projectFilter?: string;
}

export const EmrProcessingQueue = ({ projectFilter }: EmrProcessingQueueProps) => {
  const { pendingItems, completedItems, loading, stats, refreshQueue, markComplete } = useEmrQueue(projectFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'project'>('newest');
  const [selectedItem, setSelectedItem] = useState<EmrQueueItem | null>(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [processingNotes, setProcessingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkedInsurance, setCheckedInsurance] = useState(false);
  const [checkedAvailability, setCheckedAvailability] = useState(false);
  const [checkedEmrAccuracy, setCheckedEmrAccuracy] = useState(false);
  const [insuranceDetailsItem, setInsuranceDetailsItem] = useState<EmrQueueItem | null>(null);
  const [insuranceDetailsOpen, setInsuranceDetailsOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const downloadInsuranceImage = async (imageUrl: string, patientName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insurance-card-${patientName.replace(/\s+/g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Downloaded', description: 'Insurance card image downloaded' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to download insurance image',
        variant: 'destructive'
      });
    }
  };

  const viewInsuranceDetails = (item: EmrQueueItem) => {
    setInsuranceDetailsItem(item);
    setInsuranceDetailsOpen(true);
  };

  const getUrgencyBadge = (queuedAt: string) => {
    const queuedDate = new Date(queuedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - queuedDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return <Badge variant="destructive" className="ml-2">🔴 Urgent (&gt;24h)</Badge>;
    } else if (hoursDiff > 12) {
      return <Badge variant="oon" className="ml-2">🟡 &gt;12h</Badge>;
    }
    return null;
  };

  const sortItems = (items: EmrQueueItem[]) => {
    let filtered = items.filter(item =>
      item.lead_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.queued_at).getTime() - new Date(a.queued_at).getTime());
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.queued_at).getTime() - new Date(b.queued_at).getTime());
      case 'project':
        return filtered.sort((a, b) => a.project_name.localeCompare(b.project_name));
      default:
        return filtered;
    }
  };

  const handleMarkComplete = () => {
    if (!selectedItem) return;
    setCompletionModalOpen(true);
    setProcessingNotes('');
    setCheckedInsurance(false);
    setCheckedAvailability(false);
    setCheckedEmrAccuracy(false);
  };

  const handleSubmitCompletion = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      await markComplete(
        selectedItem.id,
        selectedItem.appointment_id,
        processingNotes
      );
      setCompletionModalOpen(false);
      setSelectedItem(null);
      setProcessingNotes('');
      setCheckedInsurance(false);
      setCheckedAvailability(false);
      setCheckedEmrAccuracy(false);
      
      toast({
        title: 'Success',
        description: 'Appointment marked as complete in EMR'
      });
    } catch (error) {
      // Error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const renderQueueCard = (item: EmrQueueItem, isPending: boolean) => (
    <Card key={item.id} className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{item.lead_name}</CardTitle>
            <CardDescription className="mt-1">
              <Badge className="mr-2">{item.project_name}</Badge>
              {item.project_emr_system && (
                <Badge variant="secondary" className="ml-2">
                  EMR: {item.project_emr_system}
                </Badge>
              )}
              {item.date_of_appointment && (
                <span className="text-sm ml-2">
                  Appt: {format(new Date(item.date_of_appointment), 'MMM d, yyyy h:mm a')}
                </span>
              )}
            </CardDescription>
          </div>
          {isPending && getUrgencyBadge(item.queued_at)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <div className="flex items-center gap-2">
              <p className="font-mono">{item.lead_phone_number || 'N/A'}</p>
              {item.lead_phone_number && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(item.lead_phone_number!, 'Phone number')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <div className="flex items-center gap-2">
              <p className="truncate">{item.lead_email || 'N/A'}</p>
              {item.lead_email && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(item.lead_email!, 'Email')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">DOB</p>
            <div className="flex items-center gap-2">
              <p>{item.dob ? format(new Date(item.dob), 'MM/dd/yyyy') : 'N/A'}</p>
              {item.dob && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(format(new Date(item.dob!), 'MM/dd/yyyy'), 'DOB')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Insurance Information</p>
                <p className="font-medium">{item.detected_insurance_provider || 'N/A'}</p>
                {item.detected_insurance_plan && (
                  <p className="text-xs text-muted-foreground">{item.detected_insurance_plan}</p>
                )}
                {item.detected_insurance_id && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-mono">{item.detected_insurance_id}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(item.detected_insurance_id!, 'Insurance ID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                {item.insurance_id_link && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(item.insurance_id_link!, '_blank')}
                      title="View insurance card"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadInsuranceImage(item.insurance_id_link!, item.lead_name)}
                      title="Download insurance card"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => viewInsuranceDetails(item)}
                  title="View insurance details"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* EMR Quick Access - Only show for pending items */}
        {isPending && item.project_emr_link && (
          <div className="pt-3 border-t">
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => {
                console.log('Opening EMR link:', item.project_emr_link);
                window.open(item.project_emr_link!, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open {item.project_emr_system || 'EMR'} System
            </Button>
          </div>
        )}
        {isPending && !item.project_emr_link && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground text-center">
              💡 Tip: Configure EMR link in Projects Manager for quick access
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {isPending ? (
              <>
                <Clock className="inline h-4 w-4 mr-1" />
                In queue: {formatDistanceToNow(new Date(item.queued_at), { addSuffix: true })}
              </>
            ) : (
              <>
                <CheckCircle2 className="inline h-4 w-4 mr-1 text-green-600" />
                Completed {item.processed_at && formatDistanceToNow(new Date(item.processed_at), { addSuffix: true })}
                {item.processed_by_name && ` by ${item.processed_by_name}`}
              </>
            )}
          </div>
          {isPending ? (
            <Button
              onClick={() => {
                setSelectedItem(item);
                handleMarkComplete();
              }}
            >
              Mark Complete
            </Button>
          ) : (
            <div className="text-sm space-y-1">
              {item.project_emr_system && (
                <p><strong>EMR System:</strong> {item.project_emr_system}</p>
              )}
              {item.notes && (
                <p className="text-muted-foreground"><strong>Notes:</strong> {item.notes}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalPending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Urgent (&gt;24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.urgent24h}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completedToday}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="project">By Project</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshQueue}>
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending EMR Entry
              {stats.totalPending > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.totalPending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : sortItems(pendingItems).length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>No pending EMR entries!</p>
                  <p className="text-sm mt-2">All confirmed appointments have been processed.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {sortItems(pendingItems).map((item) => renderQueueCard(item, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : sortItems(completedItems).length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>No completed entries yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {sortItems(completedItems).map((item) => renderQueueCard(item, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Completion Modal */}
      <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Complete in EMR</DialogTitle>
            <DialogDescription>
              Confirm processing for {selectedItem?.lead_name}'s appointment
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Processing Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any relevant notes..."
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Required Checklist */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Required Confirmations</Label>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="check-insurance"
                      checked={checkedInsurance}
                      onCheckedChange={(checked) => setCheckedInsurance(checked === true)}
                    />
                    <label
                      htmlFor="check-insurance"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      I checked and confirmed insurance
                    </label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="check-availability"
                      checked={checkedAvailability}
                      onCheckedChange={(checked) => setCheckedAvailability(checked === true)}
                    />
                    <label
                      htmlFor="check-availability"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      I checked and confirmed availability
                    </label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="check-emr-accuracy"
                      checked={checkedEmrAccuracy}
                      onCheckedChange={(checked) => setCheckedEmrAccuracy(checked === true)}
                    />
                    <label
                      htmlFor="check-emr-accuracy"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      I added the appointment to the EMR and ensured accuracy
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitCompletion} 
              disabled={submitting || !checkedInsurance || !checkedAvailability || !checkedEmrAccuracy}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insurance Details Modal */}
      <Dialog open={insuranceDetailsOpen} onOpenChange={setInsuranceDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insurance Details</DialogTitle>
            <DialogDescription>
              Complete insurance information for {insuranceDetailsItem?.lead_name}
            </DialogDescription>
          </DialogHeader>

          {insuranceDetailsItem && (
            <div className="space-y-6 py-4">
              {/* Patient Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{insuranceDetailsItem.lead_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {insuranceDetailsItem.dob ? format(new Date(insuranceDetailsItem.dob), 'MM/dd/yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium font-mono">{insuranceDetailsItem.lead_phone_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium truncate">{insuranceDetailsItem.lead_email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Insurance Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Insurance Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Provider</p>
                    <p className="font-medium">{insuranceDetailsItem.detected_insurance_provider || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium">{insuranceDetailsItem.detected_insurance_plan || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Insurance ID</p>
                    <p className="font-medium font-mono">{insuranceDetailsItem.detected_insurance_id || 'N/A'}</p>
                  </div>
                  {insuranceDetailsItem.insurance_id_link && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground mb-2">Insurance Card Image</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(insuranceDetailsItem.insurance_id_link!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Card
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Appointment Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Project</p>
                    <p className="font-medium">{insuranceDetailsItem.project_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Appointment Date</p>
                    <p className="font-medium">
                      {insuranceDetailsItem.date_of_appointment 
                        ? format(new Date(insuranceDetailsItem.date_of_appointment), 'MMM d, yyyy h:mm a')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Queued</p>
                    <p className="font-medium">{format(new Date(insuranceDetailsItem.queued_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setInsuranceDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
