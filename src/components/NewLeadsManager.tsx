
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CallDetailsModal from './CallDetailsModal';
import LeadDetailsModal from './LeadDetailsModal';
import LeadCard from './leads/LeadCard';
import { useLeads } from '@/hooks/useLeads';

interface NewLeadsManagerProps {
  viewOnly?: boolean;
  projectFilter?: string;
}

const NewLeadsManager = ({ viewOnly = false, projectFilter }: NewLeadsManagerProps) => {
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
    handleViewFullDetails
  } = useLeads(projectFilter);

  return (
    <div className="space-y-6">
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
