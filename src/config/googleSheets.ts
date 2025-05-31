
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
  'texas-vascular-institute': {
    spreadsheetId: '1WWOfGsw2IUHTlwwgulRxiuOxdL12E9HWjh2aq8I6Ck4',
    ranges: {
      campaign: 'Table1_6!A1:Z100',
      calls: 'Call Center!A1:Z100', 
      health: 'Account Health!A1:Z100',
    },
  },
  'advanced-dermatology-center': {
    spreadsheetId: '1rbFoZR2knC5-P9Ly-D80rnxPdbLsuMBrYqlElh-kJ64',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'call-center-analytics': {
    spreadsheetId: '1e_dxBWUuZAG_9QsxaskO0oYNc1KTSwDdIna7Ik9TmCA',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Sheet1!A1:Z100',
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
    campaign: ['campaign', 'marketing', 'ads', 'advertising', 'performance', 'table'],
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

// Client display names mapping
export const clientDisplayNames: Record<string, string> = {
  'texas-vascular-institute': 'Texas Vascular Institute',
  'advanced-dermatology-center': 'Advanced Dermatology Center',
  'call-center-analytics': 'Call Center Analytics',
};

// Helper function to get client display name
export const getClientDisplayName = (clientId: string): string => {
  return clientDisplayNames[clientId] || clientId;
};
