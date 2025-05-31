
// Specialized transformer for appointment-based data (like Texas Vascular Institute format)

export interface AppointmentData {
  totalAppointments: number;
  proceduresOrdered: number;
  showedAppointments: number;
  cancelledAppointments: number;
  confirmedAppointments: number;
  showRate: number;
}

// Transform appointment-based sheet data (where each row is an appointment)
export const transformAppointmentData = (
  sheetData: string[][],
  clientFilter?: string,
  dateRange?: { from: Date | undefined; to: Date | undefined }
): AppointmentData | null => {
  if (!sheetData || sheetData.length < 2) {
    console.log('No appointment data available for transformation');
    return null;
  }

  try {
    console.log('Transforming appointment data:', { clientFilter, dateRange });
    console.log('Raw appointment sheet data:', sheetData);
    
    // Find the headers row
    let headerRow: string[] = [];
    let dataStartIndex = 1;
    
    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;
      
      // Look for appointment data headers
      const hasAppointmentHeaders = row.some(cell => 
        cell && (
          cell.toLowerCase().includes('patient') ||
          cell.toLowerCase().includes('name') ||
          cell.toLowerCase().includes('date') ||
          cell.toLowerCase().includes('time') ||
          cell.toLowerCase().includes('status') ||
          cell.toLowerCase().includes('procedure') ||
          cell.toLowerCase().includes('showed') ||
          cell.toLowerCase().includes('confirmed') ||
          cell.toLowerCase().includes('cancelled')
        )
      );
      
      if (hasAppointmentHeaders) {
        headerRow = row;
        dataStartIndex = i + 1;
        break;
      }
    }
    
    console.log('Found appointment headers:', headerRow);
    console.log('Data starts at row:', dataStartIndex);
    
    // Map column indices
    const getColumnIndex = (patterns: string[]) => {
      return headerRow.findIndex(header => 
        header && patterns.some(pattern => 
          header.toLowerCase().includes(pattern.toLowerCase())
        )
      );
    };
    
    const patientNameIndex = getColumnIndex(['patient', 'name', 'client']);
    const dateIndex = getColumnIndex(['date', 'appt date', 'appointment date']);
    const statusIndex = getColumnIndex(['status', 'appt status']);
    const procedureIndex = getColumnIndex(['procedure', 'procedure ordered', 'ordered']);
    
    console.log('Column indices:', {
      patientName: patientNameIndex,
      date: dateIndex,
      status: statusIndex,
      procedure: procedureIndex
    });
    
    let totalAppointments = 0;
    let proceduresOrdered = 0;
    let showedAppointments = 0;
    let cancelledAppointments = 0;
    let confirmedAppointments = 0;
    
    // Process each appointment row
    for (let i = dataStartIndex; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;
      
      // Skip empty rows or rows without patient data
      const patientName = patientNameIndex >= 0 ? (row[patientNameIndex] || '').toString().trim() : '';
      if (!patientName) continue;
      
      console.log(`Processing appointment row ${i}:`, row);
      
      // Apply client filter if specified (for multi-client sheets)
      if (clientFilter && clientFilter !== 'ALL') {
        const hasClientMatch = row.some(cell => 
          cell && cell.toString().toLowerCase().includes(clientFilter.toLowerCase())
        );
        if (!hasClientMatch) continue;
      }
      
      // Apply date filter if specified
      if (dateRange?.from && dateRange?.to && dateIndex >= 0) {
        const dateStr = row[dateIndex] || '';
        if (dateStr) {
          const appointmentDate = new Date(dateStr.toString());
          if (appointmentDate < dateRange.from || appointmentDate > dateRange.to) {
            continue;
          }
        }
      }
      
      // Count this as a valid appointment
      totalAppointments++;
      
      // Check appointment status
      const status = statusIndex >= 0 ? (row[statusIndex] || '').toString().toLowerCase() : '';
      if (status.includes('showed') || status.includes('show')) {
        showedAppointments++;
      } else if (status.includes('cancelled') || status.includes('cancel')) {
        cancelledAppointments++;
      } else if (status.includes('confirmed') || status.includes('confirm')) {
        confirmedAppointments++;
      }
      
      // Check if procedure was ordered (look for checkbox indicators)
      if (procedureIndex >= 0) {
        const procedureValue = (row[procedureIndex] || '').toString().toLowerCase();
        // Look for various checkbox indicators
        const isProcedureOrdered = 
          procedureValue.includes('true') ||
          procedureValue.includes('yes') ||
          procedureValue.includes('x') ||
          procedureValue.includes('✓') ||
          procedureValue.includes('checked') ||
          procedureValue === '1';
        
        if (isProcedureOrdered) {
          proceduresOrdered++;
        }
      }
      
      console.log(`Row ${i} processed:`, { 
        patient: patientName, 
        status, 
        procedureOrdered: procedureIndex >= 0 ? row[procedureIndex] : 'N/A' 
      });
    }
    
    // Calculate show rate
    const showRate = totalAppointments > 0 ? (showedAppointments / totalAppointments) * 100 : 0;
    
    const result = {
      totalAppointments,
      proceduresOrdered,
      showedAppointments,
      cancelledAppointments,
      confirmedAppointments,
      showRate,
    };
    
    console.log('Appointment transformation result:', result);
    return result;
    
  } catch (error) {
    console.error('Error transforming appointment data:', error);
    return null;
  }
};

// Transform multiple sheets of appointment data
export const transformMultiSheetAppointmentData = (
  allSheetData: Array<{ tabName: string; data: string[][] }>,
  clientFilter?: string,
  dateRange?: { from: Date | undefined; to: Date | undefined }
): AppointmentData | null => {
  if (!allSheetData || allSheetData.length === 0) {
    console.log('No multi-sheet appointment data available');
    return null;
  }

  try {
    console.log('Transforming multi-sheet appointment data from', allSheetData.length, 'tabs');
    
    let totalAppointments = 0;
    let proceduresOrdered = 0;
    let showedAppointments = 0;
    let cancelledAppointments = 0;
    let confirmedAppointments = 0;
    
    // Process each sheet
    allSheetData.forEach(({ tabName, data }) => {
      console.log(`Processing appointment tab: ${tabName}`);
      
      const tabResult = transformAppointmentData(data, clientFilter, dateRange);
      if (tabResult) {
        totalAppointments += tabResult.totalAppointments;
        proceduresOrdered += tabResult.proceduresOrdered;
        showedAppointments += tabResult.showedAppointments;
        cancelledAppointments += tabResult.cancelledAppointments;
        confirmedAppointments += tabResult.confirmedAppointments;
        
        console.log(`Tab ${tabName} contributed:`, tabResult);
      }
    });
    
    const showRate = totalAppointments > 0 ? (showedAppointments / totalAppointments) * 100 : 0;
    
    const result = {
      totalAppointments,
      proceduresOrdered,
      showedAppointments,
      cancelledAppointments,
      confirmedAppointments,
      showRate,
    };
    
    console.log('Multi-sheet appointment transformation final result:', result);
    return result;
    
  } catch (error) {
    console.error('Error transforming multi-sheet appointment data:', error);
    return null;
  }
};
