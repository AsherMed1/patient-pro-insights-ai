
export interface SheetConfig {
  spreadsheetId: string;
  ranges: {
    campaign: string;
    calls: string;
    health: string;
  };
}

// Configuration mapping for different clients
export const clientSheetConfigs: Record<string, SheetConfig> = {
  'client-1': {
    spreadsheetId: '324183023',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'client-2': {
    spreadsheetId: '606531950',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'client-3': {
    spreadsheetId: '1338313062',
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
