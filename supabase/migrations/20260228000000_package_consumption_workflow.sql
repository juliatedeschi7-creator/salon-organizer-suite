
-- Add package consumption audit fields to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS package_consumption_status text NOT NULL DEFAULT 'pendente'
    CHECK (package_consumption_status IN ('pendente', 'consumido', 'nao_consumir')),
  ADD COLUMN IF NOT EXISTS package_consumed_client_package_id uuid
    REFERENCES public.client_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_consumed_service_id uuid
    REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS package_consumed_by uuid,
  ADD COLUMN IF NOT EXISTS package_skip_reason text NOT NULL DEFAULT '';

-- Table to log each individual package session consumption event
CREATE TABLE IF NOT EXISTS public.client_package_usages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_package_id uuid NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  used_at timestamptz NOT NULL DEFAULT now(),
  used_by uuid
);

ALTER TABLE public.client_package_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own usages" ON public.client_package_usages
  FOR SELECT TO authenticated
  USING (
    client_package_id IN (
      SELECT id FROM public.client_packages WHERE client_user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view salon usages" ON public.client_package_usages
  FOR SELECT TO authenticated
  USING (is_salon_member(auth.uid(), salon_id));

CREATE POLICY "Owner can manage usages" ON public.client_package_usages
  FOR ALL TO authenticated
  USING (is_salon_owner(auth.uid(), salon_id));

NOTIFY pgrst, 'reload schema';
