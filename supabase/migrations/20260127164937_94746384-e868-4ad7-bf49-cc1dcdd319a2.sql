-- Add is_reserved_block column to all_appointments table
ALTER TABLE public.all_appointments 
ADD COLUMN IF NOT EXISTS is_reserved_block BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.all_appointments.is_reserved_block IS 
  'True if this appointment is a reserved time block, not a patient appointment';

-- Create index for efficient filtering of reserved blocks
CREATE INDEX IF NOT EXISTS idx_all_appointments_is_reserved_block 
ON public.all_appointments(is_reserved_block) 
WHERE is_reserved_block = true;