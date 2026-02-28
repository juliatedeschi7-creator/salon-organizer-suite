-- Fix salon_members role CHECK constraint to allow 'cliente'
-- The original constraint only allowed ('dono', 'funcionario') but the
-- handle_new_user trigger inserts 'cliente' when users join via salon link.
ALTER TABLE public.salon_members
  DROP CONSTRAINT IF EXISTS salon_members_role_check;

ALTER TABLE public.salon_members
  ADD CONSTRAINT salon_members_role_check
  CHECK (role IN ('dono', 'funcionario', 'cliente'));

NOTIFY pgrst, 'reload schema';
