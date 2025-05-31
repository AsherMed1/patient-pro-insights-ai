
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
    spreadsheetId: '1rbFoZR2knC5-P9Ly-D80rnxPdbLsuMBrYqlElh-kJ64',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'naadi-healthcare': {
    spreadsheetId: '1lvoPQdDuvvAifJteFHl0ZJv_UhHYdQU1N9DpGrBTX1k',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'houston-vascular-care': {
    spreadsheetId: '1GP8D5Dz6FMTqnJblhG-BdjNLRKUYCBLvRKUYCBLvRtj-Ot9Ccfs',
    ranges: {
      campaign: 'Campaign Data!A1:Z100',
      calls: 'Call Center!A1:Z100',
      health: 'Account Health!A1:Z100',
    },
  },
  'ally-vascular-pain-centers': {
    spreadsheetId: '1YVemB6u5QkJdIntvGfwuCOvoaG8skCPkebwTpoTT5ns',
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
  // Master sheet containing data for all clients
  'all-clients-master': {
    spreadsheetId: '1WWOfGsw2IUHTlwwgulRxiuOxdL12E9HWjh2aq8I6Ck4',
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

// Helper function to find ALL matching tabs for campaign data (not just the first one)
export const findAllCampaignTabs = (tabs: Array<{title: string}>): string[] => {
  if (!tabs || tabs.length === 0) return [];
  
  const campaignKeywords = [
    'client stats', 'stats', 'may - client', 'april - client', 'jan- client', 'feb - client',
    'march - client', 'june - client', 'july - client', 'august - client', 'september - client',
    'october - client', 'november - client', 'december - client', 'client stats by month'
  ];
  
  const matchingTabs: string[] = [];
  
  for (const keyword of campaignKeywords) {
    const matches = tabs.filter(tab => 
      tab.title.toLowerCase().includes(keyword.toLowerCase())
    );
    
    matches.forEach(match => {
      if (!matchingTabs.includes(match.title)) {
        matchingTabs.push(match.title);
        console.log(`Found campaign tab: "${match.title}" for keyword "${keyword}"`);
      }
    });
  }
  
  console.log(`Found ${matchingTabs.length} campaign tabs:`, matchingTabs);
  return matchingTabs;
};

// Helper function to find the best matching tab for a data type
export const findBestTab = (tabs: Array<{title: string}>, dataType: 'campaign' | 'calls' | 'health'): string | null => {
  if (!tabs || tabs.length === 0) return null;
  
  // For campaign data, use the new multi-tab approach
  if (dataType === 'campaign') {
    const campaignTabs = findAllCampaignTabs(tabs);
    return campaignTabs.length > 0 ? campaignTabs[0] : null; // Return first tab for compatibility
  }
  
  const keywords = {
    calls: ['call', 'phone', 'dial', 'contact', 'center'],
    health: ['health', 'account', 'retention', 'status', 'relationship']
  };
  
  const relevantKeywords = keywords[dataType];
  
  // First, try to find exact matches with priority order
  for (const keyword of relevantKeywords) {
    const exactMatch = tabs.find(tab => 
      tab.title.toLowerCase().includes(keyword.toLowerCase())
    );
    if (exactMatch) {
      console.log(`Found matching tab "${exactMatch.title}" for keyword "${keyword}"`);
      return exactMatch.title;
    }
  }
  
  // If no exact match, return the first tab as fallback
  console.log(`No matching tab found for ${dataType}, using first tab: ${tabs[0]?.title}`);
  return tabs[0]?.title || null;
};

// Client display names mapping
export const clientDisplayNames: Record<string, string> = {
  'texas-vascular-institute': 'Texas Vascular Institute',
  'naadi-healthcare': 'Naadi Healthcare',
  'houston-vascular-care': 'Houston Vascular Care',
  'ally-vascular-pain-centers': 'Ally Vascular & Pain Centers',
  'call-center-analytics': 'Call Center Analytics',
  'all-clients-master': 'All Clients (Master Sheet)',
};

// Helper function to get client display name
export const getClientDisplayName = (clientId: string): string => {
  return clientDisplayNames[clientId] || clientId;
};
