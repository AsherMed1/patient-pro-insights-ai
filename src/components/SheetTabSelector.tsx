
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSheetTabs } from '@/hooks/useSheetTabs';
import { getSheetConfig } from '@/config/googleSheets';
import { Loader2, Sheet } from 'lucide-react';

interface SheetTabSelectorProps {
  clientId: string;
}

const SheetTabSelector = ({ clientId }: SheetTabSelectorProps) => {
  const sheetConfig = getSheetConfig(clientId);
  
  const { tabs, loading, error } = useSheetTabs({
    spreadsheetId: sheetConfig?.spreadsheetId || '',
    clientId,
  });

  if (!sheetConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sheet className="h-5 w-5" />
            <span>Sheet Configuration</span>
          </CardTitle>
          <CardDescription>No sheet configuration found for this client</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sheet className="h-5 w-5" />
            <span>Available Sheet Tabs</span>
          </CardTitle>
          <CardDescription>Discovering tabs in your Google Sheet...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading sheet tabs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <Sheet className="h-5 w-5" />
            <span>Sheet Connection Error</span>
          </CardTitle>
          <CardDescription>Could not fetch tabs from your Google Sheet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <p className="text-xs text-gray-500 mt-2">
            Make sure the sheet is shared with your service account email
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sheet className="h-5 w-5" />
          <span>Available Sheet Tabs</span>
        </CardTitle>
        <CardDescription>
          Found {tabs.length} tab{tabs.length !== 1 ? 's' : ''} in your Google Sheet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tabs.map((tab, index) => (
            <div key={tab.sheetId} className="flex items-center justify-between p-2 border rounded">
              <span className="font-medium">{tab.title}</span>
              <Badge variant="outline">Tab {index + 1}</Badge>
            </div>
          ))}
          {tabs.length === 0 && (
            <p className="text-sm text-gray-500">No tabs found in the sheet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SheetTabSelector;
