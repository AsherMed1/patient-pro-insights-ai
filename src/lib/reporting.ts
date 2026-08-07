/**
 * Reporting query module — booked / showed / procedures-ordered.
 *
 * Uses the existing Supabase client (project URL + publishable anon key from
 * `.env`). No database password or connection string is required, so nothing
 * ever has to leave the Supabase dashboard.
 *
 * Every query applies the mandatory row filters documented in
 * docs/reporting-schema.md §4.
 */
import { supabase } from "@/integrations/supabase/client";

export const TEST_ACCOUNT = "PPM - Test Account";

/** Which date column the period filter applies to. */
export type DateBasis = "date_of_appointment" | "date_appointment_created";

export interface ReportingOptions {
  /** Inclusive start date, `yyyy-MM-dd`. */
  from: string;
  /** Inclusive end date, `yyyy-MM-dd`. */
  to: string;
  /** Defaults to `date_of_appointment` (clinic capacity / outcome basis). */
  basis?: DateBasis;
  /** Optional single-client scope. */
  projectName?: string;
  /** Count `procedure_complete` alongside `ordered`. Defaults to false. */
  includeCompletedProcedures?: boolean;
}

export interface ClientMetrics {
  project_name: string;
  booked: number;
  showed: number;
  procedures_ordered: number;
  show_rate_pct: number;
}

interface MetricRow {
  project_name: string | null;
  status: string | null;
  procedure_status: string | null;
}

const PAGE_SIZE = 1000;

/** Mandatory row hygiene filters — see docs/reporting-schema.md §4. */
const applyBaseFilters = (query: any, opts: ReportingOptions) => {
  const basis = opts.basis ?? "date_of_appointment";
  let q = query
    .neq("project_name", TEST_ACCOUNT)
    .or("is_reserved_block.is.null,is_reserved_block.eq.false")
    .or("is_superseded.is.null,is_superseded.eq.false")
    .or("review_status.is.null,review_status.eq.approved")
    .gte(basis, opts.from)
    .lte(basis, opts.to);

  if (opts.projectName) q = q.eq("project_name", opts.projectName);
  return q;
};

/**
 * Pull every qualifying appointment row for the period, paginating past the
 * 1000-row PostgREST default.
 */
export const fetchReportingRows = async (
  opts: ReportingOptions,
): Promise<MetricRow[]> => {
  const rows: MetricRow[] = [];
  let offset = 0;

  for (;;) {
    const query = applyBaseFilters(
      supabase
        .from("all_appointments")
        .select("project_name, status, procedure_status"),
      opts,
    ).range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;

    const page = (data ?? []) as MetricRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
};

const isShowed = (status: string | null) =>
  (status ?? "").trim().toLowerCase() === "showed";

const isOrdered = (
  procedureStatus: string | null,
  includeCompleted: boolean,
) => {
  const v = (procedureStatus ?? "").trim().toLowerCase();
  return v === "ordered" || (includeCompleted && v === "procedure_complete");
};

const rate = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((1000 * numerator) / denominator) / 10;

/** Portfolio-wide totals for the period. */
export const getTotals = async (
  opts: ReportingOptions,
): Promise<Omit<ClientMetrics, "project_name">> => {
  const rows = await fetchReportingRows(opts);
  const includeCompleted = opts.includeCompletedProcedures ?? false;

  const booked = rows.length;
  const showed = rows.filter((r) => isShowed(r.status)).length;
  const procedures_ordered = rows.filter((r) =>
    isOrdered(r.procedure_status, includeCompleted),
  ).length;

  return { booked, showed, procedures_ordered, show_rate_pct: rate(showed, booked) };
};

/** Per-client rollup for the period, sorted by booked volume descending. */
export const getMetricsByClient = async (
  opts: ReportingOptions,
): Promise<ClientMetrics[]> => {
  const rows = await fetchReportingRows(opts);
  const includeCompleted = opts.includeCompletedProcedures ?? false;
  const byClient = new Map<string, ClientMetrics>();

  for (const row of rows) {
    const name = row.project_name ?? "(unknown)";
    const entry =
      byClient.get(name) ??
      { project_name: name, booked: 0, showed: 0, procedures_ordered: 0, show_rate_pct: 0 };

    entry.booked += 1;
    if (isShowed(row.status)) entry.showed += 1;
    if (isOrdered(row.procedure_status, includeCompleted)) entry.procedures_ordered += 1;

    byClient.set(name, entry);
  }

  return [...byClient.values()]
    .map((e) => ({ ...e, show_rate_pct: rate(e.showed, e.booked) }))
    .sort((a, b) => b.booked - a.booked);
};
