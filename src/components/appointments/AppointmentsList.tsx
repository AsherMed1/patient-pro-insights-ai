
import React, { useState, useMemo } from 'react';
import { AllAppointment } from './types';
import AppointmentCard from './AppointmentCard';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, CheckSquare, X, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AppointmentsListProps {
  appointments: AllAppointment[];
  loading: boolean;
  projectFilter?: string;
  statusOptions: string[];
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureStatus: string | null) => void;
  onUpdateDate: (appointmentId: string, date: string | null) => void;
  onUpdateTime: (appointmentId: string, time: string | null) => void;
  onUpdateInternalProcess?: (appointmentId: string, isComplete: boolean) => void;
  onUpdateDOB?: (appointmentId: string, dob: string | null) => void;
  onDelete?: (appointmentId: string) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onUpdateName?: (appointmentId: string, name: string) => void;
  onUpdateEmail?: (appointmentId: string, email: string) => void;
  onUpdatePhone?: (appointmentId: string, phone: string) => void;
  onUpdateCalendarLocation?: (appointmentId: string, location: string) => void;
  projectLocationMap?: Record<string, string>;
}

const AppointmentsList = ({
  appointments,
  loading,
  projectFilter,
  statusOptions,
  onUpdateStatus,
  onUpdateProcedure,
  onUpdateDate,
  onUpdateTime,
  onUpdateInternalProcess,
  onUpdateDOB,
  onDelete,
  onBulkDelete,
  onUpdateName,
  onUpdateEmail,
  onUpdatePhone,
  onUpdateCalendarLocation,
  projectLocationMap
}: AppointmentsListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 50;

  const { paginatedAppointments, totalPages } = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedAppointments: appointments.slice(startIndex, endIndex),
      totalPages: Math.ceil(appointments.length / itemsPerPage)
    };
  }, [appointments, currentPage]);

  // Reset to page 1 when appointments change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [appointments.length]);

  // Clear selections when exiting selection mode
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedAppointments.map(a => a.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectionMode(false);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const allOnPageSelected = paginatedAppointments.length > 0 && 
    paginatedAppointments.every(a => selectedIds.has(a.id));

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Loading appointments...</div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">No appointments found for this category</div>
      </div>
    );
  }

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Pagination Info + Select Toggle */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, appointments.length)} of {appointments.length} appointments
        </span>
        <div className="flex items-center gap-2">
          {onBulkDelete && (
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
            >
              {selectionMode ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Select
                </>
              )}
            </Button>
          )}
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>

      {/* Select All on Page */}
      {selectionMode && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <Checkbox
            checked={allOnPageSelected}
            onCheckedChange={toggleSelectAllOnPage}
          />
          <span className="text-sm font-medium">
            Select all on this page ({paginatedAppointments.length})
          </span>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Appointments List */}
      <div className="space-y-3 md:space-y-4">
        {paginatedAppointments.map(appointment => (
          <div key={appointment.id} className="flex items-start gap-3">
            {selectionMode && (
              <div className="pt-4 flex-shrink-0">
                <Checkbox
                  checked={selectedIds.has(appointment.id)}
                  onCheckedChange={() => toggleSelect(appointment.id)}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <AppointmentCard
                appointment={appointment}
                projectFilter={projectFilter}
                statusOptions={statusOptions}
                onUpdateStatus={onUpdateStatus}
                onUpdateProcedure={onUpdateProcedure}
                onUpdateDate={onUpdateDate}
                onUpdateTime={onUpdateTime}
                onUpdateInternalProcess={onUpdateInternalProcess}
                onUpdateDOB={onUpdateDOB}
                onDelete={onDelete}
                onUpdateName={onUpdateName}
                onUpdateEmail={onUpdateEmail}
                onUpdatePhone={onUpdatePhone}
                onUpdateCalendarLocation={onUpdateCalendarLocation}
                projectLocationMap={projectLocationMap}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {getPageNumbers().map(pageNum => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(pageNum)}
            >
              {pageNum}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-lg rounded-xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} appointment{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} appointment{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Appointment${selectedIds.size !== 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppointmentsList;
