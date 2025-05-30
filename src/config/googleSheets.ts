
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

// Helper function to create a range string from a tab name
export const createRange = (tabName: string, range: string = 'A1:Z100'): string => {
  return `${tabName}!${range}`;
};

// Helper function to find the best matching tab for a data type
export const findBestTab = (tabs: Array<{title: string}>, dataType: 'campaign' | 'calls' | 'health'): string | null => {
  if (!tabs || tabs.length === 0) return null;
  
  const keywords = {
    campaign: ['campaign', 'marketing', 'ads', 'advertising', 'performance'],
    calls: ['call', 'phone', 'dial', 'contact', 'center'],
    health: ['health', 'account', 'retention', 'status', 'relationship']
  };
  
  const relevantKeywords = keywords[dataType];
  
  // First, try to find exact matches
  for (const keyword of relevantKeywords) {
    const exactMatch = tabs.find(tab => 
      tab.title.toLowerCase().includes(keyword.toLowerCase())
    );
    if (exactMatch) return exactMatch.title;
  }
  
  // If no exact match, return the first tab as fallback
  return tabs[0]?.title || null;
};
