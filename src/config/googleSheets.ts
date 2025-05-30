
export interface SheetConfig {
  spreadsheetId: string;
  ranges: {
    campaign: string;
    calls: string;
    health: string;
  };
}

// Configuration mapping for different clients
// You'll need to update these with your actual Google Sheet IDs and ranges
export const clientSheetConfigs: Record<string, SheetConfig> = {
  'client-1': {
    spreadsheetId: 'YOUR_SHEET_ID_FOR_CLIENT_1', // Replace with actual sheet ID
    ranges: {
      campaign: 'Campaign Data!A1:Z100', // Adjust range as needed
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'client-2': {
    spreadsheetId: 'YOUR_SHEET_ID_FOR_CLIENT_2',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'client-3': {
    spreadsheetId: 'YOUR_SHEET_ID_FOR_CLIENT_3',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'client-4': {
    spreadsheetId: 'YOUR_SHEET_ID_FOR_CLIENT_4',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
};

// Helper function to get sheet config for a client
export const getSheetConfig = (clientId: string): SheetConfig | null => {
  return clientSheetConfigs[clientId] || null;
};
