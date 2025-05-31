
import { CampaignData } from './sheetDataTransformer';

interface MultipleSheetData {
  tabName: string;
  data: string[][];
}

// Helper function to determine if a tab is relevant for the given date range
const isTabRelevantForDateRange = (
  tabName: string, 
  dateRange?: { from: Date | undefined; to: Date | undefined }
): boolean => {
  if (!dateRange?.from || !dateRange?.to) {
    return true; // If no date range, include all tabs
  }

  const startMonth = dateRange.from.getMonth(); // 0-based (0 = January, 4 = May)
  const endMonth = dateRange.to.getMonth();
  const startYear = dateRange.from.getFullYear();
  const endYear = dateRange.to.getFullYear();

  const tabLower = tabName.toLowerCase();

  // Map month names to numbers (0-based)
  const monthMap: Record<string, number> = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };

  // Check if tab contains a specific month
  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    if (tabLower.includes(monthName)) {
      // Check if this month falls within the selected date range
      if (startYear === endYear) {
        // Same year - check if month is within range
        return monthNum >= startMonth && monthNum <= endMonth;
      } else {
        // Different years - more complex logic needed
        return (monthNum >= startMonth && startYear <= endYear) || 
               (monthNum <= endMonth && endYear >= startYear);
      }
    }
  }

  // For generic tabs like "Client Stats by Month", include them always
  // unless we have a very specific single-month filter
  if (tabLower.includes('client stats') && !tabLower.includes('jan') && 
      !tabLower.includes('feb') && !tabLower.includes('mar') && 
      !tabLower.includes('apr') && !tabLower.includes('may') && 
      !tabLower.includes('jun') && !tabLower.includes('jul') && 
      !tabLower.includes('aug') && !tabLower.includes('sep') && 
      !tabLower.includes('oct') && !tabLower.includes('nov') && 
      !tabLower.includes('dec')) {
    // This is a generic stats tab - include it only if date range spans multiple months
    const isMultiMonth = startMonth !== endMonth || startYear !== endYear;
    return isMultiMonth;
  }

  return false; // Don't include tabs we can't identify
};

// Transform data from multiple sheets into aggregated campaign data
export const transformMultiSheetCampaignData = (
  allSheetData: MultipleSheetData[],
  procedureFilter?: string,
  dateRange?: { from: Date | undefined; to: Date | undefined }
): CampaignData | null => {
  if (!allSheetData || allSheetData.length === 0) {
    console.log('No multi-sheet data available for transformation');
    return null;
  }

  try {
    console.log('Transforming multi-sheet campaign data:', { 
      sheetsCount: allSheetData.length, 
      procedureFilter, 
      dateRange 
    });

    // Filter sheets based on date range
    const relevantSheets = allSheetData.filter(sheet => 
      isTabRelevantForDateRange(sheet.tabName, dateRange)
    );

    console.log(`Filtered to ${relevantSheets.length} relevant sheets:`, 
      relevantSheets.map(s => s.tabName));

    if (relevantSheets.length === 0) {
      console.log('No relevant sheets found for the selected date range');
      return null;
    }

    let totalLeads = 0;
    let totalAdSpend = 0;
    let totalCpl = 0;
    let cplCount = 0;
    let processedRows = 0;

    // Process each relevant sheet
    relevantSheets.forEach(({ tabName, data }) => {
      console.log(`Processing tab: ${tabName} with ${data.length} rows`);
      
      if (!data || data.length < 2) return;

      // Find header row
      let headerRow: string[] = [];
      let dataStartIndex = 1;
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const hasCampaignHeaders = row.some(cell => 
          cell && (
            cell.toLowerCase().includes('business') ||
            cell.toLowerCase().includes('service') ||
            cell.toLowerCase().includes('leads') ||
            cell.toLowerCase().includes('spend') ||
            cell.toLowerCase().includes('cpl') ||
            cell.toLowerCase().includes('texas')
          )
        );
        
        if (hasCampaignHeaders) {
          headerRow = row;
          dataStartIndex = i + 1;
          break;
        }
      }

      if (headerRow.length === 0) {
        console.log(`No headers found in tab ${tabName}, skipping`);
        return;
      }

      console.log(`Tab ${tabName} headers:`, headerRow);

      // Map column indices
      const getColumnIndex = (patterns: string[]) => {
        return headerRow.findIndex(header => 
          header && patterns.some(pattern => 
            header.toLowerCase().includes(pattern.toLowerCase())
          )
        );
      };
      
      const businessIndex = getColumnIndex(['business', 'name', 'client']);
      const serviceIndex = getColumnIndex(['service', 'procedure', 'type']);
      const leadsIndex = getColumnIndex(['leads', '#leads', 'lead']);
      const spendIndex = getColumnIndex(['spend', 'ad spend', 'cost', 'budget']);
      const cplIndex = getColumnIndex(['cpl', 'cost per lead']);

      console.log(`Tab ${tabName} column indices:`, {
        business: businessIndex,
        service: serviceIndex,
        leads: leadsIndex,
        spend: spendIndex,
        cpl: cplIndex
      });

      // Process data rows
      for (let i = dataStartIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        // Log the row we're checking
        console.log(`Tab ${tabName} checking row ${i}:`, row);
        
        // Enhanced Texas Vascular Institute detection
        const businessName = businessIndex >= 0 ? (row[businessIndex] || '').toString() : '';
        
        // Check multiple ways for Texas Vascular Institute
        const hasTexasVascular = 
          businessName.toLowerCase().includes('texas vascular') ||
          businessName.toLowerCase().includes('texas vascular institute') ||
          row.some(cell => {
            if (!cell) return false;
            const cellStr = cell.toString().toLowerCase();
            return cellStr.includes('texas vascular') || 
                   cellStr.includes('texas vascular institute');
          });
        
        console.log(`Tab ${tabName} row ${i} - Business: "${businessName}", Has Texas Vascular: ${hasTexasVascular}`);
        
        if (!hasTexasVascular) continue;
        
        console.log(`Found Texas Vascular data in tab ${tabName} row ${i}`);
        
        // Apply procedure filter if specified
        if (procedureFilter && procedureFilter !== 'ALL') {
          const serviceValue = serviceIndex >= 0 ? (row[serviceIndex] || '').toString() : '';
          if (!serviceValue.toLowerCase().includes(procedureFilter.toLowerCase())) {
            console.log(`Filtered out row ${i} due to procedure filter: ${serviceValue} doesn't contain ${procedureFilter}`);
            continue;
          }
        }
        
        // Extract and aggregate numeric values
        const leadsRaw = leadsIndex >= 0 ? row[leadsIndex] : null;
        const spendRaw = spendIndex >= 0 ? row[spendIndex] : null;
        const cplRaw = cplIndex >= 0 ? row[cplIndex] : null;
        
        const leads = leadsRaw ? parseFloat(leadsRaw.toString().replace(/[^0-9.-]/g, '') || '0') : 0;
        const adSpend = spendRaw ? parseFloat(spendRaw.toString().replace(/[^0-9.-]/g, '') || '0') : 0;
        const cpl = cplRaw ? parseFloat(cplRaw.toString().replace(/[^0-9.-]/g, '') || '0') : 0;
        
        console.log(`Tab ${tabName} row ${i} extracted values:`, { 
          leadsRaw, leads, 
          spendRaw, adSpend, 
          cplRaw, cpl 
        });
        
        if (leads > 0 || adSpend > 0) {
          totalLeads += leads;
          totalAdSpend += adSpend;
          
          if (cpl > 0) {
            totalCpl += cpl;
            cplCount++;
          }
          
          processedRows++;
          console.log(`Tab ${tabName} row ${i} PROCESSED:`, { leads, adSpend, cpl });
          console.log(`Running totals:`, { totalLeads, totalAdSpend, totalCpl, cplCount });
        } else {
          console.log(`Tab ${tabName} row ${i} SKIPPED - no valid leads or spend data`);
        }
      }
    });

    console.log(`Final processing summary: ${processedRows} rows processed across ${relevantSheets.length} relevant tabs`);
    console.log(`Final totals:`, { totalLeads, totalAdSpend, totalCpl, cplCount });

    if (processedRows === 0) {
      console.log('No Texas Vascular data found across relevant tabs');
      return null;
    }

    // Calculate final metrics
    const avgCpl = cplCount > 0 ? totalCpl / cplCount : (totalAdSpend > 0 && totalLeads > 0 ? totalAdSpend / totalLeads : 85);
    const estimatedAppointments = Math.round(totalLeads * 0.45);
    const estimatedProcedures = Math.round(estimatedAppointments * 0.6);
    const showRate = estimatedProcedures > 0 ? (estimatedProcedures / estimatedAppointments) * 100 : 75;
    const cpa = estimatedAppointments > 0 ? totalAdSpend / estimatedAppointments : 0;
    const cpp = estimatedProcedures > 0 ? totalAdSpend / estimatedProcedures : 0;

    const result = {
      adSpend: totalAdSpend,
      leads: totalLeads,
      appointments: estimatedAppointments,
      procedures: estimatedProcedures,
      showRate,
      cpl: avgCpl,
      cpa,
      cpp,
      trend: 'up' as 'up' | 'down',
    };

    console.log('Multi-sheet transformation final result:', result);
    return result;

  } catch (error) {
    console.error('Error transforming multi-sheet campaign data:', error);
    return null;
  }
};
