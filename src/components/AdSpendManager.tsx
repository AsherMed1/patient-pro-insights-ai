
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import AdSpendImport from './AdSpendImport';

interface AdSpendRecord {
  id: string;
  date: string;
  project_name: string;
  spend: number;
  created_at: string;
  updated_at: string;
}

const AdSpendManager = () => {
  const [adSpendData, setAdSpendData] = useState<AdSpendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdSpendData();
  }, []);

  const fetchAdSpendData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facebook_ad_spend')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setAdSpendData(data || []);
    } catch (error) {
      console.error('Error fetching ad spend data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ad spend data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ad Spend Management</CardTitle>
          <CardDescription>
            Import and manage Facebook ad spend data for your projects
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="import" className="w-full">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="view">View Data</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <AdSpendImport />
        </TabsContent>

        <TabsContent value="view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Spend Records</CardTitle>
              <CardDescription>
                {adSpendData.length} record{adSpendData.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p>Loading ad spend data...</p>
                </div>
              ) : adSpendData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No ad spend data found. Import some data to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Project</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">Spend</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adSpendData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">
                            {formatDate(record.date)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {record.project_name}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-mono">
                            {formatCurrency(Number(record.spend))}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-sm text-gray-500">
                            {formatDate(record.updated_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdSpendManager;
