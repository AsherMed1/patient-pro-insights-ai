## Change

In `src/components/InsuranceViewModal.tsx`, update the Secondary Insurance section so the **Insurance Provider** field falls back to the **Insurance Plan** value when no provider is set. Primary Insurance behavior is unchanged.

## Implementation

In the `InsuranceViewModal` component, when rendering the Secondary `<InsuranceSection>`, pass:

```ts
provider={insuranceInfo.secondary_provider || insuranceInfo.secondary_plan}
```

instead of just `insuranceInfo.secondary_provider`.

Result:
- If `secondary_provider` exists → displays as today.
- If only `secondary_plan` exists → Provider field mirrors the Plan (e.g., both show "BCBS") instead of "Not provided".
- If neither exists → still shows "Not provided".

Purely presentational — no DB writes, no changes to parsing, sync, or Primary Insurance.
