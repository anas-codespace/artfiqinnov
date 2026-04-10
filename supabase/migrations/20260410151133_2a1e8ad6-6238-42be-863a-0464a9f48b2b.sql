-- Create private schema if not exists
CREATE SCHEMA IF NOT EXISTS private;

-- Create the founder_emails table
CREATE TABLE IF NOT EXISTS private.founder_emails (
  email text PRIMARY KEY,
  role public.app_role NOT NULL
);

-- Insert existing founders + new admins
INSERT INTO private.founder_emails (email, role) VALUES
  ('sulaiman.artfiqceo@gmail.com', 'ceo'),
  ('anas.md.artfiq@gmail.com', 'cto'),
  ('asvidha.artfiq@gmail.com', 'admin'),
  ('sanjay.artfiq@gmail.com', 'admin'),
  ('kumudha.artfiq@gmail.com', 'vp')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;