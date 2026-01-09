-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('ceo', 'cto', 'team');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view all roles (for badge display)
CREATE POLICY "Anyone can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Only service role can manage roles
CREATE POLICY "Service role can manage roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create file_views table for tracking who viewed/downloaded files
CREATE TABLE public.file_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (file_id, user_id)
);

-- Enable RLS
ALTER TABLE public.file_views ENABLE ROW LEVEL SECURITY;

-- Everyone can view file_views (for uploader to see who viewed)
CREATE POLICY "Authenticated users can view file views"
ON public.file_views
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own view records
CREATE POLICY "Users can insert their own views"
ON public.file_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create trigger function to assign role based on email on signup
CREATE OR REPLACE FUNCTION public.assign_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'mohammedsulaimanofficial@gmail.com' THEN
    v_role := 'ceo';
  ELSIF NEW.email = 'anas.m77581@gmail.com' THEN
    v_role := 'cto';
  ELSE
    v_role := 'team';
  END IF;
  
  -- Insert role record
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user role assignment
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_role_on_signup();