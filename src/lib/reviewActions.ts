import { supabase } from '@/integrations/supabase/client';

/**
 * Shared Review-Queue side effects so QA Operations can resolve a Potential OON
 * hold without sending the specialist back to the Review Queue. The logic
 * mirrors ReviewQueue.tsx exactly — same tags, notes, webhooks and audit rows.
 */

export interface ReviewActionWarning {
  title: string;
  description: string;
  severe?: boolean;
}

type PriorRow = {
  id: string;
  review_status: string | null;
  status: string | null;
  lead_name: string | null;
  lead_phone_number: string | null;
  calendar_name: string | null;
  project_name: string;
  ghl_id: string | null;
};

const loadPriorRow = async (appointmentId: string): Promise<PriorRow | null> => {
  const { data } = await supabase
    .from('all_appointments')
    .select('id, review_status, status, lead_name, lead_phone_number, calendar_name, project_name, ghl_id')
    .eq('id', appointmentId)
    .maybeSingle();
  return (data as any) ?? null;
};

const projectApiKey = async (projectName: string | null | undefined): Promise<string | undefined> => {
  if (!projectName) return undefined;
  const { data } = await supabase
    .from('projects')
    .select('ghl_api_key')
    .eq('project_name', projectName)
    .maybeSingle();
  return (data as any)?.ghl_api_key || undefined;
};

/** Clear (resolve) the Potential OON flag and log an internal note. */
export const resolvePotentialOonFlag = async (
  appointmentId: string,
  resolution: 'in_network' | 'out_of_network',
  actorName: string,
  actorId?: string | null,
): Promise<void> => {
  const { error } = await supabase
    .from('all_appointments')
    .update({
      potential_oon_resolved_at: new Date().toISOString(),
      potential_oon_resolution: resolution,
      potential_oon_resolved_by: actorId ?? null,
    })
    .eq('id', appointmentId);
  if (error) throw error;

  await supabase.from('appointment_notes').insert({
    appointment_id: appointmentId,
    note_text: `Potential OON insurance reviewed — marked ${
      resolution === 'in_network' ? 'IN NETWORK (cleared)' : 'OUT OF NETWORK'
    } by ${actorName || 'a portal user'} (QA Operations)`,
    visibility: 'internal',
  });
};

const writeReviewHistory = async (
  appointmentId: string,
  action: 'approved' | 'oon',
  priorStatus: string | null,
  actorId: string | null,
  actorName: string,
  notes: string | null,
) => {
  await supabase.from('appointment_review_history').insert({
    appointment_id: appointmentId,
    action,
    prior_status: priorStatus,
    actor_id: actorId,
    actor_name: actorName || 'Unknown',
    notes,
  });
  try {
    await supabase.rpc('log_audit_event', {
      p_entity: 'appointment',
      p_action: `review_${action}`,
      p_description: `${action === 'oon' ? 'Marked as OON' : 'Approved'}: ${appointmentId} by ${actorName || 'Unknown'}`,
      p_source: 'qa_operations',
      p_metadata: { appointment_id: appointmentId, notes },
    });
  } catch (e) {
    console.warn('audit log failed', e);
  }
};

/**
 * Approve the appointment (client-portal visible) and push the GHL `approved`
 * tag that releases the confirmation message.
 */
export const approveAppointmentFromQA = async (
  appointmentId: string,
  actorName: string,
  actorId?: string | null,
  notes?: string,
): Promise<ReviewActionWarning[]> => {
  const warnings: ReviewActionWarning[] = [];
  const prior = await loadPriorRow(appointmentId);

  const { error } = await supabase
    .from('all_appointments')
    .update({
      review_status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId ?? null,
      review_notes: notes ?? 'Insurance verified in network from QA Operations',
    })
    .eq('id', appointmentId);
  if (error) throw error;

  await writeReviewHistory(
    appointmentId,
    'approved',
    prior?.review_status ?? null,
    actorId ?? null,
    actorName,
    notes ?? 'Insurance verified in network from QA Operations',
  );

  if (!prior?.ghl_id) {
    warnings.push({
      title: 'Approved — GHL tag skipped',
      description: 'This appointment has no linked GHL contact, so the "approved" tag was not added.',
    });
    return warnings;
  }

  try {
    const apiKey = await projectApiKey(prior.project_name);
    const { error: tagErr } = await supabase.functions.invoke('update-ghl-contact-tags', {
      body: {
        ghl_contact_id: prior.ghl_id,
        ghl_api_key: apiKey,
        tags: ['approved'],
        action: 'add',
        source: `QA Operations approve by ${actorName || 'a portal user'}`,
      },
    });
    if (tagErr) {
      warnings.push({
        title: 'Approved — GHL tag will retry',
        description: 'Approval saved. The hourly retry job will add the "approved" tag in GHL.',
      });
    } else {
      let verified = false;
      try {
        const verifyRes = await window.fetch(
          `https://services.leadconnectorhq.com/contacts/${prior.ghl_id}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey ?? ''}`,
              Version: '2021-07-28',
              Accept: 'application/json',
            },
          },
        );
        if (verifyRes.ok) {
          const json = await verifyRes.json().catch(() => ({} as any));
          const tags: unknown[] = Array.isArray(json?.contact?.tags)
            ? json.contact.tags
            : Array.isArray(json?.tags)
              ? json.tags
              : [];
          verified = tags.some((t) => String(t).toLowerCase().trim() === 'approved');
        }
      } catch (e) {
        console.warn('GHL verify GET threw:', e);
      }

      if (verified) {
        await supabase
          .from('all_appointments')
          .update({ ghl_approved_tag_sent_at: new Date().toISOString() })
          .eq('id', appointmentId);
      } else {
        warnings.push({
          title: 'Approved — GHL tag will retry',
          description: 'Approval saved. The hourly retry job will confirm the "approved" tag in GHL.',
        });
      }
    }
  } catch (err) {
    warnings.push({
      title: 'Approved, but GHL tag not added',
      description: (err as Error)?.message || 'Unknown error invoking GHL tag function.',
      severe: true,
    });
  }

  return warnings;
};

/**
 * Mark the appointment OON. The GHL appointment is deliberately left alone so
 * the client's OON workflow owns the cancellation and patient message.
 */
export const markAppointmentOonFromQA = async (
  appointmentId: string,
  actorName: string,
  actorId?: string | null,
  notes?: string,
): Promise<ReviewActionWarning[]> => {
  const warnings: ReviewActionWarning[] = [];
  const prior = await loadPriorRow(appointmentId);
  const oldStatus = prior?.status || 'Pending';
  const reviewNotes = notes ?? 'Insurance confirmed out of network from QA Operations';

  const { error } = await supabase
    .from('all_appointments')
    .update({
      review_status: 'oon',
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId ?? null,
      review_notes: reviewNotes,
      status: 'OON',
      internal_process_complete: true,
      procedure_ordered: false,
    })
    .eq('id', appointmentId);
  if (error) throw error;

  await writeReviewHistory(appointmentId, 'oon', prior?.review_status ?? null, actorId ?? null, actorName, reviewNotes);

  const utcTimestamp = new Date().toISOString();
  try {
    await supabase.from('appointment_notes').insert({
      appointment_id: appointmentId,
      note_text: `Status changed from "${oldStatus}" to "OON" by ${actorName || 'QA Operations'} - [[timestamp:${utcTimestamp}]]`,
      created_by: actorName || 'QA Operations',
      visibility: 'internal',
    });
  } catch (e) {
    console.warn('System note insert failed', e);
  }

  try {
    const { data: whData, error: whErr } = await supabase.functions.invoke('appointment-status-webhook', {
      body: { appointment_id: appointmentId, old_status: oldStatus, new_status: 'OON' },
    });
    if (whErr || (whData && (whData as any).success === false)) {
      warnings.push({
        title: 'OON saved, but GHL workflow did not fire',
        description: 'Status was updated, but the outbound webhook to GHL failed. Contact engineering.',
        severe: true,
      });
    }
  } catch (err) {
    warnings.push({
      title: 'OON saved, but GHL workflow did not fire',
      description: 'The outbound webhook to GHL threw an error. Contact engineering.',
      severe: true,
    });
  }

  try {
    const nameParts = (prior?.lead_name || '').split(' ');
    const { error: slackErr } = await supabase.functions.invoke('notify-slack-oon', {
      body: {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: prior?.lead_phone_number || '',
        calendarName: prior?.calendar_name || '',
        projectName: prior?.project_name,
        appointmentId,
      },
    });
    if (slackErr) {
      warnings.push({
        title: 'Slack OON alert failed',
        description: 'OON status was saved, but the Slack alert did not deliver.',
        severe: true,
      });
    }
  } catch (err) {
    warnings.push({
      title: 'Slack OON alert failed',
      description: 'OON status was saved, but the Slack alert threw an error.',
      severe: true,
    });
  }

  if (prior?.ghl_id) {
    const oonTags = ['appointment-oon', 'oon pt'];
    try {
      const apiKey = await projectApiKey(prior.project_name);
      const { error: oonTagErr } = await supabase.functions.invoke('update-ghl-contact-tags', {
        body: {
          ghl_contact_id: prior.ghl_id,
          ghl_api_key: apiKey,
          tags: oonTags,
          action: 'add',
          source: `QA Operations OON by ${actorName || 'a portal user'}`,
        },
      });
      if (oonTagErr) {
        warnings.push({
          title: 'OON saved — GHL tag failed',
          description: `The GHL tag(s) ${oonTags.join(', ')} could not be added. The OON workflow may not fire for this patient.`,
          severe: true,
        });
        await supabase.from('appointment_notes').insert({
          appointment_id: appointmentId,
          note_text: `GHL OON tags FAILED (${oonTags.join(', ')}): ${(oonTagErr as any)?.message || oonTagErr}`,
          created_by: 'System',
          visibility: 'internal',
        });
      } else {
        await supabase.from('appointment_notes').insert({
          appointment_id: appointmentId,
          note_text:
            `GHL OON tags applied: ${oonTags.join(', ')}. The GoHighLevel appointment was intentionally left as-is ` +
            `so the OON workflow can cancel it and send the patient the OON message.`,
          created_by: 'System',
          visibility: 'internal',
        });
      }
    } catch (err) {
      console.error('OON GHL tag threw:', err);
    }
  }

  return warnings;
};

/** Human-readable summary of the Potential OON matches. */
export const describeOonMatches = (matches: any): string[] => {
  const list = Array.isArray(matches) ? matches : [];
  return list.map((m: any) => {
    const kind = m?.matched_on === 'group' ? 'Group #' : m?.matched_on === 'id' ? 'Insurance ID' : 'Plan';
    return `${kind} "${m?.matched_value ?? ''}"${m?.plan_name ? ` → ${m.plan_name}` : ''}`;
  });
};
