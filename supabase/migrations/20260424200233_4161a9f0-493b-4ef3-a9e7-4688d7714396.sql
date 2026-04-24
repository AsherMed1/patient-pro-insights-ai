
CREATE TABLE IF NOT EXISTS public.pending_dnd_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ghl_contact_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  appointment_id UUID,
  release_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  release_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_dnd_releases_due
  ON public.pending_dnd_releases (release_at)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_dnd_releases_contact
  ON public.pending_dnd_releases (ghl_contact_id);

ALTER TABLE public.pending_dnd_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pending DND releases"
  ON public.pending_dnd_releases FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pending DND releases"
  ON public.pending_dnd_releases FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pending DND releases"
  ON public.pending_dnd_releases FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending DND releases"
  ON public.pending_dnd_releases FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pending_dnd_releases_updated_at
  BEFORE UPDATE ON public.pending_dnd_releases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
