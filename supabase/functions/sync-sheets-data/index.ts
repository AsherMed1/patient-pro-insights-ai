
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SheetData {
  tabName: string;
  data: string[][];
}

interface AppointmentRecord {
  client_id: string;
  patient_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  status?: string;
  procedure_ordered?: boolean;
  showed?: boolean;
  cancelled?: boolean;
  confirmed?: boolean;
  source_sheet: string;
  source_row: number;
}

interface CampaignRecord {
  client_id: string;
  campaign_date?: string;
  ad_spend?: number;
  leads?: number;
  appointments?: number;
  procedures?: number;
  show_rate?: number;
  cpl?: number;
  cpa?: number;
  cpp?: number;
  source_sheet: string;
  source_row: number;
}

async function fetchAllSheetData(spreadsheetId: string, apiKey: string) {
  // First get all sheet tabs
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
  const metadataResponse = await fetch(metadataUrl);
  
  if (!metadataResponse.ok) {
    throw new Error(`Failed to fetch sheet metadata: ${metadataResponse.statusText}`);
  }
  
  const metadata = await metadataResponse.json();
  const sheets = metadata.sheets?.map((sheet: any) => sheet.properties.title) || [];
  
  // Fetch data from all sheets
  const allSheetData: SheetData[] = [];
  
  for (const sheetName of sheets) {
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;
    const dataResponse = await fetch(dataUrl);
    
    if (dataResponse.ok) {
      const data = await dataResponse.json();
      allSheetData.push({
        tabName: sheetName,
        data: data.values || []
      });
    }
  }
  
  return allSheetData;
}

function transformToAppointments(sheetData: SheetData[], clientId: string): AppointmentRecord[] {
  const appointments: AppointmentRecord[] = [];
  
  for (const sheet of sheetData) {
    const { tabName, data } = sheet;
    
    if (!data || data.length < 2) continue;
    
    // Find header row
    let headerRow: string[] = [];
    let dataStartIndex = 1;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const hasAppointmentHeaders = row.some(cell => 
        cell && (
          cell.toLowerCase().includes('patient') ||
          cell.toLowerCase().includes('name') ||
          cell.toLowerCase().includes('date') ||
          cell.toLowerCase().includes('status')
        )
      );
      
      if (hasAppointmentHeaders) {
        headerRow = row;
        dataStartIndex = i + 1;
        break;
      }
    }
    
    if (headerRow.length === 0) continue;
    
    // Map column indices
    const patientNameIndex = headerRow.findIndex(h => 
      h && (h.toLowerCase().includes('patient') || h.toLowerCase().includes('name'))
    );
    const dateIndex = headerRow.findIndex(h => 
      h && h.toLowerCase().includes('date')
    );
    const timeIndex = headerRow.findIndex(h => 
      h && h.toLowerCase().includes('time')
    );
    const statusIndex = headerRow.findIndex(h => 
      h && h.toLowerCase().includes('status')
    );
    const procedureIndex = headerRow.findIndex(h => 
      h && (h.toLowerCase().includes('procedure') || h.toLowerCase().includes('ordered'))
    );
    
    // Process data rows
    for (let i = dataStartIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const patientName = patientNameIndex >= 0 ? row[patientNameIndex]?.trim() : '';
      if (!patientName) continue;
      
      const status = statusIndex >= 0 ? row[statusIndex]?.toLowerCase() || '' : '';
      const procedureValue = procedureIndex >= 0 ? row[procedureIndex]?.toLowerCase() || '' : '';
      
      appointments.push({
        client_id: clientId,
        patient_name: patientName,
        appointment_date: dateIndex >= 0 ? row[dateIndex] : undefined,
        appointment_time: timeIndex >= 0 ? row[timeIndex] : undefined,
        status: status,
        procedure_ordered: ['true', 'yes', 'x', '✓', 'checked', '1'].includes(procedureValue),
        showed: status.includes('showed') || status.includes('show'),
        cancelled: status.includes('cancelled') || status.includes('cancel'),
        confirmed: status.includes('confirmed') || status.includes('confirm'),
        source_sheet: tabName,
        source_row: i + 1
      });
    }
  }
  
  return appointments;
}

function transformToCampaigns(sheetData: SheetData[], clientId: string): CampaignRecord[] {
  const campaigns: CampaignRecord[] = [];
  
  for (const sheet of sheetData) {
    const { tabName, data } = sheet;
    
    if (!data || data.length < 2) continue;
    
    // Find header row for campaign data
    let headerRow: string[] = [];
    let dataStartIndex = 1;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const hasCampaignHeaders = row.some(cell => 
        cell && (
          cell.toLowerCase().includes('spend') ||
          cell.toLowerCase().includes('leads') ||
          cell.toLowerCase().includes('cpl') ||
          cell.toLowerCase().includes('cost')
        )
      );
      
      if (hasCampaignHeaders) {
        headerRow = row;
        dataStartIndex = i + 1;
        break;
      }
    }
    
    if (headerRow.length === 0) continue;
    
    // Map column indices for campaign data
    const dateIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('date'));
    const spendIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('spend'));
    const leadsIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('leads'));
    const appointmentsIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('appointments'));
    const proceduresIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('procedures'));
    const showRateIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('show'));
    const cplIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('cpl'));
    const cpaIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('cpa'));
    const cppIndex = headerRow.findIndex(h => h && h.toLowerCase().includes('cpp'));
    
    // Process data rows
    for (let i = dataStartIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const dateValue = dateIndex >= 0 ? row[dateIndex] : '';
      if (!dateValue) continue;
      
      campaigns.push({
        client_id: clientId,
        campaign_date: dateValue,
        ad_spend: spendIndex >= 0 ? parseFloat(row[spendIndex]) || 0 : 0,
        leads: leadsIndex >= 0 ? parseInt(row[leadsIndex]) || 0 : 0,
        appointments: appointmentsIndex >= 0 ? parseInt(row[appointmentsIndex]) || 0 : 0,
        procedures: proceduresIndex >= 0 ? parseInt(row[proceduresIndex]) || 0 : 0,
        show_rate: showRateIndex >= 0 ? parseFloat(row[showRateIndex]) || 0 : 0,
        cpl: cplIndex >= 0 ? parseFloat(row[cplIndex]) || 0 : 0,
        cpa: cpaIndex >= 0 ? parseFloat(row[cpaIndex]) || 0 : 0,
        cpp: cppIndex >= 0 ? parseFloat(row[cppIndex]) || 0 : 0,
        source_sheet: tabName,
        source_row: i + 1
      });
    }
  }
  
  return campaigns;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, syncType = 'full' } = await req.json();
    
    console.log(`Starting sync for client: ${clientId}, type: ${syncType}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get Google API Key
    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new Error('Google API Key not configured');
    }
    
    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('client_id', clientId)
      .single();
    
    if (clientError || !client) {
      throw new Error(`Client not found: ${clientId}`);
    }
    
    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        client_id: clientId,
        sync_type: syncType,
        status: 'running'
      })
      .select()
      .single();
    
    if (logError) {
      throw new Error(`Failed to create sync log: ${logError.message}`);
    }
    
    let recordsProcessed = 0;
    let errorMessage = null;
    
    try {
      // Fetch all sheet data
      const allSheetData = await fetchAllSheetData(client.spreadsheet_id, apiKey);
      console.log(`Fetched data from ${allSheetData.length} sheets`);
      
      if (syncType === 'full' || syncType === 'appointments') {
        // Transform and store appointments
        const appointments = transformToAppointments(allSheetData, clientId);
        console.log(`Transformed ${appointments.length} appointments`);
        
        if (appointments.length > 0) {
          // Delete existing appointments for this client
          await supabase
            .from('appointments')
            .delete()
            .eq('client_id', clientId);
          
          // Insert new appointments in batches
          const batchSize = 100;
          for (let i = 0; i < appointments.length; i += batchSize) {
            const batch = appointments.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from('appointments')
              .insert(batch);
            
            if (insertError) {
              console.error('Error inserting appointments batch:', insertError);
            } else {
              recordsProcessed += batch.length;
            }
          }
        }
      }
      
      if (syncType === 'full' || syncType === 'campaigns') {
        // Transform and store campaigns
        const campaigns = transformToCampaigns(allSheetData, clientId);
        console.log(`Transformed ${campaigns.length} campaigns`);
        
        if (campaigns.length > 0) {
          // Delete existing campaigns for this client
          await supabase
            .from('campaigns')
            .delete()
            .eq('client_id', clientId);
          
          // Insert new campaigns in batches
          const batchSize = 100;
          for (let i = 0; i < campaigns.length; i += batchSize) {
            const batch = campaigns.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from('campaigns')
              .insert(batch);
            
            if (insertError) {
              console.error('Error inserting campaigns batch:', insertError);
            } else {
              recordsProcessed += batch.length;
            }
          }
        }
      }
      
    } catch (syncError) {
      errorMessage = syncError.message;
      console.error('Sync error:', syncError);
    }
    
    // Update sync log
    await supabase
      .from('sync_logs')
      .update({
        status: errorMessage ? 'error' : 'success',
        records_processed: recordsProcessed,
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLog.id);
    
    console.log(`Sync completed. Records processed: ${recordsProcessed}`);
    
    return new Response(
      JSON.stringify({
        success: !errorMessage,
        clientId,
        syncType,
        recordsProcessed,
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Sync function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
