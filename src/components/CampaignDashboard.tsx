import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Target } from 'lucide-react';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import { getSheetConfig } from '@/config/googleSheets';
import { transformCampaignData } from '@/utils/sheetDataTransformer';
import DashboardFilters from './DashboardFilters';

interface CampaignDashboardProps {
  clientId: string;
}

const CampaignDashboard = ({ clientId }: CampaignDashboardProps) => {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  
  const [procedure, setProcedure] = useState<string>('ALL');

  const sheetConfig = getSheetConfig(clientId);
  
  const { data: sheetData, loading, error, usedTabName } = useGoogleSheets({
    spreadsheetId: sheetConfig?.spreadsheetId || '',
    clientId,
    dataType: 'campaign',
    enableDynamicTabs: true,
  });

  console.log('Campaign Dashboard - Sheet Data:', sheetData);
  console.log('Campaign Dashboard - Used Tab:', usedTabName);
  console.log('Campaign Dashboard - Error:', error);
  console.log('Campaign Dashboard - Date Range:', dateRange);
  console.log('Campaign Dashboard - Procedure Filter:', procedure);

  // Transform Google Sheets data or fall back to mock data
  const campaignData = transformCampaignData(sheetData, procedure, dateRange);
  
  // Fallback mock data if Google Sheets data is not available
  const mockData = {
    'client-1': {
      adSpend: 15420,
      leads: 187,
      appointments: 89,
      procedures: 45,
      showRate: 85.3,
      cpl: 82.46,
      cpa: 173.26,
      cpp: 342.67,
      trend: 'up' as const
    },
    'client-2': {
      adSpend: 22100,
      leads: 245,
      appointments: 112,
      procedures: 67,
      showRate: 78.2,
      cpl: 90.20,
      cpa: 197.32,
      cpp: 329.85,
      trend: 'down' as const
    },
    'client-3': {
      adSpend: 11800,
      leads: 156,
      appointments: 74,
      procedures: 38,
      showRate: 91.2,
      cpl: 75.64,
      cpa: 159.46,
      cpp: 310.53,
      trend: 'up' as const
    },
    'client-4': {
      adSpend: 8900,
      leads: 98,
      appointments: 42,
      procedures: 21,
      showRate: 73.8,
      cpl: 90.82,
      cpa: 211.90,
      cpp: 423.81,
      trend: 'up' as const
    }
  };

  const data = campaignData || mockData[clientId as keyof typeof mockData] || mockData['client-1'];

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatPercent = (percent: number) => `${percent.toFixed(1)}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading campaign data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <DashboardFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        procedure={procedure}
        onProcedureChange={setProcedure}
      />

      {/* Data Source Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant={campaignData ? "default" : "secondary"}>
            {campaignData ? "Live Data" : "Mock Data"}
          </Badge>
          {usedTabName && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Tab: {usedTabName}
            </Badge>
          )}
          {procedure !== 'ALL' && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Procedure: {procedure}
            </Badge>
          )}
        </div>
        {error && (
          <Badge variant="destructive" className="text-xs">
            Error: {error}
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Ad Spend</CardTitle>
            <DollarSign className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.adSpend)}</div>
            <p className="text-xs opacity-90 mt-1">Current month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Leads Generated</CardTitle>
            <Users className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leads}</div>
            <div className="flex items-center mt-1">
              {data.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span className="text-xs opacity-90">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Appointments</CardTitle>
            <Calendar className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.appointments}</div>
            <p className="text-xs opacity-90 mt-1">Booked this month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Show Rate</CardTitle>
            <Target className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(data.showRate)}</div>
            <Progress value={data.showRate} className="mt-2 bg-orange-400" />
          </CardContent>
        </Card>
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Per Lead (CPL)</CardTitle>
            <CardDescription>Average cost to generate one lead</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(data.cpl)}</div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Target: $75.00</span>
                <span>{data.cpl > 75 ? 'Above Target' : 'On Target'}</span>
              </div>
              <Progress value={Math.min((75 / data.cpl) * 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Per Appointment (CPA)</CardTitle>
            <CardDescription>Average cost to book one appointment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(data.cpa)}</div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Target: $180.00</span>
                <span>{data.cpa > 180 ? 'Above Target' : 'On Target'}</span>
              </div>
              <Progress value={Math.min((180 / data.cpa) * 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Per Procedure (CPP)</CardTitle>
            <CardDescription>Average cost to complete one procedure</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{formatCurrency(data.cpp)}</div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Target: $350.00</span>
                <span>{data.cpp > 350 ? 'Above Target' : 'On Target'}</span>
              </div>
              <Progress value={Math.min((350 / data.cpp) * 100, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Key insights for current month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">Conversion Rate (Leads to Appointments)</h4>
                <p className="text-sm text-gray-600">
                  {((data.appointments / data.leads) * 100).toFixed(1)}% of leads converted to appointments
                </p>
              </div>
              <Badge variant={data.appointments / data.leads > 0.45 ? "default" : "secondary"}>
                {data.appointments / data.leads > 0.45 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">Procedure Conversion Rate</h4>
                <p className="text-sm text-gray-600">
                  {((data.procedures / data.appointments) * 100).toFixed(1)}% of appointments resulted in procedures
                </p>
              </div>
              <Badge variant={data.procedures / data.appointments > 0.5 ? "default" : "secondary"}>
                {data.procedures / data.appointments > 0.5 ? "Excellent" : "Good"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignDashboard;
