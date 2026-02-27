

## Add FSE Survey Field Extraction & Display to Patient Pro Insights

### Problem
The FSE STEP fields from GHL (duration, treatments tried, difficulty with movement, long-term relief, imaging, diagnoses, age range, affected shoulder, pain worse at night) are not being mapped to structured pathology fields. The parser only generically captures `pain`/`symptom` keywords but misses FSE-specific questions. The UI also lacks display for FSE-specific fields.

### Changes

**1. `supabase/functions/auto-parse-intake-notes/index.ts`** — Add FSE-specific STEP field extraction (after the PAD-specific block ~line 908):

```typescript
// FSE-specific survey fields
else if (key.includes('shoulder') && (key.includes('which') || key.includes('affected'))) {
  (result.pathology_info as any).affected_shoulder = String(value);
}
else if (key.includes('difficulty') && (key.includes('movement') || key.includes('shoulder') || key.includes('raising'))) {
  (result.pathology_info as any).difficulty_movement = String(value);
}
else if (key.includes('long-term') || key.includes('long_term') || key.includes('provide long')) {
  (result.pathology_info as any).long_term_relief = String(value);
}
else if (key.includes('worse') && (key.includes('night') || key.includes('lying'))) {
  (result.pathology_info as any).pain_worse_at_night = String(value);
}
else if (key.includes('diagnosed') && key.includes('following')) {
  (result.pathology_info as any).diagnosis = String(value);
}
```

Also expand the existing STEP field block (~line 773) to extract more FSE fields:
- `duration`/`how long` → `result.pathology_info.duration`
- `treatment` → `result.pathology_info.previous_treatments`
- `imaging` → `result.pathology_info.imaging_done`
- `how old`/`age` → `result.pathology_info.age_range`

**2. `src/components/appointments/ParsedIntakeInfo.tsx`** — Add display for FSE-specific fields in the Medical Information section (after `affected_knee` ~line 845):

```typescript
{formatValue(parsedPathologyInfo.affected_shoulder) && (
  <div className="text-sm">
    <span className="text-muted-foreground">Affected Shoulder:</span>{" "}
    <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
      {parsedPathologyInfo.affected_shoulder}
    </Badge>
  </div>
)}
{formatValue(parsedPathologyInfo.difficulty_movement) && (
  <div className="text-sm">
    <span className="text-muted-foreground">Difficulty with Movement:</span>{" "}
    <Badge variant={...}>{parsedPathologyInfo.difficulty_movement}</Badge>
  </div>
)}
{formatValue(parsedPathologyInfo.long_term_relief) && (
  <div className="text-sm">
    <span className="text-muted-foreground">Long-term Relief from Treatments:</span>{" "}
    <Badge variant={...}>{parsedPathologyInfo.long_term_relief}</Badge>
  </div>
)}
{formatValue(parsedPathologyInfo.pain_worse_at_night) && (
  <div className="text-sm">
    <span className="text-muted-foreground">Pain Worse at Night/Lying:</span>{" "}
    <Badge variant={...}>{parsedPathologyInfo.pain_worse_at_night}</Badge>
  </div>
)}
```

**3. Deploy & Reparse** — Deploy the updated edge function, then re-trigger parsing for the Joint & Vascular Institute FSE appointments so the data populates.

