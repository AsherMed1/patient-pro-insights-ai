/**
 * Single source of truth for normalizing insurance fields into the shape
 * InsuranceViewModal expects.
 *
 * `parsed_insurance_info` has been written by several generations of parsers,
 * so the same value can live under different keys (e.g. `insurance_group_number`
 * vs `group_number`). Every consumer must read all known variants, otherwise a
 * value that exists in the record renders as "Not provided".
 */

export interface NormalizedInsuranceInfo {
  insurance_provider?: string;
  insurance_plan?: string;
  insurance_id?: string;
  insurance_id_link?: string;
  insurance_back_link?: string;
  group_number?: string;
  secondary_provider?: string;
  secondary_plan?: string;
  secondary_id?: string;
  secondary_group_number?: string;
  secondary_front_link?: string;
  secondary_back_link?: string;
}

const firstValue = (...values: any[]): string | undefined => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const str = typeof value === 'string' ? value.trim() : String(value);
    if (str) return str;
  }
  return undefined;
};

export function buildInsuranceData(
  appointment: any,
  leadDetails?: any
): NormalizedInsuranceInfo {
  const pi: any = appointment?.parsed_insurance_info || {};

  return {
    insurance_provider: firstValue(
      pi.insurance_provider,
      pi.provider,
      appointment?.detected_insurance_provider,
      leadDetails?.insurance_provider
    ),
    insurance_plan: firstValue(
      pi.insurance_plan,
      pi.plan,
      appointment?.detected_insurance_plan,
      leadDetails?.insurance_plan
    ),
    insurance_id: firstValue(
      pi.insurance_id_number,
      pi.insurance_id,
      pi.id,
      appointment?.detected_insurance_id,
      leadDetails?.insurance_id
    ),
    insurance_id_link: firstValue(
      appointment?.insurance_id_link,
      leadDetails?.insurance_id_link
    ),
    insurance_back_link: firstValue(
      appointment?.insurance_back_link,
      leadDetails?.insurance_back_link
    ),
    group_number: firstValue(
      pi.insurance_group_number,
      pi.group_number,
      leadDetails?.group_number
    ),
    secondary_provider: firstValue(
      pi.secondary_insurance_provider,
      pi.secondary_provider
    ),
    secondary_plan: firstValue(pi.secondary_insurance_plan, pi.secondary_plan),
    secondary_id: firstValue(
      pi.secondary_insurance_id_number,
      pi.secondary_id_number,
      pi.secondary_id
    ),
    secondary_group_number: firstValue(
      pi.secondary_insurance_group_number,
      pi.secondary_group_number
    ),
    secondary_front_link: firstValue(
      pi.secondary_card_front_url,
      pi.secondary_card_url
    ),
    secondary_back_link: firstValue(pi.secondary_card_back_url),
  };
}
