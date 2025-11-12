# Google Sheets → Database Sync Setup

This guide will help you set up automatic one-way sync from your Google Sheets tracking spreadsheet to the Insights database.

## Overview

When you edit any appointment data in your Google Sheet (status, procedure ordered, times, etc.), the changes will automatically sync to the database within seconds. The CSV/Google Sheet remains the **source of truth**.

## Setup Instructions

### Step 1: Open Your Google Sheet

1. Open your Buffalo Vascular Care tracking sheet in Google Sheets
2. Go to **Extensions** → **Apps Script**

### Step 2: Add the Sync Code

Paste this code into the Apps Script editor:

```javascript
/**
 * Automatic sync to Insights Database
 * Triggers whenever a cell is edited in the GAE sheet
 */

const WEBHOOK_URL = 'https://bhabbokbhnqioykjimix.supabase.co/functions/v1/sync-from-sheet';
const PROJECT_NAME = 'Buffalo Vascular Care'; // Change for other projects
const SHEET_NAME = 'GAE'; // The tab name with appointment data

// Column indexes (adjust if your sheet structure is different)
const COLUMNS = {
  LEAD_NAME: 0,        // Column A
  DATE: 1,             // Column B
  STATUS: 2,           // Column C
  PROCEDURE_ORDERED: 3,// Column D
  REQUESTED_TIME: 4,   // Column E
  PHONE: 5,            // Column F
  EMAIL: 6,            // Column G
  INSURANCE: 7,        // Column H
  NOTES: 8             // Column I
};

/**
 * Triggers on any edit to the sheet
 */
function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    
    // Only process edits to the GAE sheet
    if (sheet.getName() !== SHEET_NAME) {
      Logger.log('Edit was in different sheet, ignoring');
      return;
    }
    
    // Ignore edits to header row
    const row = range.getRow();
    if (row === 1) {
      Logger.log('Edit was in header row, ignoring');
      return;
    }
    
    // Get the entire row data
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Build payload
    const payload = {
      leadName: rowData[COLUMNS.LEAD_NAME],
      date: formatDate(rowData[COLUMNS.DATE]),
      projectName: PROJECT_NAME,
      status: rowData[COLUMNS.STATUS] || undefined,
      procedureOrdered: parseBooleanValue(rowData[COLUMNS.PROCEDURE_ORDERED]),
      requestedTime: rowData[COLUMNS.REQUESTED_TIME] || undefined,
      phoneNumber: rowData[COLUMNS.PHONE] || undefined,
      email: rowData[COLUMNS.EMAIL] || undefined,
      insuranceProvider: rowData[COLUMNS.INSURANCE] || undefined,
      notes: rowData[COLUMNS.NOTES] || undefined
    };
    
    // Skip if required fields are missing
    if (!payload.leadName || !payload.date) {
      Logger.log('Missing required fields (lead name or date), skipping sync');
      return;
    }
    
    Logger.log('Syncing to Insights: ' + JSON.stringify(payload));
    
    // Send to webhook
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode === 200) {
      Logger.log('✅ Sync successful: ' + responseText);
      
      // Optional: Show success toast
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Synced to Insights: ' + payload.leadName,
        '✅ Sync Success',
        3
      );
    } else {
      Logger.log('❌ Sync failed: ' + statusCode + ' - ' + responseText);
      
      // Optional: Show error toast
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Failed to sync to Insights. Check Apps Script logs.',
        '❌ Sync Error',
        5
      );
    }
    
  } catch (error) {
    Logger.log('❌ Error in onEdit: ' + error);
    
    // Optional: Show error toast
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Sync error: ' + error.message,
      '❌ Error',
      5
    );
  }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(dateValue) {
  if (!dateValue) return null;
  
  // If already a string in correct format, return as-is
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // If it's a Date object, format it
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Try to parse as date
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

/**
 * Parse boolean values from various formats
 */
function parseBooleanValue(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'yes' || lower === 'true' || lower === 'y' || lower === '1') return true;
    if (lower === 'no' || lower === 'false' || lower === 'n' || lower === '0' || lower === '') return false;
  }
  return undefined;
}

/**
 * Test function - run this manually to test the sync
 */
function testSync() {
  const testPayload = {
    leadName: 'John Test',
    date: '2025-01-15',
    projectName: PROJECT_NAME,
    status: 'Welcome Call'
  };
  
  Logger.log('Testing sync with payload: ' + JSON.stringify(testPayload));
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log('Response: ' + response.getResponseCode() + ' - ' + response.getContentText());
}
```

### Step 3: Customize Column Mapping

**Important:** Adjust the `COLUMNS` object at the top of the script to match your actual sheet structure. Count from 0 for the first column.

For example, if your sheet has:
- Column A: Lead Name → `LEAD_NAME: 0`
- Column B: Date → `DATE: 1`
- Column C: Status → `STATUS: 2`
- etc.

### Step 4: Set Up Trigger

1. In Apps Script, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger** in the bottom right
3. Configure:
   - **Function**: `onEdit`
   - **Event source**: From spreadsheet
   - **Event type**: On edit
4. Click **Save**
5. Grant permissions when prompted

### Step 5: Test the Integration

#### Option A: Manual Test Function
1. In Apps Script editor, select the `testSync` function from the dropdown
2. Click **Run**
3. Check the **Execution log** for results

#### Option B: Live Edit Test
1. Edit any cell in your sheet (e.g., change a status)
2. Watch for a success toast notification in the bottom right
3. Check Insights to verify the change appeared

## What Gets Synced

The sync automatically updates these fields when you edit them in the sheet:

- ✅ Status
- ✅ Procedure Ordered (yes/no)
- ✅ Requested Time
- ✅ Phone Number
- ✅ Email
- ✅ Insurance Provider
- ✅ Patient Intake Notes

## Troubleshooting

### Sync Not Working?

1. **Check Apps Script Logs**:
   - Go to Extensions → Apps Script
   - Click "Executions" in left sidebar
   - Look for error messages

2. **Verify Column Indexes**:
   - Make sure `COLUMNS` object matches your actual sheet structure
   - Remember: first column is 0, not 1

3. **Check Required Fields**:
   - Lead Name and Date must have values
   - Date must be a valid date format

4. **Verify Sheet Name**:
   - Make sure `SHEET_NAME` constant matches your actual tab name
   - Default is "GAE"

5. **Check Project Name**:
   - Verify `PROJECT_NAME` exactly matches the project name in database
   - Default is "Buffalo Vascular Care"

### Common Issues

**"No matching appointment found"**
- The lead name or date in your sheet doesn't match any database record
- Check for typos or date format issues
- Lead names are matched case-insensitively with trimmed whitespace

**"Missing required fields"**
- Either Lead Name or Date column is empty
- Fill in both fields for the sync to work

**Trigger not firing**
- Make sure you set up the trigger correctly in Step 4
- Try removing and re-adding the trigger

## Monitoring

All sync operations are logged to the `audit_logs` table with:
- Entity: `all_appointments`
- Action: `sync_from_sheet`
- Source: `google_sheets`
- Metadata includes appointment ID and updated fields

You can view sync history in the Audit Log section of Insights.

## Adding More Projects

To enable sync for other projects:

1. Copy the Apps Script to the other project's Google Sheet
2. Change the `PROJECT_NAME` constant to match that project
3. Adjust `SHEET_NAME` if the tab name is different
4. Verify column mappings in the `COLUMNS` object
5. Set up the `onEdit` trigger

## Security Notes

- The webhook endpoint is public but validates all input
- No authentication required (webhook only accepts valid appointment data)
- All sync operations are logged in the audit trail
- Original database data is preserved if sync fails

## Future Enhancements

This is Phase 1: One-way sync (Sheet → Database)

Potential Phase 2:
- Bidirectional sync (Database → Sheet)
- Batch sync for multiple rows
- Conflict resolution UI
- Real-time sync status dashboard
