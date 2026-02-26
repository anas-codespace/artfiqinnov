
-- Create projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📁',
  color text NOT NULL DEFAULT '#00d2ff',
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view all projects"
ON public.projects FOR SELECT
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Only founders can create projects"
ON public.projects FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('ceo', 'cto')
));

CREATE POLICY "Only founders can update projects"
ON public.projects FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('ceo', 'cto')
));

CREATE POLICY "Only founders can delete projects"
ON public.projects FOR DELETE
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('ceo', 'cto')
));

-- Add project_id to tasks table
ALTER TABLE public.tasks ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
