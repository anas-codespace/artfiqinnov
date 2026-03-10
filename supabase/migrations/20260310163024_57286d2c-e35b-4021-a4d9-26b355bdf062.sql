-- Step 1: Add 'admin' value to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';