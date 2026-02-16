

# Move Project Performance Summary to a New "Reporting" Tab

## Overview
Create a new "Reporting" tab in the main admin dashboard navigation and move the Project Performance Summary table from the Dashboard tab into it.

## Changes

### 1. `src/pages/Index.tsx`

**Add a new TabsTrigger** for "Reporting" in the tabs list (after "Call Team" or another logical position):
```
<TabsTrigger value="reporting">Reporting</TabsTrigger>
```

**Add a new TabsContent** for the reporting tab containing the ProjectCallSummaryTable:
```
<TabsContent value="reporting" className="space-y-6">
  <ProjectCallSummaryTable />
</TabsContent>
```

**Remove `<ProjectCallSummaryTable />`** from the existing Dashboard TabsContent (line 284), so Dashboard will only contain MasterDatabaseStats and CallCenterDashboard.

No other files need to change. The import for ProjectCallSummaryTable already exists in Index.tsx.
