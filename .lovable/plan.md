

# Add Project Summary Table with Call & Appointment Metrics

## Overview
Create a new component that displays a summary table on the admin Dashboard tab, showing per-project breakdowns of inbound calls, outbound calls, total calls, and confirmed appointments booked.

## New Component

### File: `src/components/dashboard/ProjectCallSummaryTable.tsx` (new file)

A table component that:
1. Fetches all records from `all_calls` (paginated in batches of 1000) and groups by `project_name` + `direction`
2. Fetches confirmed appointments from `all_appointments` where `LOWER(TRIM(status)) = 'confirmed'`, grouped by `project_name`
3. Excludes the demo project ("PPM - Test Account")
4. Displays a clean table with columns:
   - **Project Name**
   - **Inbound Calls** (direction = 'inbound')
   - **Outbound Calls** (direction = 'outbound')
   - **Total Calls** (sum of both)
   - **Confirmed Appointments**
5. Sorted by total calls descending
6. Shows a loading spinner while data loads
7. Includes a totals row at the bottom

### UI Design
- Uses existing `Table` components from `src/components/ui/table.tsx`
- Wrapped in a Card with header "Project Performance Summary"
- Consistent styling with the rest of the dashboard

## Integration

### File: `src/pages/Index.tsx` (~line 296-299)

Add the new `ProjectCallSummaryTable` component to the Dashboard tab, placed between `MasterDatabaseStats` and `CallCenterDashboard`:

```tsx
<TabsContent value="dashboard" className="space-y-6">
  <MasterDatabaseStats />
  <ProjectCallSummaryTable />
  <CallCenterDashboard projectId="ALL" />
</TabsContent>
```

## Technical Details

- Reuses the same paginated fetch pattern already used in `CallCenterDashboard.tsx` and `CallTeamTab.tsx`
- Groups data client-side using a `Record<string, { inbound, outbound, confirmed }>` map
- No database changes needed -- uses existing `all_calls.direction` and `all_appointments.status` columns

