-- Create the sequence for the admin_activity_logs table
CREATE SEQUENCE IF NOT EXISTS public.admin_activity_logs_id_seq
  AS bigint
  INCREMENT 1
  START 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  CACHE 1;

-- Create the admin_activity_logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id bigint NOT NULL DEFAULT nextval('public.admin_activity_logs_id_seq'),
  admin_id uuid NULL,
  action character varying(100) NOT NULL,
  target_type character varying(50) NOT NULL,
  target_id uuid NULL,
  old_values jsonb NULL,
  new_values jsonb NULL,
  ip_address inet NULL,
  user_agent text NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_activity_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_date 
ON public.admin_activity_logs USING btree (admin_id, created_at) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_admin_logs_target 
ON public.admin_activity_logs USING btree (target_type, target_id) 
TABLESPACE pg_default;

-- Add RLS (Row Level Security) policies
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read their own logs
CREATE POLICY "Users can view own admin logs" ON public.admin_activity_logs
  FOR SELECT USING (auth.uid() = admin_id);

-- Policy: Only authenticated users can insert logs
CREATE POLICY "Users can insert admin logs" ON public.admin_activity_logs
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- Grant permissions
GRANT ALL ON public.admin_activity_logs TO authenticated;
GRANT USAGE ON SEQUENCE admin_activity_logs_id_seq TO authenticated;

-- Comment on table
COMMENT ON TABLE public.admin_activity_logs IS 'Audit trail for admin actions in the seminar hall booking system';
COMMENT ON COLUMN public.admin_activity_logs.admin_id IS 'ID of the admin user who performed the action';
COMMENT ON COLUMN public.admin_activity_logs.action IS 'Type of action performed (approve, reject, cancel, etc.)';
COMMENT ON COLUMN public.admin_activity_logs.target_type IS 'Type of target entity (booking, hall, user, etc.)';
COMMENT ON COLUMN public.admin_activity_logs.target_id IS 'ID of the target entity';
COMMENT ON COLUMN public.admin_activity_logs.old_values IS 'Previous values before the action (for updates)';
COMMENT ON COLUMN public.admin_activity_logs.new_values IS 'New values after the action (for updates)';
COMMENT ON COLUMN public.admin_activity_logs.ip_address IS 'IP address of the admin when action was performed';
COMMENT ON COLUMN public.admin_activity_logs.user_agent IS 'User agent string of the admin client';
COMMENT ON COLUMN public.admin_activity_logs.notes IS 'Additional notes or comments about the action';