
// Utility functions to transform Google Sheets data into the format expected by components

export interface CampaignData {
  adSpend: number;
  leads: number;
  appointments: number;
  procedures: number;
  showRate: number;
  cpl: number;
  cpa: number;
  cpp: number;
  trend: 'up' | 'down';
}

export interface CallData {
  totalDials: number;
  connectRate: number;
  appointmentsSet: number;
  avgCallDuration: number;
  leadContactRatio: number;
  agents: Array<{
    name: string;
    appointments: number;
    connectRate: number;
  }>;
}

export interface HealthData {
  lastTouchpoint: string;
  strategyCallDate: string;
  tasksCompleted: number;
  retentionScore: number;
  feedbackNotes: string;
  communicationFrequency: string;
  accountStatus: string;
  upcomingTasks: number;
  overdueTasks: number;
}

// Transform raw sheet data to campaign data
export const transformCampaignData = (sheetData: string[][]): CampaignData | null => {
  if (!sheetData || sheetData.length < 2) return null;

  try {
    // Assuming first row is headers, second row is data
    // You'll need to adjust these column indices based on your actual sheet structure
    const dataRow = sheetData[1];
    
    return {
      adSpend: parseFloat(dataRow[0]) || 0,
      leads: parseInt(dataRow[1]) || 0,
      appointments: parseInt(dataRow[2]) || 0,
      procedures: parseInt(dataRow[3]) || 0,
      showRate: parseFloat(dataRow[4]) || 0,
      cpl: parseFloat(dataRow[5]) || 0,
      cpa: parseFloat(dataRow[6]) || 0,
      cpp: parseFloat(dataRow[7]) || 0,
      trend: (dataRow[8] === 'up' ? 'up' : 'down') as 'up' | 'down',
    };
  } catch (error) {
    console.error('Error transforming campaign data:', error);
    return null;
  }
};

// Transform raw sheet data to call center data
export const transformCallData = (sheetData: string[][]): CallData | null => {
  if (!sheetData || sheetData.length < 2) return null;

  try {
    const dataRow = sheetData[1];
    
    // Extract agent data (assuming it's in additional rows)
    const agents = [];
    for (let i = 2; i < Math.min(sheetData.length, 4); i++) {
      if (sheetData[i] && sheetData[i][0]) {
        agents.push({
          name: sheetData[i][0] || '',
          appointments: parseInt(sheetData[i][1]) || 0,
          connectRate: parseFloat(sheetData[i][2]) || 0,
        });
      }
    }

    return {
      totalDials: parseInt(dataRow[0]) || 0,
      connectRate: parseFloat(dataRow[1]) || 0,
      appointmentsSet: parseInt(dataRow[2]) || 0,
      avgCallDuration: parseFloat(dataRow[3]) || 0,
      leadContactRatio: parseFloat(dataRow[4]) || 0,
      agents,
    };
  } catch (error) {
    console.error('Error transforming call data:', error);
    return null;
  }
};

// Transform raw sheet data to health data
export const transformHealthData = (sheetData: string[][]): HealthData | null => {
  if (!sheetData || sheetData.length < 2) return null;

  try {
    const dataRow = sheetData[1];
    
    return {
      lastTouchpoint: dataRow[0] || '',
      strategyCallDate: dataRow[1] || '',
      tasksCompleted: parseInt(dataRow[2]) || 0,
      retentionScore: parseFloat(dataRow[3]) || 0,
      feedbackNotes: dataRow[4] || '',
      communicationFrequency: dataRow[5] || '',
      accountStatus: dataRow[6] || '',
      upcomingTasks: parseInt(dataRow[7]) || 0,
      overdueTasks: parseInt(dataRow[8]) || 0,
    };
  } catch (error) {
    console.error('Error transforming health data:', error);
    return null;
  }
};
