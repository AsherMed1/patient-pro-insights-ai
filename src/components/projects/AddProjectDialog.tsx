
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectFormData {
  project_name: string;
  appointment_webhook_url?: string;
  ghl_location_id?: string;
  timezone?: string;
  ghl_api_key?: string;
  emr_system_name?: string;
}

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
}

export const AddProjectDialog: React.FC<AddProjectDialogProps> = ({
  open,
  onOpenChange,
  onSubmit
}) => {
  const form = useForm<ProjectFormData>();
  const [syncingTimezone, setSyncingTimezone] = useState(false);
  const { toast } = useToast();

  const handleSyncTimezone = async () => {
    const ghlLocationId = form.getValues('ghl_location_id');
    if (!ghlLocationId) {
      toast({
        title: 'Location ID Required',
        description: 'Please enter a HighLevel Location ID first',
        variant: 'destructive',
      });
      return;
    }

    setSyncingTimezone(true);
    try {
    const { data, error } = await supabase.functions.invoke('sync-ghl-location-timezone', {
      body: { 
        ghl_location_id: ghlLocationId,
        ghl_api_key: form.getValues('ghl_api_key')
      },
    });

      if (error) throw error;

      if (data?.timezone) {
        form.setValue('timezone', data.timezone);
        toast({
          title: 'Timezone Synced',
          description: `Location timezone: ${data.timezone}`,
        });
      }
    } catch (error) {
      console.error('Error syncing timezone:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to fetch timezone from GoHighLevel',
        variant: 'destructive',
      });
    } finally {
      setSyncingTimezone(false);
    }
  };

  const handleSubmit = async (data: ProjectFormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Create a new project to track leads, calls, and appointments.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="project_name"
              rules={{ required: "Project name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="appointment_webhook_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Status Webhook URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://hook.us1.make.com/..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    This webhook will be triggered when appointment statuses change for this project.
                  </p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ghl_location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HighLevel Location ID (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="9qcQctq3qbKJfJgtB6xL" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    The location ID from your HighLevel account. Used for deep linking to contact pages.
                  </p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input 
                        placeholder="America/Chicago" 
                        {...field} 
                        readOnly
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSyncTimezone}
                      disabled={syncingTimezone || !form.watch('ghl_location_id')}
                    >
                      {syncingTimezone ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <FormMessage />
                  <p className="text-sm text-muted-foreground">
                    Sync timezone from GoHighLevel location for accurate scheduling
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ghl_api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GoHighLevel API Key</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter GHL API key for this location" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    API key for this location. Required for automatic appointment updates and timezone sync.
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emr_system_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EMR System Name (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Epic, Athena, NextGen, AdvancedMD"
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    The EMR system used for this project. This will be displayed in the EMR processing queue.
                  </p>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Project</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
