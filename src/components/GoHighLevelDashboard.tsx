import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { Users, TrendingUp, GitBranch, MapPin, Phone, Mail, Calendar } from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateAdded: string;
  tags: string[];
}

interface Opportunity {
  id: string;
  name: string;
  monetaryValue: number;
  status: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

const GoHighLevelDashboard = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Texas Vascular Institute Location ID (extracted from the JWT token)
  const locationId = 'wOuRtpQmTjytPuWFNX83';

  const fetchGoHighLevelData = async (action: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: functionError } = await supabase.functions.invoke('gohighlevel-crm', {
        body: {
          action,
          locationId
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!response.success) {
        throw new Error(response.error);
      }

      return response.data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    const data = await fetchGoHighLevelData('getContacts');
    if (data?.contacts) {
      setContacts(data.contacts);
    }
  };

  const loadOpportunities = async () => {
    const data = await fetchGoHighLevelData('getOpportunities');
    if (data?.opportunities) {
      setOpportunities(data.opportunities);
    }
  };

  const loadPipelines = async () => {
    const data = await fetchGoHighLevelData('getPipelines');
    if (data?.pipelines) {
      setPipelines(data.pipelines);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadContacts(),
      loadOpportunities(),
      loadPipelines()
    ]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const totalOpportunityValue = opportunities.reduce((sum, opp) => sum + (opp.monetaryValue || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">GoHighLevel CRM</h2>
          <p className="text-gray-600">Texas Vascular Institute</p>
        </div>
        <Button onClick={loadAllData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOpportunityValue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipelines</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipelines.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Recent Contacts</span>
          </CardTitle>
          <CardDescription>Latest contacts from GoHighLevel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contacts.slice(0, 5).map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </span>
                    {contact.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    {contact.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.dateAdded && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(contact.dateAdded).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {contacts.length === 0 && !loading && (
              <p className="text-gray-500 text-center py-4">No contacts found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Active Opportunities</span>
          </CardTitle>
          <CardDescription>Current sales opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {opportunities.slice(0, 10).map((opportunity) => (
              <div key={opportunity.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{opportunity.name}</span>
                    <Badge variant="outline">{opportunity.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Value: ${opportunity.monetaryValue?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            ))}
            {opportunities.length === 0 && !loading && (
              <p className="text-gray-500 text-center py-4">No opportunities found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoHighLevelDashboard;
