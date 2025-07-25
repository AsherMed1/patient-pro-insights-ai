import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const PaginationControls = ({
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onPageChange,
  className = ""
}: PaginationControlsProps) => {
  const startRecord = (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, totalCount);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between pt-4 border-t ${className}`}>
      <div className="text-sm text-muted-foreground">
        Showing {totalCount > 0 ? startRecord : 0}-{endRecord} of {totalCount} | Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;