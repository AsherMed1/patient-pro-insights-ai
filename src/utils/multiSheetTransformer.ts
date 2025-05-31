
import { CampaignData } from './sheetDataTransformer';

interface MultipleSheetData {
  tabName: string;
  data: string[][];
}

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

    let totalLeads = 0;
    let totalAdSpend = 0;
    let totalCpl = 0;
    let cplCount = 0;
    let processedRows = 0;

    // Process each sheet
    allSheetData.forEach(({ tabName, data }) => {
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

      // Process data rows
      for (let i = dataStartIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        // Check for Texas Vascular Institute data
        const businessName = businessIndex >= 0 ? row[businessIndex] || '' : '';
        const hasTexasVascular = businessName.toLowerCase().includes('texas vascular') ||
                                 row.some(cell => cell && cell.toString().toLowerCase().includes('texas vascular'));
        
        if (!hasTexasVascular) continue;
        
        // Apply procedure filter
        if (procedureFilter && procedureFilter !== 'ALL') {
          const serviceValue = serviceIndex >= 0 ? row[serviceIndex] || '' : '';
          if (!serviceValue.toLowerCase().includes(procedureFilter.toLowerCase())) {
            continue;
          }
        }
        
        // Extract and aggregate numeric values
        const leads = leadsIndex >= 0 ? parseFloat(row[leadsIndex]?.toString().replace(/[^0-9.-]/g, '') || '0') : 0;
        const adSpend = spendIndex >= 0 ? parseFloat(row[spendIndex]?.toString().replace(/[^0-9.-]/g, '') || '0') : 0;
        const cpl = cplIndex >= 0 ? parseFloat(row[cplIndex]?.toString().replace(/[^0-9.-]/g, '') || '0') : 0;
        
        totalLeads += leads;
        totalAdSpend += adSpend;
        
        if (cpl > 0) {
          totalCpl += cpl;
          cplCount++;
        }
        
        processedRows++;
        console.log(`Tab ${tabName} row ${i}:`, { leads, adSpend, cpl });
      }
    });

    console.log(`Processed ${processedRows} rows across all tabs`);

    if (processedRows === 0) {
      console.log('No Texas Vascular data found across all tabs');
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

    console.log('Multi-sheet transformation result:', result);
    return result;

  } catch (error) {
    console.error('Error transforming multi-sheet campaign data:', error);
    return null;
  }
};
