import { supabase } from '@/integrations/supabase/client';

/**
 * SINGLE canonical appointment status-change path.
 *
 * Every surface that moves an appointment from one status to another (All
 * Appointments manager, Review Queue decline auto-cancel, etc.) MUST route
 * through this function so GHL and the portal never drift apart.
 *
 * Responsibilities (in order):
 *  1. DB update (status, procedure_ordered rules, internal_process_complete rules)
 *  2. GHL appointment status sync via `update-ghl-appointment`
 *  3. System note "Status changed from X to Y by {user}" on real transitions
 *  4. Do Not Call side effects (DND in GHL)
 *  5. OON side effects (Slack alert)
 *  6. `appointment-status-webhook` fired on every save
 */

export interface ChangeAppointmentStatusOptions {
  appointmentId: string;
  newStatus: string;
  userName: string;
  /** Optional already-loaded row to avoid extra reads. */
  currentAppointment?: {
    id?: string;
    status?: string | null;
    ghl_appointment_id?: string | null;
    project_name?: string | null;
    lead_name?: string | null;
    lead_phone_number?: string | null;
    calendar_name?: string | null;
  } | null;
  /** Non-fatal warnings (GHL sync failures etc.) surfaced to the caller's UI. */
  onWarning?: (warning: { title: string; description: string; severe?: boolean }) => void;
  /**
   * Skip the GoHighLevel push entirely (local-only status change). Used when the
   * portal row is stale — the GHL event was deleted or now backs a NEWER booking
   * — so cancelling in GHL would hit the patient's active appointment.
   */
  skipGhlSync?: boolean;
}

export interface ChangeAppointmentStatusResult {
  /** false when the update affected 0 rows (RLS block). */
  ok: boolean;
  blocked?: boolean;
  oldStatus: string;
  /** true = GHL confirmed the new status, false = push failed/unverified, null = no GHL appointment. */
  ghlVerified?: boolean | null;
  /** Provider/edge error text when the GHL push failed. */
  ghlError?: string;
}


export async function changeAppointmentStatus({
  appointmentId,
  newStatus: status,
  userName,
  currentAppointment,
  onWarning,
  skipGhlSync,
}: ChangeAppointmentStatusOptions): Promise<ChangeAppointmentStatusResult> {
  console.log('🔄 changeAppointmentStatus called with:', { appointmentId, status });

  let baseRow = currentAppointment ?? null;
  if (!baseRow) {
    const { data } = await supabase
      .from('all_appointments')
      .select('id, status, ghl_appointment_id, project_name, lead_name, lead_phone_number, calendar_name')
      .eq('id', appointmentId)
      .maybeSingle();
    baseRow = data as any;
  }
  const oldStatus = baseRow?.status || 'None';

  // Set status and updated timestamp
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Only automatically set procedure_ordered for specific statuses
  if (status === 'Won') {
    updateData.procedure_ordered = true;
  } else if (status === 'Cancelled' || status === 'No Show' || status.toLowerCase() === 'noshow') {
    updateData.procedure_ordered = false;
  }
  // Note: "Showed" status does NOT automatically set procedure_ordered

  // Auto-set internal_process_complete for workflow-terminal statuses
  const autoCompleteStatuses = ['welcome call', 'showed', 'won'];
  if (autoCompleteStatuses.includes(status.toLowerCase())) {
    updateData.internal_process_complete = true;
  }

  // A stale/expired session silently downgrades the request to the `anon`
  // role, which has no grants on all_appointments — Postgres then answers
  // "permission denied" and the clinic sees an unexplained red error.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    onWarning?.({
      title: 'Session expired',
      description: 'Your sign-in expired. Please refresh the page and sign in again, then retry the status change.',
      severe: true,
    });
    return { ok: false, blocked: true, oldStatus };
  }

  const { data: updatedRow, error } = await supabase
    .from('all_appointments')
    .update(updateData)
    .eq('id', appointmentId)
    .select('id, status')
    .maybeSingle();

  if (error) {
    console.error('❌ API error:', error);
    const msg = `${(error as any)?.code || ''} ${error.message || ''}`.toLowerCase();
    if (msg.includes('42501') || msg.includes('permission denied') || msg.includes('jwt')) {
      onWarning?.({
        title: 'Session expired',
        description: 'Your sign-in expired. Please refresh the page and sign in again, then retry the status change.',
        severe: true,
      });
      return { ok: false, blocked: true, oldStatus };
    }
    throw error;
  }

  if (!updatedRow) {
    console.error('❌ Status update affected 0 rows (likely RLS). appointmentId:', appointmentId);
    onWarning?.({
      title: 'Status update blocked',
      description: "You don't have permission to change this appointment's status. Contact an admin.",
      severe: true,
    });
    return { ok: false, blocked: true, oldStatus };
  }


  // Sync status to GoHighLevel ALWAYS (critical operation)
  let syncData: any = baseRow;
  if (!syncData?.ghl_appointment_id || !syncData?.date_of_appointment) {
    const { data } = await supabase
      .from('all_appointments')
      .select('ghl_appointment_id, project_name, date_of_appointment')
      .eq('id', appointmentId)
      .maybeSingle();
    syncData = { ...(syncData || {}), ...(data || {}) };
  }

  // Past-dated visits routinely reject GHL edits (closed slots / team-member
  // validation). Saving locally is the expected outcome there, so surface it
  // as an informational note rather than a red failure.
  const apptDate = syncData?.date_of_appointment ? String(syncData.date_of_appointment).slice(0, 10) : null;
  const isPastAppointment = !!apptDate && apptDate < new Date().toISOString().slice(0, 10);

  // "Referral Requested" is portal-only: GHL gets a cancellation so the slot
  // re-opens, while the portal record stays active as an unscheduled lead.
  const ghlStatus = status.toLowerCase() === 'referral requested' ? 'Cancelled' : status;

  // OON is WORKFLOW-OWNED in GoHighLevel. The client's "OON PT - Cancel Appt in
  // future" workflow only fires while the GHL appointment is still `confirmed`
  // AND the contact carries the `oon pt` tag — it then updates the appointment
  // status itself and sends the patient the OON message. If the portal cancels
  // the appointment first (STATUS_MAP maps OON -> cancelled), that filter can
  // never match: no OON message goes out and the plain cancellation drags the
  // opportunity into the "Needs to Reschedule" workflow instead. So for OON we
  // deliberately leave the GHL appointment alone and let GHL cancel it.
  const isOon = status === 'OON';

  let ghlVerified: boolean | null = null;
  let ghlErrorText: string | undefined;

  if (isOon) {
    console.log('⏭️ GHL appointment push skipped for OON — GHL workflow owns the cancellation');
    ghlVerified = null;
  } else if (skipGhlSync) {
    console.log('⏭️ GHL sync skipped by caller (stale portal record)');
    ghlVerified = null;
  } else if (syncData?.ghl_appointment_id) {
    try {
      const { data: ghlResult, error: ghlError } = await supabase.functions.invoke('update-ghl-appointment', {
        body: {
          ghl_appointment_id: syncData.ghl_appointment_id,
          project_name: syncData.project_name,
          status: ghlStatus,
          ...(ghlStatus !== status
            ? { cancellation_notes: 'Referral Requested — awaiting PCP referral (slot released by portal)' }
            : {}),
        },
      });
      if (ghlError) throw ghlError;
      // The function reads the appointment back; `verified` is null when the
      // status has no GHL mapping (nothing to verify).
      ghlVerified = (ghlResult as any)?.verified === false ? false : true;
      if ((ghlResult as any)?.verified === false) {
        ghlErrorText = `GoHighLevel still reports "${(ghlResult as any)?.verified_status ?? 'unknown'}" after the update.`;
        onWarning?.({
          title: 'GHL did not accept the change',
          description: ghlErrorText,
          severe: true,
        });
      } else {
        console.log('✅ GHL status synced:', status);
      }
    } catch (ghlErr: any) {
      console.error('⚠️ GHL status sync failed:', ghlErr);
      ghlVerified = false;
      ghlErrorText = ghlErr?.message || String(ghlErr);
      onWarning?.({
        title: isPastAppointment ? 'Saved — GHL not updated' : 'GHL Sync Warning',
        description: isPastAppointment
          ? 'Status saved in the portal. GoHighLevel did not accept the change because the appointment date has already passed.'
          : 'Status saved locally but failed to sync to GoHighLevel. The appointment may need manual update in GHL.',
        severe: !isPastAppointment,
      });
    }

  } else {
    console.warn('⚠️ No ghl_appointment_id found, GHL sync skipped');
    onWarning?.({
      title: 'GHL Sync Skipped',
      description: 'No GoHighLevel appointment ID found for this record. Status was saved locally only.',
    });
  }


  // System note only on actual transitions
  if (oldStatus !== status) {
    const utcTimestamp = new Date().toISOString();
    const systemNote = `Status changed from "${oldStatus}" to "${status}" by ${userName} - [[timestamp:${utcTimestamp}]]`;

    await supabase.from('appointment_notes').insert({
      appointment_id: appointmentId,
      note_text: systemNote,
      created_by: userName,
      visibility: 'clinic',
    } as any);
  }

  // Do Not Call: always fire DND + DO NOT CALL note when explicitly selected.
  if (status === 'Do Not Call') {
    if (oldStatus === status) {
      await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        note_text: `Re-triggered Do Not Call workflow by ${userName} - [[timestamp:${new Date().toISOString()}]]`,
        created_by: userName,
        visibility: 'clinic',
      } as any);
    } else {
      await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        note_text: 'DO NOT CALL',
        created_by: userName,
        visibility: 'clinic',
      } as any);
    }

    try {
      const { data: appointmentData } = await supabase
        .from('all_appointments')
        .select('ghl_id, project_name')
        .eq('id', appointmentId)
        .single();

      if (appointmentData?.ghl_id && appointmentData?.project_name) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('ghl_api_key')
          .eq('project_name', appointmentData.project_name)
          .single();

        if (projectData?.ghl_api_key) {
          await supabase.functions.invoke('update-ghl-contact-dnd', {
            body: {
              ghl_contact_id: appointmentData.ghl_id,
              ghl_api_key: projectData.ghl_api_key,
              enable_dnd: true,
            },
          });
          console.log('✅ DND enabled in GoHighLevel for contact:', appointmentData.ghl_id);
        } else {
          console.warn('⚠️ No GHL API key configured for project:', appointmentData.project_name);
        }
      } else {
        console.warn('⚠️ No GHL contact ID found for appointment:', appointmentId);
      }
    } catch (dndError) {
      console.error('⚠️ Failed to enable DND in GoHighLevel (non-critical):', dndError);
    }
  }

  // OON: always fire Slack alert when explicitly selected, even if already OON.
  if (status === 'OON') {
    if (oldStatus === status) {
      await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        note_text: `Re-triggered OON workflow by ${userName} - [[timestamp:${new Date().toISOString()}]]`,
        created_by: userName,
        visibility: 'clinic',
      } as any);
    }

    try {
      let oonData: any = baseRow;
      if (!oonData?.lead_name) {
        const { data } = await supabase
          .from('all_appointments')
          .select('lead_name, lead_phone_number, calendar_name, project_name')
          .eq('id', appointmentId)
          .single();
        oonData = data as any;
      }
      if (oonData) {
        const nameParts = String(oonData.lead_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await supabase.functions.invoke('notify-slack-oon', {
          body: {
            firstName,
            lastName,
            phone: oonData.lead_phone_number || '',
            calendarName: oonData.calendar_name || '',
            projectName: oonData.project_name,
            appointmentId,
          },
        });
        console.log('✅ Slack OON notification sent for:', oonData.lead_name);
      }
    } catch (oonError) {
      console.error('⚠️ Failed to send OON Slack notification (non-critical):', oonError);
    }

    // GHL contact tags. `appointment-oon` mirrors the Review Queue "Mark OON"
    // path (it releases contacts from the review-queue Wait step). `oon pt` is
    // normally applied by the project's own GHL automation off the outbound
    // webhook — but when the project has no webhook URL configured, that tag can
    // never arrive, so we push it ourselves or the OON workflow never fires.
    try {
      const { data: tagRow } = await supabase
        .from('all_appointments')
        .select('ghl_id, project_name')
        .eq('id', appointmentId)
        .maybeSingle();

      if (tagRow?.ghl_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('ghl_api_key, appointment_webhook_url')
          .eq('project_name', tagRow.project_name as string)
          .maybeSingle();

        const tags = ['appointment-oon'];
        if (!projectData?.appointment_webhook_url) tags.push('oon pt');

        const { error: tagErr } = await supabase.functions.invoke('update-ghl-contact-tags', {
          body: {
            ghl_contact_id: tagRow.ghl_id,
            ghl_api_key: projectData?.ghl_api_key || undefined,
            tags,
            action: 'add',
            source: 'Portal — status set to OON',
          },
        });

        if (tagErr) {
          console.error('⚠️ OON GHL tag push failed:', tagErr);
          onWarning?.({
            title: 'OON saved — GHL tag failed',
            description: `The GHL tag(s) ${tags.join(', ')} could not be added. The OON workflow may not fire for this patient.`,
            severe: true,
          });
          await supabase.from('appointment_notes').insert({
            appointment_id: appointmentId,
            note_text: `GHL OON tags FAILED (${tags.join(', ')}): ${(tagErr as any)?.message || tagErr}`,
            created_by: 'System',
            visibility: 'internal',
          } as any);
        } else {
          await supabase.from('appointment_notes').insert({
            appointment_id: appointmentId,
            note_text:
              `GHL OON tags applied: ${tags.join(', ')}. The GoHighLevel appointment was intentionally left as-is ` +
              `so the OON workflow can cancel it and send the patient the OON message.`,
            created_by: 'System',
            visibility: 'internal',
          } as any);
        }
      } else {
        await supabase.from('appointment_notes').insert({
          appointment_id: appointmentId,
          note_text: 'GHL OON tags skipped: no GHL contact ID on this appointment.',
          created_by: 'System',
          visibility: 'internal',
        } as any);
      }
    } catch (tagError) {
      console.error('⚠️ OON GHL tag push threw (non-critical):', tagError);
    }
  }

  // External webhook fires on every status save (transitions AND re-fires of
  // the same terminal status). For OON/Cancelled/DNC this is what triggers
  // the project's GHL workflow.
  supabase.functions
    .invoke('appointment-status-webhook', {
      body: {
        appointment_id: appointmentId,
        old_status: oldStatus,
        new_status: status,
      },
    })
    .then(() => {
      console.log('✅ Webhook triggered successfully');
    })
    .catch((err) => {
      console.error('⚠️ Webhook failed (non-critical):', err);
    });

  return { ok: true, oldStatus, ghlVerified, ghlError: ghlErrorText };
}
