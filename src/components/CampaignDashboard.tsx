import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Target, CalendarIcon } from 'lucide-react';
import { useMultipleSheets } from '@/hooks/useMultipleSheets';
import { getSheetConfig } from '@/config/googleSheets';
import { transformMultiSheetCampaignData } from '@/utils/multiSheetTransformer';
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
  
  const { allData, loading, error, usedTabs } = useMultipleSheets({
    spreadsheetId: sheetConfig?.spreadsheetId || '',
    clientId,
    dataType: 'campaign',
  });

  console.log('Campaign Dashboard - Sheet Config:', sheetConfig);
  console.log('Campaign Dashboard - All Data:', allData);
  console.log('Campaign Dashboard - Used Tabs:', usedTabs);
  console.log('Campaign Dashboard - Error:', error);
  console.log('Campaign Dashboard - Date Range:', dateRange);
  console.log('Campaign Dashboard - Procedure Filter:', procedure);

  // Check if date range is selected
  const hasDateRange = dateRange.from && dateRange.to;

  // Transform aggregated Google Sheets data only if date range is selected
  const campaignData = hasDateRange ? transformMultiSheetCampaignData(allData, procedure, dateRange) : null;
  
  console.log('Campaign Dashboard - Transformed Data:', campaignData);
  console.log('Campaign Dashboard - Using Live Data:', !!campaignData);
  
  // Empty data structure for when no date range is selected
  const emptyData = {
    adSpend: 0,
    leads: 0,
    appointments: 0,
    procedures: 0,
    showRate: 0,
    cpl: 0,
    cpa: 0,
    cpp: 0,
    trend: 'up' as const
  };

  // Use live data if available and date range is selected, otherwise show empty data
  const data = campaignData || emptyData;
  const isLiveData = !!campaignData && hasDateRange;

  const formatCurrency = (amount: number) => amount > 0 ? `$${amount.toLocaleString()}` : '$0';
  const formatPercent = (percent: number) => percent > 0 ? `${percent.toFixed(1)}%` : '0.0%';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading campaign data from multiple Google Sheets tabs...</div>
      </div>
    );
  }

  // Show empty state when no date range is selected
  if (!hasDateRange) {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <DashboardFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          procedure={procedure}
          onProcedureChange={setProcedure}
        />

        {/* Empty State */}
        <Card className="text-center py-12">
          <CardContent>
            <CalendarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Date Range</h3>
            <p className="text-gray-500">
              Please select a date range above to view campaign performance data.
            </p>
          </CardContent>
        </Card>
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
          <Badge variant={isLiveData ? "default" : "secondary"}>
            {isLiveData ? "Live Data" : "No Data"}
          </Badge>
          {usedTabs.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Tabs: {usedTabs.join(', ')}
            </Badge>
          )}
          {procedure !== 'ALL' && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Procedure: {procedure}
            </Badge>
          )}
          {allData.length > 0 && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              {allData.reduce((sum, sheet) => sum + sheet.data.length, 0)} total rows from {allData.length} tabs
            </Badge>
          )}
        </div>
        {error && (
          <Badge variant="destructive" className="text-xs">
            Error: {error}
          </Badge>
        )}
        {!isLiveData && allData.length > 0 && hasDateRange && (
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
            Data found but no matches for selected criteria
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
            <p className="text-xs opacity-90 mt-1">Current period</p>
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
              <span className="text-xs opacity-90">vs last period</span>
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
            <p className="text-xs opacity-90 mt-1">Booked this period</p>
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
                <span>{data.cpl > 75 ? 'Above Target' : data.cpl > 0 ? 'On Target' : 'No Data'}</span>
              </div>
              <Progress value={data.cpl > 0 ? Math.min((75 / data.cpl) * 100, 100) : 0} className="h-2" />
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
                <span>{data.cpa > 180 ? 'Above Target' : data.cpa > 0 ? 'On Target' : 'No Data'}</span>
              </div>
              <Progress value={data.cpa > 0 ? Math.min((180 / data.cpa) * 100, 100) : 0} className="h-2" />
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
                <span>{data.cpp > 350 ? 'Above Target' : data.cpp > 0 ? 'On Target' : 'No Data'}</span>
              </div>
              <Progress value={data.cpp > 0 ? Math.min((350 / data.cpp) * 100, 100) : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Key insights for current period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">Conversion Rate (Leads to Appointments)</h4>
                <p className="text-sm text-gray-600">
                  {data.leads > 0 ? ((data.appointments / data.leads) * 100).toFixed(1) : '0.0'}% of leads converted to appointments
                </p>
              </div>
              <Badge variant={data.leads > 0 && data.appointments / data.leads > 0.45 ? "default" : "secondary"}>
                {data.leads > 0 && data.appointments / data.leads > 0.45 ? "Good" : data.leads > 0 ? "Needs Improvement" : "No Data"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">Procedure Conversion Rate</h4>
                <p className="text-sm text-gray-600">
                  {data.appointments > 0 ? ((data.procedures / data.appointments) * 100).toFixed(1) : '0.0'}% of appointments resulted in procedures
                </p>
              </div>
              <Badge variant={data.appointments > 0 && data.procedures / data.appointments > 0.5 ? "default" : "secondary"}>
                {data.appointments > 0 && data.procedures / data.appointments > 0.5 ? "Excellent" : data.appointments > 0 ? "Good" : "No Data"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignDashboard;
