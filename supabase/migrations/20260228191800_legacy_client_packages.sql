-- Add source and legacy_notes columns to client_packages
ALTER TABLE public.client_packages
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS legacy_notes text DEFAULT '';

-- Per-service session breakdown for client packages
CREATE TABLE IF NOT EXISTS public.client_package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_package_id UUID NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  service_name text NOT NULL DEFAULT '',
  quantity_total integer NOT NULL DEFAULT 1,
  quantity_used integer NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_package_items ENABLE ROW LEVEL SECURITY;

-- Clients can view their own package items
CREATE POLICY "Clients can view own package items" ON public.client_package_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_packages cp
      WHERE cp.id = client_package_id
        AND cp.client_user_id = auth.uid()
    )
  );

-- Salon members can view package items for their salon
CREATE POLICY "Members can view salon package items" ON public.client_package_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_packages cp
      WHERE cp.id = client_package_id
        AND public.is_salon_member(auth.uid(), cp.salon_id)
    )
  );

-- Owners can manage package items for clients in their salon
CREATE POLICY "Owner can manage package items" ON public.client_package_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_packages cp
      WHERE cp.id = client_package_id
        AND public.is_salon_owner(auth.uid(), cp.salon_id)
    )
  );

CREATE TRIGGER update_client_package_items_updated_at
  BEFORE UPDATE ON public.client_package_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
