

# Plan: Consolidate Ally Vascular Appointments to Correct Project

## Problem Identified

After November 18th, 2025, **307 appointments** have been created under the wrong project name due to a naming discrepancy:

| Project Name | Space Pattern | Status | GHL Credentials | Appointments After Nov 18 |
|-------------|---------------|--------|-----------------|---------------------------|
| "Ally Vascular  and Pain Centers" | Double space | **Active** | Has API key | 43 |
| "Ally Vascular and Pain Centers" | Single space | Inactive | None | **307** |

The GHL webhook started sending the project name with a single space, causing new appointments to be routed to an inactive duplicate project.

---

## Solution Options

### Option A: Merge Appointments to the Active Project (Recommended)
Update all appointments from the single-space project to use the double-space project name, consolidating data under the active project.

### Option B: Make the Single-Space Project Active
Since it has the most recent data, activate the single-space project and transfer GHL credentials to it.

---

## Recommended Solution: Option A - Merge Appointments

### Step 1: Update Appointment Project Names
Migrate all 382 appointments from "Ally Vascular and Pain Centers" to "Ally Vascular  and Pain Centers"

```sql
UPDATE all_appointments
SET project_name = 'Ally Vascular  and Pain Centers',
    updated_at = NOW()
WHERE project_name = 'Ally Vascular and Pain Centers';
```

### Step 2: Update Leads Project Names (if applicable)
```sql
UPDATE new_leads
SET project_name = 'Ally Vascular  and Pain Centers',
    updated_at = NOW()
WHERE project_name = 'Ally Vascular and Pain Centers';
```

### Step 3: Delete the Duplicate Project Entry
```sql
DELETE FROM projects
WHERE project_name = 'Ally Vascular and Pain Centers';
```

### Step 4: Prevent Future Issues
Update the GHL webhook handler to normalize project names by collapsing multiple spaces into single spaces, then matching to existing projects.

---

## Implementation Details

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/ghl-webhook-handler/index.ts` | Add project name normalization logic |

### Webhook Handler Update

Add a utility function to normalize project names before matching:

```typescript
function normalizeProjectName(name: string): string {
  // Collapse multiple spaces into single space
  return name.replace(/\s+/g, ' ').trim();
}

// When matching/creating projects:
const normalizedName = normalizeProjectName(webhookData.location?.name || '');

// Try exact match first, then normalized match
let { data: project } = await supabase
  .from('projects')
  .select('*')
  .or(`project_name.eq.${webhookName},project_name.ilike.%${normalizedName}%`)
  .limit(1)
  .single();
```

---

## Execution Steps

1. **Run SQL migration** to consolidate appointments and leads
2. **Delete the duplicate project** from the projects table
3. **Update the webhook handler** to prevent future naming issues
4. **Verify** that all 665 appointments now appear under the active project

---

## Expected Outcome

After consolidation:
- **665 appointments** visible under "Ally Vascular  and Pain Centers"
- Single project entry with all historical data
- GHL credentials remain attached
- Future webhooks will correctly match to the active project

---

## Risk Mitigation

- Data is only being moved, not deleted
- Original project with GHL credentials remains intact
- All appointments retain their IDs and data integrity

