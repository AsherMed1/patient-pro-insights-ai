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
  raw_data?: any;
  additional_fields?: any;
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
  raw_data?: any;
  additional_fields?: any;
}

// Enhanced function to fetch ALL sheet data with complete metadata
async function fetchAllSheetData(spreadsheetId: string, apiKey: string) {
  console.log(`Fetching complete metadata for spreadsheet: ${spreadsheetId}`);
  
  // First get all sheet tabs with detailed metadata
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&includeGridData=false`;
  const metadataResponse = await fetch(metadataUrl);
  
  if (!metadataResponse.ok) {
    throw new Error(`Failed to fetch sheet metadata: ${metadataResponse.statusText}`);
  }
  
  const metadata = await metadataResponse.json();
  const sheets = metadata.sheets?.map((sheet: any) => ({
    title: sheet.properties.title,
    sheetId: sheet.properties.sheetId,
    gridProperties: sheet.properties.gridProperties
  })) || [];
  
  console.log(`Found ${sheets.length} sheets:`, sheets.map(s => s.title));
  
  // Fetch data from all sheets with expanded range to capture everything
  const allSheetData: SheetData[] = [];
  
  for (const sheet of sheets) {
    const sheetName = sheet.title;
    // Use a large range to capture all possible data
    const maxRange = `${sheetName}!A1:ZZ10000`;
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${maxRange}?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
    
    console.log(`Fetching data from sheet: ${sheetName}`);
    const dataResponse = await fetch(dataUrl);
    
    if (dataResponse.ok) {
      const data = await dataResponse.json();
      const values = data.values || [];
      
      if (values.length > 0) {
        allSheetData.push({
          tabName: sheetName,
          data: values
        });
        console.log(`Captured ${values.length} rows from ${sheetName}`);
      }
    } else {
      console.warn(`Failed to fetch data from sheet ${sheetName}:`, dataResponse.statusText);
    }
  }
  
  return allSheetData;
}

// Enhanced validation functions
function isValidDate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  
  // Skip obvious non-date values
  const invalidPatterns = [
    /^(business|client|name|company|institute|care|center|vascular|medical|health)/i,
    /^(est|cst|pst|mst)$/i,
    /^(done|pending|complete|active|inactive)$/i,
    /^https?:\/\//i,
    /^[a-z\s&]+$/i // Pure text with no numbers
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(dateString.toString().trim())) {
      return false;
    }
  }
  
  // Try to parse as date
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.toString().trim().length > 0;
}

function isValidTime(timeString: string): boolean {
  if (!timeString || typeof timeString !== 'string') return false;
  
  // Skip timezone abbreviations and obvious non-time values
  const invalidPatterns = [
    /^(est|cst|pst|mst)$/i,
    /^(business|client|name)/i,
    /^https?:\/\//i
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(timeString.toString().trim())) {
      return false;
    }
  }
  
  // Check for time patterns (HH:MM, H:MM AM/PM, etc.)
  const timePatterns = [
    /^\d{1,2}:\d{2}$/,
    /^\d{1,2}:\d{2}\s?(am|pm)$/i,
    /^\d{1,2}:\d{2}:\d{2}$/
  ];
  
  return timePatterns.some(pattern => pattern.test(timeString.toString().trim()));
}

function sanitizeForDatabase(value: any): string | null {
  if (!value) return null;
  
  const strValue = value.toString().trim();
  if (strValue === '' || strValue.toLowerCase() === 'null' || strValue.toLowerCase() === 'undefined') {
    return null;
  }
  
  return strValue;
}

// Enhanced function to intelligently detect and map data
function smartTransformToAppointments(sheetData: SheetData[], clientId: string): AppointmentRecord[] {
  const appointments: AppointmentRecord[] = [];
  
  for (const sheet of sheetData) {
    const { tabName, data } = sheet;
    
    if (!data || data.length < 2) continue;
    
    console.log(`Processing ${tabName} for appointment data...`);
    
    // Find header row using multiple strategies
    let headerRow: string[] = [];
    let dataStartIndex = 1;
    
    // Strategy: Look for appointment-related keywords
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const appointmentKeywords = [
        'patient', 'name', 'date', 'time', 'status', 'appointment', 
        'procedure', 'show', 'confirm', 'cancel', 'client', 'lead'
      ];
      
      const hasAppointmentHeaders = row.some(cell => 
        cell && appointmentKeywords.some(keyword => 
          cell.toString().toLowerCase().includes(keyword)
        )
      );
      
      if (hasAppointmentHeaders) {
        headerRow = row.map(cell => cell?.toString() || '');
        dataStartIndex = i + 1;
        console.log(`Found appointment headers in ${tabName} at row ${i + 1}`);
        break;
      }
    }
    
    if (headerRow.length === 0) {
      // Fallback: use first non-empty row as header
      for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i].length > 0) {
          headerRow = data[i].map(cell => cell?.toString() || '');
          dataStartIndex = i + 1;
          break;
        }
      }
    }
    
    if (headerRow.length === 0) continue;
    
    // Smart column mapping with fuzzy matching
    const columnMap = createColumnMap(headerRow);
    
    // Process all data rows
    for (let i = dataStartIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Skip completely empty rows
      if (row.every(cell => !cell || cell.toString().trim() === '')) continue;
      
      // Create raw data object with all available information
      const rawData: any = {};
      const additionalFields: any = {};
      
      headerRow.forEach((header, index) => {
        if (header && row[index] !== undefined) {
          const cleanHeader = header.toString().trim();
          rawData[cleanHeader] = row[index];
          
          // Store fields that don't map to known columns
          if (!isKnownAppointmentField(cleanHeader)) {
            additionalFields[cleanHeader] = row[index];
          }
        }
      });
      
      // Extract and validate known fields using smart mapping
      const patientName = sanitizeForDatabase(extractFieldValue(row, headerRow, columnMap.patientName));
      const appointmentDateRaw = extractFieldValue(row, headerRow, columnMap.appointmentDate);
      const appointmentTimeRaw = extractFieldValue(row, headerRow, columnMap.appointmentTime);
      const status = sanitizeForDatabase(extractFieldValue(row, headerRow, columnMap.status));
      
      // Validate date and time before using
      const appointmentDate = appointmentDateRaw && isValidDate(appointmentDateRaw) ? appointmentDateRaw : null;
      const appointmentTime = appointmentTimeRaw && isValidTime(appointmentTimeRaw) ? appointmentTimeRaw : null;
      
      // Skip rows that are clearly header rows or invalid data
      if (patientName && (
        patientName.toLowerCase().includes('patient') ||
        patientName.toLowerCase().includes('business name') ||
        patientName.toLowerCase().includes('client')
      )) {
        console.log(`Skipping header/invalid row ${i + 1}: ${patientName}`);
        continue;
      }
      
      // Only create appointment record if we have some meaningful data
      if (patientName || appointmentDate || (Object.keys(rawData).length > 2)) {
        appointments.push({
          client_id: clientId,
          patient_name: patientName,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          status: status?.toLowerCase(),
          procedure_ordered: extractBooleanValue(row, headerRow, columnMap.procedureOrdered),
          showed: extractBooleanValue(row, headerRow, columnMap.showed) || status?.toLowerCase().includes('show'),
          cancelled: extractBooleanValue(row, headerRow, columnMap.cancelled) || status?.toLowerCase().includes('cancel'),
          confirmed: extractBooleanValue(row, headerRow, columnMap.confirmed) || status?.toLowerCase().includes('confirm'),
          source_sheet: tabName,
          source_row: i + 1,
          raw_data: rawData,
          additional_fields: Object.keys(additionalFields).length > 0 ? additionalFields : null
        });
      }
    }
  }
  
  console.log(`Transformed ${appointments.length} appointment records from all sheets`);
  return appointments;
}

function smartTransformToCampaigns(sheetData: SheetData[], clientId: string): CampaignRecord[] {
  const campaigns: CampaignRecord[] = [];
  
  for (const sheet of sheetData) {
    const { tabName, data } = sheet;
    
    if (!data || data.length < 2) continue;
    
    console.log(`Processing ${tabName} for campaign data...`);
    
    // Find header row for campaign data
    let headerRow: string[] = [];
    let dataStartIndex = 1;
    
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const campaignKeywords = [
        'spend', 'cost', 'leads', 'cpl', 'cpa', 'cpp', 'campaign', 
        'ad', 'marketing', 'appointments', 'procedures', 'show', 'rate', 'date'
      ];
      
      const hasCampaignHeaders = row.some(cell => 
        cell && campaignKeywords.some(keyword => 
          cell.toString().toLowerCase().includes(keyword)
        )
      );
      
      if (hasCampaignHeaders) {
        headerRow = row.map(cell => cell?.toString() || '');
        dataStartIndex = i + 1;
        console.log(`Found campaign headers in ${tabName} at row ${i + 1}`);
        break;
      }
    }
    
    if (headerRow.length === 0) continue;
    
    // Smart column mapping for campaigns
    const columnMap = createCampaignColumnMap(headerRow);
    
    // Process all data rows
    for (let i = dataStartIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Skip completely empty rows
      if (row.every(cell => !cell || cell.toString().trim() === '')) continue;
      
      // Create raw data object
      const rawData: any = {};
      const additionalFields: any = {};
      
      headerRow.forEach((header, index) => {
        if (header && row[index] !== undefined) {
          const cleanHeader = header.toString().trim();
          rawData[cleanHeader] = row[index];
          
          if (!isKnownCampaignField(cleanHeader)) {
            additionalFields[cleanHeader] = row[index];
          }
        }
      });
      
      const dateValueRaw = extractFieldValue(row, headerRow, columnMap.date);
      const dateValue = dateValueRaw && isValidDate(dateValueRaw) ? dateValueRaw : null;
      
      // Skip rows with invalid dates that are clearly not campaign data
      if (dateValueRaw && !dateValue && (
        dateValueRaw.toString().toLowerCase().includes('business') ||
        dateValueRaw.toString().toLowerCase().includes('client') ||
        dateValueRaw.toString().startsWith('http')
      )) {
        console.log(`Skipping invalid campaign row ${i + 1}: ${dateValueRaw}`);
        continue;
      }
      
      // Create campaign record if we have meaningful data
      if (dateValue || Object.keys(rawData).length > 2) {
        campaigns.push({
          client_id: clientId,
          campaign_date: dateValue,
          ad_spend: extractNumericValue(row, headerRow, columnMap.adSpend),
          leads: extractIntegerValue(row, headerRow, columnMap.leads),
          appointments: extractIntegerValue(row, headerRow, columnMap.appointments),
          procedures: extractIntegerValue(row, headerRow, columnMap.procedures),
          show_rate: extractNumericValue(row, headerRow, columnMap.showRate),
          cpl: extractNumericValue(row, headerRow, columnMap.cpl),
          cpa: extractNumericValue(row, headerRow, columnMap.cpa),
          cpp: extractNumericValue(row, headerRow, columnMap.cpp),
          source_sheet: tabName,
          source_row: i + 1,
          raw_data: rawData,
          additional_fields: Object.keys(additionalFields).length > 0 ? additionalFields : null
        });
      }
    }
  }
  
  console.log(`Transformed ${campaigns.length} campaign records from all sheets`);
  return campaigns;
}

// Helper functions for smart field extraction
function createColumnMap(headers: string[]) {
  const map: any = {};
  
  headers.forEach((header, index) => {
    const lower = header.toLowerCase();
    
    if (lower.includes('patient') || lower.includes('name')) map.patientName = index;
    if (lower.includes('date') && !lower.includes('time')) map.appointmentDate = index;
    if (lower.includes('time')) map.appointmentTime = index;
    if (lower.includes('status')) map.status = index;
    if (lower.includes('procedure') || lower.includes('order')) map.procedureOrdered = index;
    if (lower.includes('show') && !lower.includes('rate')) map.showed = index;
    if (lower.includes('cancel')) map.cancelled = index;
    if (lower.includes('confirm')) map.confirmed = index;
  });
  
  return map;
}

function createCampaignColumnMap(headers: string[]) {
  const map: any = {};
  
  headers.forEach((header, index) => {
    const lower = header.toLowerCase();
    
    if (lower.includes('date')) map.date = index;
    if (lower.includes('spend') || lower.includes('cost')) map.adSpend = index;
    if (lower.includes('leads') && !lower.includes('cost')) map.leads = index;
    if (lower.includes('appointment')) map.appointments = index;
    if (lower.includes('procedure')) map.procedures = index;
    if (lower.includes('show') && lower.includes('rate')) map.showRate = index;
    if (lower.includes('cpl')) map.cpl = index;
    if (lower.includes('cpa')) map.cpa = index;
    if (lower.includes('cpp')) map.cpp = index;
  });
  
  return map;
}

function extractFieldValue(row: any[], headers: string[], columnIndex?: number): string | undefined {
  if (columnIndex !== undefined && columnIndex >= 0 && row[columnIndex]) {
    return row[columnIndex].toString().trim();
  }
  return undefined;
}

function extractNumericValue(row: any[], headers: string[], columnIndex?: number): number {
  const value = extractFieldValue(row, headers, columnIndex);
  if (!value) return 0;
  
  const numericValue = parseFloat(value.replace(/[,$%]/g, ''));
  return isNaN(numericValue) ? 0 : numericValue;
}

function extractIntegerValue(row: any[], headers: string[], columnIndex?: number): number {
  const value = extractNumericValue(row, headers, columnIndex);
  return Math.floor(value);
}

function extractBooleanValue(row: any[], headers: string[], columnIndex?: number): boolean {
  const value = extractFieldValue(row, headers, columnIndex);
  if (!value) return false;
  
  const lower = value.toLowerCase();
  return ['true', 'yes', 'x', '✓', 'checked', '1', 'y'].includes(lower);
}

function isKnownAppointmentField(fieldName: string): boolean {
  const knownFields = [
    'patient', 'name', 'date', 'time', 'status', 'procedure', 
    'show', 'cancel', 'confirm', 'appointment'
  ];
  const lower = fieldName.toLowerCase();
  return knownFields.some(field => lower.includes(field));
}

function isKnownCampaignField(fieldName: string): boolean {
  const knownFields = [
    'date', 'spend', 'cost', 'leads', 'appointment', 'procedure', 
    'show', 'rate', 'cpl', 'cpa', 'cpp', 'campaign'
  ];
  const lower = fieldName.toLowerCase();
  return knownFields.some(field => lower.includes(field));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, syncType = 'full' } = await req.json();
    
    console.log(`Starting enhanced sync for client: ${clientId}, type: ${syncType}`);
    
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
    
    console.log(`Processing client: ${client.name} (${client.spreadsheet_id})`);
    
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
      // Fetch ALL sheet data with enhanced capture
      console.log('Fetching all sheet data with enhanced capture...');
      const allSheetData = await fetchAllSheetData(client.spreadsheet_id, apiKey);
      console.log(`Captured data from ${allSheetData.length} sheets`);
      
      if (syncType === 'full' || syncType === 'appointments') {
        // Transform and store appointments with all data
        const appointments = smartTransformToAppointments(allSheetData, clientId);
        console.log(`Smart-transformed ${appointments.length} appointments`);
        
        if (appointments.length > 0) {
          // Delete existing appointments for this client
          const { error: deleteError } = await supabase
            .from('appointments')
            .delete()
            .eq('client_id', clientId);
          
          if (deleteError) {
            console.error('Error deleting existing appointments:', deleteError);
          }
          
          // Insert new appointments in smaller batches with better error handling
          const batchSize = 25; // Smaller batches for complex data
          for (let i = 0; i < appointments.length; i += batchSize) {
            const batch = appointments.slice(i, i + batchSize);
            
            // Validate each record before insertion
            const validBatch = batch.filter(record => {
              // Skip records with invalid data
              if (record.appointment_date && !isValidDate(record.appointment_date)) {
                console.log(`Skipping invalid appointment date: ${record.appointment_date}`);
                return false;
              }
              if (record.appointment_time && !isValidTime(record.appointment_time)) {
                console.log(`Skipping invalid appointment time: ${record.appointment_time}`);
                return false;
              }
              return true;
            });
            
            if (validBatch.length > 0) {
              const { error: insertError } = await supabase
                .from('appointments')
                .insert(validBatch);
              
              if (insertError) {
                console.error('Error inserting appointments batch:', insertError);
              } else {
                recordsProcessed += validBatch.length;
                console.log(`Inserted appointments batch ${Math.floor(i/batchSize) + 1}: ${validBatch.length} records`);
              }
            }
          }
        }
      }
      
      if (syncType === 'full' || syncType === 'campaigns') {
        // Transform and store campaigns with all data
        const campaigns = smartTransformToCampaigns(allSheetData, clientId);
        console.log(`Smart-transformed ${campaigns.length} campaigns`);
        
        if (campaigns.length > 0) {
          // Delete existing campaigns for this client
          const { error: deleteError } = await supabase
            .from('campaigns')
            .delete()
            .eq('client_id', clientId);
          
          if (deleteError) {
            console.error('Error deleting existing campaigns:', deleteError);
          }
          
          // Insert new campaigns in smaller batches with validation
          const batchSize = 25;
          for (let i = 0; i < campaigns.length; i += batchSize) {
            const batch = campaigns.slice(i, i + batchSize);
            
            // Validate each record before insertion
            const validBatch = batch.filter(record => {
              if (record.campaign_date && !isValidDate(record.campaign_date)) {
                console.log(`Skipping invalid campaign date: ${record.campaign_date}`);
                return false;
              }
              return true;
            });
            
            if (validBatch.length > 0) {
              const { error: insertError } = await supabase
                .from('campaigns')
                .insert(validBatch);
              
              if (insertError) {
                console.error('Error inserting campaigns batch:', insertError);
              } else {
                recordsProcessed += validBatch.length;
                console.log(`Inserted campaigns batch ${Math.floor(i/batchSize) + 1}: ${validBatch.length} records`);
              }
            }
          }
        }
      }
      
    } catch (syncError) {
      errorMessage = syncError.message;
      console.error('Enhanced sync error:', syncError);
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
    
    console.log(`Enhanced sync completed. Records processed: ${recordsProcessed}`);
    
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
    console.error('Enhanced sync function error:', error);
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
