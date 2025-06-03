
interface FailedRecord {
  originalData: any;
  error: string;
  rowIndex: number;
}

export const exportFailedRecordsToCsv = (failedRecords: FailedRecord[], originalHeaders: string[]) => {
  if (failedRecords.length === 0) return;

  // Create headers with an additional "Error Reason" column
  const headers = [...originalHeaders, 'Error Reason'];
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...failedRecords.map(record => {
      const row = headers.slice(0, -1).map(header => {
        const value = record.originalData[header] || '';
        // Escape commas and quotes in CSV values
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      });
      // Add error reason as last column
      row.push(`"${record.error.replace(/"/g, '""')}"`);
      return row.join(',');
    })
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `failed_appointments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
