
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Upload, CalendarIcon, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import CallDetailsModal from './CallDetailsModal';
import LeadDetailsModal from './LeadDetailsModal';
import LeadCard from './leads/LeadCard';
import LeadsCsvImport from './LeadsCsvImport';
import PaginationControls from './shared/PaginationControls';
import { useLeads } from '@/hooks/useLeads';

interface NewLeadsManagerProps {
  viewOnly?: boolean;
  projectFilter?: string;
}

const NewLeadsManager = ({ viewOnly = false, projectFilter }: NewLeadsManagerProps) => {
  const [showImport, setShowImport] = useState(false);
  const {
    leads,
    loading,
    selectedLeadCalls,
    selectedLeadName,
    showCallsModal,
    setShowCallsModal,
    selectedLead,
    showLeadDetailsModal,
    setShowLeadDetailsModal,
    handleViewCalls,
    handleViewFullDetails,
    fetchLeads,
    currentPage,
    setCurrentPage,
    totalCount,
    dateRange,
    setDateRange,
    nameSearch,
    setNameSearch,
    leadsPerPage
  } = useLeads(projectFilter);

  const totalPages = Math.ceil(totalCount / leadsPerPage);

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const handleImportComplete = () => {
    setShowImport(false);
    fetchLeads(); // Refresh the leads list
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      {!viewOnly && !showImport && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Import Historical Leads</CardTitle>
                <CardDescription>Upload past leads data from CSV file</CardDescription>
              </div>
              <Button 
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* CSV Import Component */}
      {showImport && (
        <div className="space-y-4">
          <LeadsCsvImport />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportComplete}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Date Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Name Search */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Search by Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search lead name, first name, or last name..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className="pl-10 w-full md:w-80"
                />
              </div>
            </div>
            
            {/* Date Range Picker */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "MMM dd") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => handleDateRangeChange({ ...dateRange, from: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "MMM dd") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => handleDateRangeChange({ ...dateRange, to: date })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex flex-col justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  handleDateRangeChange({ from: undefined, to: undefined });
                  setNameSearch('');
                }}
                className="w-fit"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {projectFilter ? `${projectFilter} - New Leads` : 'New Leads'}
          </CardTitle>
          <CardDescription>
            Showing {((currentPage - 1) * leadsPerPage) + 1} to {Math.min(currentPage * leadsPerPage, totalCount)} of {totalCount} leads (Times in Central Time Zone)
            {viewOnly && " (View Only - Records created via API)"}
            {projectFilter && ` for ${projectFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Top Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={leadsPerPage}
            onPageChange={setCurrentPage}
            className="mb-4 border-b pb-4"
          />

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading leads...</div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No leads recorded yet</div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onViewCalls={handleViewCalls}
                    onViewFullDetails={handleViewFullDetails}
                  />
                ))}
              </div>

              {/* Bottom Pagination */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                itemsPerPage={leadsPerPage}
                onPageChange={setCurrentPage}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>

      <CallDetailsModal
        isOpen={showCallsModal}
        onClose={() => setShowCallsModal(false)}
        leadName={selectedLeadName}
        calls={selectedLeadCalls}
      />

      <LeadDetailsModal
        isOpen={showLeadDetailsModal}
        onClose={() => setShowLeadDetailsModal(false)}
        lead={selectedLead}
      />
    </div>
  );
};

export default NewLeadsManager;
