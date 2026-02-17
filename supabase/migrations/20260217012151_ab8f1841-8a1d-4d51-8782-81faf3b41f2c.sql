-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Donos can create salons" ON public.salons;

-- Create a simple permissive policy without is_approved check
CREATE POLICY "Authenticated users can create own salons"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());
