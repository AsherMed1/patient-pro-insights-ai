
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
import CallDetailsModal from './CallDetailsModal';
import LeadDetailsModal from './LeadDetailsModal';
import LeadCard from './leads/LeadCard';
import LeadsCsvImport from './LeadsCsvImport';
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
    fetchLeadsWithCallCounts
  } = useLeads(projectFilter);

  const handleImportComplete = () => {
    setShowImport(false);
    fetchLeadsWithCallCounts(); // Refresh the leads list
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

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {projectFilter ? `${projectFilter} - New Leads` : 'New Leads'}
          </CardTitle>
          <CardDescription>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} recorded (Times in Central Time Zone)
            {viewOnly && " (View Only - Records created via API)"}
            {projectFilter && ` for ${projectFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading leads...</div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No leads recorded yet</div>
            </div>
          ) : (
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
