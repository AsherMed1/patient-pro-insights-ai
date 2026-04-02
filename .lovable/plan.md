

## Fix: HAE Parsing Issues for Ventra Medical

### Problems Identified

1. **Wrong pathology data pulled**: The intake notes contain `Pathology (by procedure): GAE—Age Range 56 and above; UFE—Period Length 3-5 days, Heaviness Light...` — there is NO HAE section. The parser pulls GAE and UFE data and incorrectly assigns it to HAE.

2. **`isPathologyField` missing HAE keywords**: Line 806-811 checks for `pae`, `ufe`, `gae`, `knee`, `prostate`, `fibroid`, `uterine`, `pelvic`, `pad`, `peripheral`, `fse`, `shoulder` — but NOT `hae` or `hemorrhoid`. This means HAE STEP fields from GHL are not recognized as pathology fields and bypass procedure filtering.

3. **No HAE-specific field extraction**: Unlike PAE (prostate), UFE (fibroid), GAE (knee), PAD (circulation), and FSE (shoulder), there are no HAE-specific GHL field matchers (lines 922-970). HAE fields like hemorrhoid bleeding, rectal symptoms, etc. are never captured.

4. **Fallback regex procedure detection order**: `HAE` check on line 487 runs first, but when notes contain `GAE` and `UFE` text (from multi-procedure Pathology sections), the regex extracts data from those sections and assigns it to HAE.

5. **PCP and Imaging not in intake notes**: The raw notes for VENTRA TEST contain no PCP or imaging data. If Ventra's GHL form has those fields under custom field keys, they may not match the current keyword patterns.

### Fix (1 file)

**`supabase/functions/auto-parse-intake-notes/index.ts`**

#### 1. Add `hae`/`hemorrhoid` to `isPathologyField` detection (~line 808)
```typescript
key.includes('fse') || key.includes('shoulder') ||
key.includes('hae') || key.includes('hemorrhoid') || key.includes('rectal') || key.includes('bleeding');
```
This ensures HAE STEP fields are correctly identified as pathology fields and filtered by procedure.

#### 2. Add HAE-specific GHL field matchers (after FSE block, ~line 987)
Add handlers for hemorrhoid-related custom fields:
- `hemorrhoid` / `rectal` / `bleeding` → primary_complaint, symptoms
- `bowel` / `constipation` → symptoms  
- `colonoscopy` → imaging_done

#### 3. Fix multi-procedure intake notes parsing
When the intake notes contain `Pathology (by procedure): GAE—...; UFE—...` format, the fallback regex should only extract data from the section matching the target procedure (HAE). If no HAE section exists, it should not pull GAE/UFE data.

Add a procedure-section extraction step in the fallback regex parser (~line 485):
- Parse the `Pathology (by procedure):` format
- Extract only the section matching the detected procedure
- If no matching section exists, leave pathology fields empty rather than pulling wrong procedure data

#### 4. Deploy and re-trigger parsing
- Deploy updated edge function
- Reset `parsing_completed_at` for the VENTRA TEST appointment to re-parse with corrected logic

### Note on PCP/Imaging
The raw intake notes for VENTRA TEST contain no PCP or imaging information. If Ventra's GHL form collects this data under custom fields, those fields will now be captured correctly via the existing PCP/imaging matchers (lines 995-1088) once the `isPathologyField` fix ensures HAE fields aren't blocking them. If Ventra uses non-standard field names for PCP/imaging, we may need to check the actual GHL custom field definitions after re-parsing.

