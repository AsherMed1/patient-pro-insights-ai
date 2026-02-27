

## Fix Missing "Add Note" Button for Ally Appointments

### Problem
The "Add Note" button next to the "Internal Notes" header is not visible for Esperanza Benitez, Donna Broussard, and Viola Rios in the DetailedAppointmentView dialog. The code renders it unconditionally, so this is likely a layout/overflow issue in the dialog, or the button is too subtle. The user's red arrow points to the action bar area, suggesting they want the button more prominently placed.

### Changes

| File | Change |
|------|--------|
| `src/components/appointments/DetailedAppointmentView.tsx` | Add an explicit "Add Note" button to the action row (next to View Insurance, Status dropdown, and Procedure dropdown) that scrolls to and triggers the note form in the AppointmentNotes section below |
| `src/components/appointments/AppointmentNotes.tsx` | Expose a `ref` or `onAddNote` callback prop so the parent can programmatically trigger the Add Note form; also add `id="appointment-notes"` for scroll targeting |

### Detail

**DetailedAppointmentView.tsx** — Add button to action row (~line 762, after the procedure dropdown):
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowNotesForm(true)}
  className="flex items-center space-x-1"
>
  <Plus className="h-3 w-3" />
  <span>Add Note</span>
</Button>
```

**AppointmentNotes.tsx** — Accept an optional `externalShowForm` prop to allow the parent to control form visibility:
```typescript
interface AppointmentNotesProps {
  appointmentId: string;
  leadName: string;
  projectName: string;
  externalShowForm?: boolean;
  onFormToggled?: (showing: boolean) => void;
}
```

When `externalShowForm` transitions to `true`, auto-open the Add Note form and scroll it into view. This ensures the button is always visible in the action row for every patient, regardless of any layout issues with the Internal Notes header.

